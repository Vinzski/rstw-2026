import { useEffect, useState } from "react";
import { motion, useTransform, useMotionValueEvent } from "framer-motion";
import { mapRange } from "../lib/scroll";
import { revealClip, hideClip } from "../lib/wipe";
import { diveHandoffs, NO_HANDOFF } from "../lib/glyphDive";
import { cinematicRanges, chapterEdgeFade, chapterParallax } from "../data/content";
import { snapZones } from "../lib/snapZones";
import { useLenisRef } from "../lib/lenisContext";
import useScrollSnap from "../hooks/useScrollSnap";
import IntroChapter from "./IntroChapter";
import AboutChapter from "./AboutChapter";
import PillarsChapter from "./PillarsChapter";
import HighlightsChapter from "./HighlightsChapter";

const COMPONENTS = [IntroChapter, AboutChapter, PillarsChapter, HighlightsChapter];

// How far into a neighboring chapter's territory each chapter's wipe
// transition runs, in master-progress fractions.
const EDGE_FADE = chapterEdgeFade;

// Wide enough that a chapter is mounted before the neighbor's glyph dive
// starts opening its reveal hole — the longest dive (the intro's zero,
// ~78% of its chapter) reaches ~0.073 of master progress back before its
// boundary, and an unmounted layer mid-dive would pop in as a visible
// hole of content.
const MOUNT_MARGIN = EDGE_FADE + 0.052;

const ALL_MOUNTED = new Set(cinematicRanges.map((_, i) => i));

function computeMountSet(p) {
  const set = new Set();
  cinematicRanges.forEach((range, i) => {
    if (p >= range.start - MOUNT_MARGIN && p <= range.end + MOUNT_MARGIN) set.add(i);
  });
  return set;
}

function sameMountSet(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// Chapters hand off via a diagonal wipe (see lib/wipe.js) instead of a
// uniform center scale/zoom — a slanted line sweeps left-to-right across
// the screen, the incoming chapter (painted after the outgoing one in DOM
// order, so it's already on top) revealing through it. Both the outgoing
// chapter's hide-window and the incoming chapter's reveal-window are
// centered on the exact same shared boundary point, so the two wipes stay
// in lockstep — there's no seam where neither has finished or both are
// mid-transition out of sync.
//
// On top of that boundary wipe, each chapter also carries its own
// continuous depth parallax for the whole time it's on screen (not just
// at the boundary): the backdrop drifts one way, the foreground content
// drifts the other, at different rates — so there's always something
// happening beyond a static center block of text, even mid-chapter.
// Chapters whose last beat exits by diving through a glyph (see
// lib/glyphDive): the incoming neighbor is revealed through a circle
// pinned to that glyph — riding the exact same hole the outgoing zoom
// opens — instead of the diagonal wipe, and the outgoing side needs no
// hide wipe at all: by the time its range ends, the hole has swallowed
// the viewport and the incoming layer fully covers it.
const HANDOFF_IN = {
  about: diveHandoffs.intro,
  pillars: diveHandoffs.about,
  highlights: diveHandoffs.pillars,
};
const DIVES_OUT = new Set(["intro", "about", "pillars"]);

function useSegmentEnvelope(masterProgress, range, isFirst, isLast) {
  const { start, end, id } = range;
  const localProgress = useTransform(masterProgress, (p) => mapRange(p, start, end, 0, 1));

  const handoffIn = HANDOFF_IN[id];
  const dive = handoffIn ?? NO_HANDOFF;
  const divesOut = DIVES_OUT.has(id);
  const clipPath = useTransform(
    [masterProgress, dive.x, dive.y, dive.rx, dive.ry],
    ([p, hx, hy, hrx, hry]) => {
      if (!isFirst && p < start + EDGE_FADE) {
        // Ellipse, not circle: it fills the glyph counter's actual oval,
        // so the reveal reads as the whole hole opening rather than a
        // disc floating inside it.
        if (handoffIn) return `ellipse(${hrx}px ${hry}px at ${hx}px ${hy}px)`;
        return revealClip(mapRange(p, start - EDGE_FADE, start + EDGE_FADE, 0, 1));
      }
      if (!isLast && p > end - EDGE_FADE) {
        if (divesOut) return "none";
        return hideClip(mapRange(p, end - EDGE_FADE, end + EDGE_FADE, 0, 1));
      }
      return "none";
    },
  );

  const bgY = useTransform(localProgress, (p) => mapRange(p, 0, 1, -chapterParallax.bg, chapterParallax.bg));
  const fgY = useTransform(localProgress, (p) => mapRange(p, 0, 1, chapterParallax.fg, -chapterParallax.fg));

  return { localProgress, clipPath, bgY, fgY };
}

// All four narrative chapters live here as absolutely-positioned layers
// sharing one sticky viewport, each driven by its own slice of one master
// progress value. Neighboring chapters stay mounted through a boundary —
// the "next" chapter is already sitting right there, mid-entrance, for the
// wipe to have something to reveal — so crossing between them reads as one
// continuous camera move through a single space rather than a handoff
// between separate pages. Highlights is the last of them — its final
// beat (Tech Demos & Talks) settles and holds instead of diving into a
// next chapter, since the real page ends there, into the footer.
//
// But a chapter more than one boundary away is unmounted entirely, not
// just clipped to nothing. Every chapter runs a couple dozen of its own
// scroll-linked transforms (kinetic text, beat choreography for
// Pillars/Highlights...), and those all recompute and write to the DOM on
// every scroll frame regardless of whether anything is visible — keeping
// all four mounted permanently meant paying for roughly 4x the animation
// work the screen could ever actually show at once. Chapters outside mount
// range are already fully clipped away before they're dropped and after
// they're remounted, so this doesn't change anything visible.
//
// That trade only pays off while the user is dwelling somewhere — during
// the auto-tour's continuous rewind, master progress sweeps through the
// *entire* track in one unbroken pass, so a chapter that would normally
// enjoy several seconds of margin before its neighbor needs it instead
// gets unmounted and remounted within a much smaller real-time window.
// Mounting a whole chapter back in (images, a couple dozen fresh motion
// values, a glyph-dive's layout measurement) is real synchronous work,
// and doing it while the animation is mid-flight risked a dropped frame
// reading as a blank flash right at the seam. `isAutoPlaying` keeps every
// chapter mounted for the whole automated sequence instead — a short-lived
// trade of the normal lazy-mount saving for guaranteed-smooth playback.
export default function CinematicLayers({ progress, onActiveChange, isAutoPlaying }) {
  useMotionValueEvent(progress, "change", (p) => {
    let current = cinematicRanges[0];
    for (const range of cinematicRanges) {
      if (p >= range.start) current = range;
    }
    onActiveChange?.(current.id);
  });

  const lenisRef = useLenisRef();
  useScrollSnap(progress, snapZones, lenisRef, isAutoPlaying);

  const [mounted, setMounted] = useState(() => (isAutoPlaying ? ALL_MOUNTED : computeMountSet(progress.get())));
  useMotionValueEvent(progress, "change", (p) => {
    const next = isAutoPlaying ? ALL_MOUNTED : computeMountSet(p);
    setMounted((prev) => (sameMountSet(prev, next) ? prev : next));
  });
  useEffect(() => {
    const next = isAutoPlaying ? ALL_MOUNTED : computeMountSet(progress.get());
    setMounted((prev) => (sameMountSet(prev, next) ? prev : next));
  }, [isAutoPlaying, progress]);

  const env0 = useSegmentEnvelope(progress, cinematicRanges[0], true, false);
  const env1 = useSegmentEnvelope(progress, cinematicRanges[1], false, false);
  const env2 = useSegmentEnvelope(progress, cinematicRanges[2], false, false);
  const env3 = useSegmentEnvelope(progress, cinematicRanges[3], false, true);
  const envelopes = [env0, env1, env2, env3];

  return (
    <div className="relative h-full w-full">
      {cinematicRanges.map((range, i) => {
        if (!mounted.has(i)) return null;
        const ChapterComponent = COMPONENTS[i];
        const env = envelopes[i];
        return (
          <motion.div
            key={range.id}
            style={{ clipPath: env.clipPath }}
            className="absolute inset-0"
          >
            <ChapterComponent progress={env.localProgress} bgY={env.bgY} fgY={env.fgY} />
          </motion.div>
        );
      })}
    </div>
  );
}
