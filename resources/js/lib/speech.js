import { useSyncExternalStore } from "react";
import { getMuted, subscribeMuted } from "./audio";

// The tour's narrator, driving the same auto-advancing beats the Play
// button (and the pre-reveal preview tour) already walks through — see
// useAutoPlay, which calls `speakNarration` once it lands on each stop
// and waits for it to actually finish (plus a short pause) before
// moving on.
//
// Two layers, tried in order:
//  1. A pre-generated WAV clip (see the `narration:generate` Artisan
//     command, public/audio/narration/<index>.wav) — voiced once via
//     Gemini TTS with the site's chosen narrator voice, then just
//     played back like any other sound effect. The ten lines are fixed
//     site copy, not per-visitor input, so there's no live API call on
//     the critical path.
//  2. The browser's own Web Speech API (SpeechSynthesisUtterance) if
//     that clip is missing or fails to play — e.g. before the clips
//     have been generated for a given environment — so narration never
//     just goes silent.
const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

const NARRATION_AUDIO_BASE = "/audio/narration/";

// A slightly brighter, quicker delivery than the browser's own flat
// default — about as far as the fallback utterance's own knobs go
// toward reading as "an enthusiastic host" rather than a monotone
// announcer. The pre-generated clips carry their own voice/style
// already baked in (see the Artisan command), so these only matter
// when that fallback is actually in use.
const RATE = 1.05;
const PITCH = 1.15;

// Voices load asynchronously in most browsers (empty on the first
// `getVoices()` call, populated once "voiceschanged" fires) — re-picked
// whenever that happens rather than read once, so a call that lands
// before the list is ready still upgrades once it is.
let cachedVoice = null;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer whichever natural-sounding English voice the platform
  // offers, where it offers a choice — the "Natural"/"Online"/"Google"
  // voices read far livelier than the default compact synthesis ones
  // most systems fall back to.
  const byPriority = [
    (v) => /^en/i.test(v.lang) && /natural|online/i.test(v.name),
    (v) => /^en/i.test(v.lang) && /google/i.test(v.name),
    (v) => /^en-US/i.test(v.lang),
    (v) => /^en/i.test(v.lang),
  ];
  for (const test of byPriority) {
    const match = voices.find(test);
    if (match) return match;
  }
  return voices[0];
}

if (speechSupported) {
  cachedVoice = pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoice = pickVoice();
  });
}

// The one narration clip currently playing, whichever layer it's
// coming from — tracked so a mute toggle (or cancelSpeech) can cut it
// off immediately instead of letting it finish, the same contract
// playSound's own `activeSounds` gives every other sound effect.
let activeAudio = null;

subscribeMuted(() => {
  if (!getMuted()) return;
  if (speechSupported) window.speechSynthesis.cancel();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  setSpeaking(false);
});

// Whether the narrator is currently mid-line, from either layer —
// App reads this (via useSpeaking) to duck the preview's background
// music under the voice and let it back up between lines, the same
// external-store pattern audio.js's mute state already uses.
let speaking = false;
const speakingListeners = new Set();

function setSpeaking(value) {
  if (value === speaking) return;
  speaking = value;
  speakingListeners.forEach((listener) => listener());
}

export function getSpeaking() {
  return speaking;
}

export function useSpeaking() {
  return useSyncExternalStore(
    (listener) => {
      speakingListeners.add(listener);
      return () => speakingListeners.delete(listener);
    },
    getSpeaking,
    getSpeaking,
  );
}

// Stops whatever the narrator is currently saying — used by
// useAutoPlay when a manual scroll (or anything else) ends the tour
// mid-line, so the voice doesn't keep talking after the visitor has
// already scrolled away.
export function cancelSpeech() {
  if (speechSupported) window.speechSynthesis.cancel();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  setSpeaking(false);
}

// `slug` is either a tour-stop index (0-9, see speakNarration) or a
// named one-off clip (see speakWelcome) — both just resolve to
// public/audio/narration/<slug>.wav.
function playClip(slug) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`${NARRATION_AUDIO_BASE}${slug}.wav`);
    activeAudio = audio;
    const settle = (fn) => (...args) => {
      if (activeAudio === audio) activeAudio = null;
      fn(...args);
    };
    audio.addEventListener("ended", settle(resolve));
    audio.addEventListener("error", settle(() => reject(new Error(`narration clip ${slug} unavailable`))));
    audio.play().catch(settle(reject));
  });
}

// Speaks `text` via the browser's own Web Speech API, resolving once it
// has genuinely finished — never on a muted/unsupported/interrupted
// run, so a caller pacing an auto-advance off this doesn't stall
// forever waiting on narration that was never going to play.
export function speak(text) {
  if (!speechSupported || getMuted() || !text) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = RATE;
    utterance.pitch = PITCH;
    if (cachedVoice) utterance.voice = cachedVoice;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

// Narrates tour stop `index` (0-based, matching tourNarration in
// content.js — see useAutoPlay for how a STOPS index maps to this):
// plays its pre-generated clip if one exists, falling back to
// speechSynthesis reading `text` if it doesn't (or fails partway).
// Resolves once whichever path actually finished. A cancelSpeech()
// call mid-line still resolves this (rejection/onerror both settle it);
// callers that need "the tour moved on" to also stop *this specific*
// wait from resuming it are expected to guard that on their own end
// (see useAutoPlay's generation counter).
export function speakNarration(index, text) {
  if (getMuted()) return Promise.resolve();
  setSpeaking(true);
  return playClip(index)
    .catch(() => speak(text))
    .finally(() => setSpeaking(false));
}

// The one-off welcome line (see welcomeNarration in content.js) —
// same pre-generated-clip-then-speechSynthesis-fallback shape as
// speakNarration, just under the fixed "welcome" slug instead of a
// tour-stop index. Callers decide when it fires and that it only fires
// once; this just plays it.
export function speakWelcome(text) {
  if (getMuted()) return Promise.resolve();
  setSpeaking(true);
  return playClip("welcome")
    .catch(() => speak(text))
    .finally(() => setSpeaking(false));
}
