import { cinematicRanges } from "../data/content";

// Nudge past a chapter's own entrance fade so a nav click lands on
// something already legible, not the first blurry instant of its zoom-in.
const SETTLE_INTO_SEGMENT = 0.08;

// The pinned track's scroll geometry: how many document pixels its 0→1
// progress actually spans, and where that span starts. Shared by
// scrollToChapter (nav jumps) and useScrollSnap (settle-and-advance) so
// both convert a master-progress fraction to a scroll position the same
// way. Returns null if the track isn't mounted yet.
export function getTrackGeometry() {
  const track = document.getElementById("story");
  if (!track) return null;
  const rect = track.getBoundingClientRect();
  return {
    docTop: window.scrollY + rect.top,
    scrollable: Math.max(rect.height - window.innerHeight, 0),
  };
}

export function progressToScrollY(fraction, geometry = getTrackGeometry()) {
  if (!geometry) return null;
  return geometry.docTop + fraction * geometry.scrollable;
}

// Jumping to a narrative chapter can't just scrollIntoView an element with
// that id — Intro/About/Pillars/Highlights are all layers inside one
// pinned track (see CinematicTrack), not separate sections. So for those
// ids, compute the scroll position that corresponds to their slice of the
// track's progress directly. The element-based fallback below covers any
// id that isn't part of that track, should one exist outside it again.
//
// `duration` defaults to a quick nav-click feel (1.4s); the auto-tour
// passes a slower one so the scroll-scrubbed zoom/dive/wipe transitions
// each chapter drives off scroll position — invisible on an instant jump —
// actually have time to play as the position glides through them.
export function scrollToChapter(id, lenis, duration = 1.4) {
  const range = cinematicRanges.find((r) => r.id === id);

  if (range) {
    const fraction = Math.min(range.start + SETTLE_INTO_SEGMENT, range.end);
    const targetY = progressToScrollY(fraction);
    if (targetY === null) return;

    if (lenis) lenis.scrollTo(targetY, { duration });
    else window.scrollTo({ top: targetY, behavior: "smooth" });
    return;
  }

  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration });
  else el.scrollIntoView({ behavior: "smooth" });
}
