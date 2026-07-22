import {
  cinematicRanges,
  chapterEdgeFade,
  pillars,
  highlights,
  pillarBeatFadeFrac,
  beatDiveFrac,
} from "../data/content";

function toMaster(range, localFraction) {
  return range.start + localFraction * (range.end - range.start);
}

// The flat list of "clear" scroll ranges (master-progress fractions) across
// the whole cinematic track — everywhere content is at rest: fully in
// focus, not mid-crossfade. Built from the same fade math each chapter (and
// Pillars'/Highlights' internal beats) already use for their own
// transforms, so this can't drift out of sync with what's actually on
// screen. Used by useScrollSnap to figure out whether the user has settled
// somewhere legible or in a gap between two zones.
export const snapZones = (() => {
  const zones = [];

  for (const range of cinematicRanges) {
    // Pillars and Highlights share the same beat rhythm now: each beat is
    // revealed through the previous beat's glyph dive over the DIVE before
    // its segment, holds, then dives out over the DIVE at its end — so the
    // clear window is the segment minus a settle margin and the dive.
    if (range.id === "pillars" || range.id === "highlights") {
      const count = (range.id === "pillars" ? pillars : highlights).length;
      const segment = 1 / count;
      const fade = segment * pillarBeatFadeFrac;
      const dive = segment * beatDiveFrac;
      for (let i = 0; i < count; i++) {
        const localStart = i * segment + fade * 0.5;
        const localEnd = (i + 1) * segment - dive;
        zones.push({ start: toMaster(range, localStart), end: toMaster(range, localEnd) });
      }
      continue;
    }

    const isFirst = range.id === cinematicRanges[0].id;
    const isLast = range.id === cinematicRanges[cinematicRanges.length - 1].id;
    zones.push({
      start: isFirst ? range.start : range.start + chapterEdgeFade,
      end: isLast ? range.end : range.end - chapterEdgeFade,
    });
  }

  return zones.sort((a, b) => a.start - b.start);
})();
