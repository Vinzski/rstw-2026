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
// that id anymore — Intro/About/Pillars/Highlights/When are all layers
// inside one pinned track (see CinematicTrack), not separate sections. So
// for those ids, compute the scroll position that corresponds to their
// slice of the track's progress directly; for real sections (Stay,
// Contact) fall back to the ordinary element-based scroll.
export function scrollToChapter(id, lenis) {
  const range = cinematicRanges.find((r) => r.id === id);

  if (range) {
    const fraction = Math.min(range.start + SETTLE_INTO_SEGMENT, range.end);
    const targetY = progressToScrollY(fraction);
    if (targetY === null) return;

    if (lenis) lenis.scrollTo(targetY, { duration: 1.4 });
    else window.scrollTo({ top: targetY, behavior: "smooth" });
    return;
  }

  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
}
