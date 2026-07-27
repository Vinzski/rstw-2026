import { useCallback, useEffect, useRef, useState } from "react";
import { cinematicRanges, beatDiveFrac, pillarBeatFadeFrac } from "../data/content";
import { progressToScrollY } from "../lib/navigate";

// Slower than a nav-click's default (1.4s): each chapter drives its own
// zoom/dive/wipe transitions off scroll position, invisible on a fast
// jump, so the tour needs to actually glide through that range rather
// than teleport across it.
//
// Two speeds, not one: a hop between chapters (Intro→About, About→
// Pillars, …) covers a lot of scroll distance that ISN'T the transition
// itself — the reveal/dive only occupies a narrow slice (~EDGE_FADE) of
// that whole hop, so most of CROSS_CHAPTER_SCROLL_S reads as calm travel
// with a brief flourish in it. A beat-to-beat hop within Pillars or
// Highlights covers far less distance, but its own dive occupies ~60% of
// that short hop (DIVE is 60% of a beat's SEGMENT) — the same fixed
// duration then reads as almost nothing BUT the fast zoom, landing as a
// jarring jump-cut instead of the same unhurried glide. Giving same-
// chapter hops more time doesn't need to reproduce a specific number
// exactly, just enough breathing room for the zoom-heavy motion to read
// as deliberate rather than rushed.
const CROSS_CHAPTER_SCROLL_S = 2.6;
const SAME_CHAPTER_SCROLL_S = 3.6;
const DWELL_MS = 1000;
const CONTROLS_HIDE_MS = 2200;

// Which of the two hop speeds applies between two chapter ids — used to
// pick each forward hop's duration.
function hopDuration(fromChapterId, toChapterId) {
  return fromChapterId != null && fromChapterId === toChapterId ? SAME_CHAPTER_SCROLL_S : CROSS_CHAPTER_SCROLL_S;
}

// Once the tour reaches its finale, it eases straight back to the very
// top in one continuous glide — deliberately not stop-by-stop like the
// forward tour, so the motion never pauses on its way back, reading as
// an unbroken rewind rather than the same tour run backwards.
const REWIND_TOTAL_S = 24;

// Pillars and Highlights each present 4 internal beats as the user
// scrolls through them (see PillarsChapter/HighlightsChapter) — a single
// "just past the entrance" stop for the whole chapter would only ever
// show the first beat and skip the other three. `beatLocal(i)` picks a
// point inside beat i's own "settled, at rest" window, safely before its
// own exit dive begins at `start + SEGMENT - DIVE`.
//
// That window's *later* bound is what actually gates it: Pillars' side
// cluster (the star/atom/ribbon arrangement filling whichever side the
// text isn't on, see SideCluster in PillarsChapter.jsx) stages its 7
// pieces in one after another, and the slowest of them — the second
// accent dot — doesn't finish entering until FADE*1.2 past the beat's
// start. Landing any earlier caught it mid-assembly: satellite motifs
// still sliding/fading in, accent dots not yet spawned (the text itself
// settles much sooner, by `start + FADE*0.4`, so it was never the
// limiting piece). Highlights' equivalent decor is a single static image
// with no staggered entrance, so it's already at rest well before this —
// landing later there is harmless, just a longer hold on an unchanging
// frame.
//
// The last beat is a special case for that later bound: its own exit
// dive doubles as the chapter's exit into Highlights, so PillarsChapter
// widens it — it starts at `1 - DIVE*1.1`, earlier than the generic
// `start + SEGMENT - DIVE` every other beat uses (see dive3 in
// PillarsChapter.jsx). A dive's reveal circle doesn't ease in from
// nothing — useGlyphDive's holeRadius jumps straight to its base size
// the instant progress crosses that start — so landing past it (as the
// generic formula alone would, since the cluster's own settle point
// lands slightly *after* this beat's earlier dive start) freezes a
// stray colored circle on the glyph it's anchored to. Staying clear of
// that pop matters more than the cluster's very last accent dot finishing
// its fade, so the last beat's target is capped just before it instead.
const BEAT_COUNT = 4;
const BEAT_SEGMENT = 1 / BEAT_COUNT;
const BEAT_DIVE = BEAT_SEGMENT * beatDiveFrac;
const BEAT_FADE = BEAT_SEGMENT * pillarBeatFadeFrac;
function beatLocal(i) {
  const start = i * BEAT_SEGMENT;
  const isLastBeat = i === BEAT_COUNT - 1;
  const exitStart = isLastBeat ? 1 - BEAT_DIVE * 1.1 : start + BEAT_SEGMENT - BEAT_DIVE;
  const clusterSettle = start + BEAT_FADE * 1.2;
  const target = clusterSettle + (exitStart - clusterSettle) * 0.4;
  return Math.min(target, exitStart - 0.006);
}

// The full tour, one stop per distinct view rather than one per chapter —
// About's theme statement and its OneDOST4U/stats beat are two separate
// stops within the same chapter, and each of Pillars'/Highlights' 4 beats
// gets its own stop too. `local` is a fraction of that *chapter's own*
// progress range (converted to a page scroll position in `stopScrollY`
// below); `isFinale` marks the one stop that targets its chapter's end
// instead of a beat-local point — Highlights' last beat is also the
// site's closing view, so it lands near the chapter's true end rather
// than the same "settled mid-beat" point every other stop uses.
const STOPS = [
  { chapterId: "intro", local: 0.05 },
  { chapterId: "about", local: 0.08 },
  { chapterId: "about", local: 0.67 },
  { chapterId: "pillars", local: beatLocal(0) },
  { chapterId: "pillars", local: beatLocal(1) },
  { chapterId: "pillars", local: beatLocal(2) },
  { chapterId: "pillars", local: beatLocal(3) },
  { chapterId: "highlights", local: beatLocal(0) },
  { chapterId: "highlights", local: beatLocal(1) },
  { chapterId: "highlights", local: beatLocal(2) },
  { chapterId: "highlights", local: null, isFinale: true },
];

function stopScrollY(stop) {
  const range = cinematicRanges.find((r) => r.id === stop.chapterId);
  if (!range) return null;
  const master = stop.isFinale ? range.end - 0.004 : range.start + stop.local * (range.end - range.start);
  return progressToScrollY(master);
}

// Drives the "Play" auto-tour: scrolls through every stop in order,
// holding each on screen for DWELL_MS before advancing to the next, then
// glides back to the hero in one continuous rewind once the finale's own
// hold ends (see `rewind`) — `isPlaying` covers both directions, so the
// tour reads as one continuous cycle rather than stopping cold at the
// end. Playback-state consumers (the Play button, the Navbar) read
// `isPlaying`/`controlsVisible` from here rather than each tracking their
// own timers, so hiding/revealing chrome stays in lockstep with the
// actual scroll sequence rather than drifting out of sync.
//
// Also exposes `activeOverride` (the current stop's chapter id, or null)
// and `stepInfo` ({index, total}, 1-based) — App prefers activeOverride
// over cinematicActive's own progress-driven tracking as a
// belt-and-suspenders measure during the stop-by-stop forward tour,
// staying sticky (not on a timer) until a genuine wheel/touch gesture
// means the user is driving again. The continuous rewind releases it
// immediately instead (see `rewind`), since there's no discrete "current
// stop" to report while it's sweeping continuously through every
// chapter — the normal scroll-position heuristic already updates live as
// that happens, same as it does for a real manual scroll.
export default function useAutoPlay(lenisRef) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [overrideActive, setOverrideActive] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(STOPS[0].chapterId);
  const [stepIndex, setStepIndex] = useState(0);
  const stepTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const indexRef = useRef(0);

  const clearStepTimer = () => {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  const releaseOverride = useCallback(() => {
    setOverrideActive(false);
  }, []);

  const stop = useCallback(() => {
    clearStepTimer();
    setIsPlaying(false);
    setControlsVisible(true);
  }, []);

  const rewind = useCallback(() => {
    releaseOverride();
    if (lenisRef?.current) lenisRef.current.scrollTo(0, { duration: REWIND_TOTAL_S });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    stepTimerRef.current = setTimeout(() => {
      setIsPlaying(false);
      setControlsVisible(true);
    }, REWIND_TOTAL_S * 1000 + 200);
  }, [lenisRef, releaseOverride]);

  const advance = useCallback(() => {
    const stopInfo = STOPS[indexRef.current];
    if (!stopInfo) return;
    setCurrentChapterId(stopInfo.chapterId);
    setStepIndex(indexRef.current);

    const prevChapterId = STOPS[indexRef.current - 1]?.chapterId;
    const hopScrollS = hopDuration(prevChapterId, stopInfo.chapterId);

    const targetY = stopScrollY(stopInfo);
    if (targetY != null && lenisRef?.current) lenisRef.current.scrollTo(targetY, { duration: hopScrollS });
    else if (targetY != null) window.scrollTo({ top: targetY, behavior: "smooth" });

    const atEnd = indexRef.current >= STOPS.length - 1;
    stepTimerRef.current = setTimeout(() => {
      if (atEnd) {
        rewind();
        return;
      }
      indexRef.current += 1;
      advance();
    }, hopScrollS * 1000 + DWELL_MS);
  }, [lenisRef, rewind]);

  const start = useCallback(() => {
    indexRef.current = 0;
    setIsPlaying(true);
    setControlsVisible(true);
    setOverrideActive(true);
    advance();
  }, [advance]);

  // Auto-hide the chrome while playing; moving the mouse brings it back
  // for a beat.
  useEffect(() => {
    if (!isPlaying) return undefined;

    function revealControls() {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    }

    revealControls();
    window.addEventListener("mousemove", revealControls);

    return () => {
      window.removeEventListener("mousemove", revealControls);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying]);

  // A real wheel/touch gesture reads as "let me drive": stops the tour
  // outright (if still running) and hands the active-chapter reading back
  // to the normal heuristic. Wired whenever either `overrideActive` or
  // `isPlaying` holds, not just one — `overrideActive` alone covers the
  // stop-by-stop forward tour and a tour halted via the Stop button (both
  // stay sticky on the last-reported chapter until a real scroll), while
  // `isPlaying` alone covers the continuous rewind, which releases the
  // override immediately (see `rewind`) but still needs a manual scroll
  // during it to cut the glide short.
  useEffect(() => {
    if (!overrideActive && !isPlaying) return undefined;

    function onManualScroll() {
      stop();
      releaseOverride();
    }

    window.addEventListener("wheel", onManualScroll, { passive: true });
    window.addEventListener("touchstart", onManualScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onManualScroll);
      window.removeEventListener("touchstart", onManualScroll);
    };
  }, [overrideActive, isPlaying, stop, releaseOverride]);

  useEffect(() => clearStepTimer, []);

  return {
    isPlaying,
    controlsVisible,
    activeOverride: overrideActive ? currentChapterId : null,
    stepInfo: overrideActive ? { index: stepIndex + 1, total: STOPS.length } : null,
    start,
    stop,
  };
}
