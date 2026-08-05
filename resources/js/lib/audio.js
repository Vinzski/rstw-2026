import { useSyncExternalStore } from "react";

// The site's one global mute switch. Every sound effect (boot countdown,
// firework burst, kiosk scan/success cues) is created and played through
// `playSound` below instead of `new Audio()` directly, so a single toggle
// silences all of them — including ones already mid-playback — and the
// choice survives a reload.
const STORAGE_KEY = "rstw-muted";

function readStoredMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = readStoredMuted();
const listeners = new Set();
// Sounds currently in flight, so toggling mute mid-playback applies
// immediately instead of waiting for the next sound to be created.
const activeSounds = new Set();

export function getMuted() {
  return muted;
}

export function setMuted(value) {
  if (value === muted) return;
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {}
  activeSounds.forEach((sound) => {
    sound.muted = value;
  });
  listeners.forEach((listener) => listener());
}

export function toggleMuted() {
  setMuted(!muted);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Reactive read for components (the Navbar mute button) — re-renders
// whenever the mute state changes, from any source.
export function useMuted() {
  return useSyncExternalStore(subscribe, getMuted, getMuted);
}

// Non-React subscription for modules that need to react to a mute
// toggle immediately rather than on the next render — the tour
// narrator (lib/speech.js) uses this to cut a sentence off mid-way the
// instant the site is muted, the same way `activeSounds` above does
// for in-flight <audio> clips. Returns an unsubscribe function.
export function subscribeMuted(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Plays one sound effect, respecting the current mute state and staying in
// sync with it for as long as the clip is in flight. Returns a cleanup
// function that stops it early — pass straight to a useEffect return.
export function playSound(src) {
  const sound = new Audio(src);
  sound.muted = muted;
  activeSounds.add(sound);
  const stopTracking = () => activeSounds.delete(sound);
  sound.addEventListener("ended", stopTracking);
  sound.play().catch(() => {});
  return () => {
    sound.pause();
    stopTracking();
  };
}

// Loops a background track at `volume`, respecting the current mute
// state the same way playSound does (including live toggles mid-
// playback, via the shared `activeSounds` tracking). Returns
// `{ setVolume, stop }`; pass `fadeOutMs` (or an explicit ms to
// `stop()`) to ease the volume down before pausing instead of cutting
// off mid-note. `stop` alone is a valid useEffect cleanup value on its
// own (`() => controls.stop()`), for callers that don't need to duck.
export function playLoop(src, { volume = 1, fadeOutMs = 0 } = {}) {
  const sound = new Audio(src);
  sound.loop = true;
  sound.volume = volume;
  sound.muted = muted;
  activeSounds.add(sound);
  const stopTracking = () => activeSounds.delete(sound);
  sound.play().catch(() => {});

  // Only one fade (a duck, an un-duck, or the final fade-out) should
  // ever be adjusting this sound's volume at once — starting a new one
  // cancels whatever was still easing toward its own target instead of
  // the two fighting over the volume value every tick.
  let fadeInterval = null;

  function fadeTo(target, durationMs, onDone) {
    if (fadeInterval) clearInterval(fadeInterval);
    if (durationMs <= 0) {
      sound.volume = Math.min(1, Math.max(0, target));
      onDone?.();
      return;
    }
    const steps = 12;
    const startVolume = sound.volume;
    const delta = target - startVolume;
    let i = 0;
    fadeInterval = setInterval(() => {
      i += 1;
      sound.volume = Math.min(1, Math.max(0, startVolume + delta * (i / steps)));
      if (i >= steps) {
        clearInterval(fadeInterval);
        fadeInterval = null;
        onDone?.();
      }
    }, durationMs / steps);
  }

  return {
    // Eases toward `target` over `fadeMs` (instant if 0) — ducking
    // under narration and coming back up between lines is just calling
    // this with a different target each time.
    setVolume(target, fadeMs = 0) {
      fadeTo(target, fadeMs);
    },
    stop(fadeMs = fadeOutMs) {
      fadeTo(0, fadeMs, () => {
        sound.pause();
        stopTracking();
      });
    },
  };
}
