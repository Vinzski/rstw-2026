import { useRef } from "react";
import { MapPin, Calendar, ChevronDown } from "lucide-react";
import { motion, useTransform } from "framer-motion";
import { mapRange, mapRangeSmooth } from "../lib/scroll";
import { intro } from "../data/content";
import { LetterWatermark } from "./decor/Decor";
import { useGlyphDive, useDivePublisher } from "../lib/glyphDive";
import RstwAssembly from "./RstwAssembly";

// The digit the camera dives through. Falls back to the first character if
// the year ever loses its zero.
const zeroIndex = Math.max(intro.year.indexOf("0"), 0);

// Local-progress window of the dive. The real About layer is revealed
// directly through the zero's counter (CinematicLayers clips it to this
// dive's hole via the diveHandoffs registry — no mirror copy of the next
// scene), so the zoom can run nearly the whole chapter; the short tail
// after it holds on the revealed section until the boundary crosses.
const ZOOM_START = 0.22;
const ZOOM_END = 0.95;

// Receives its 0→1 progress from CinematicLayers, which owns this
// chapter's slice of the single master scroll track — there is no
// document section of its own to pin.
//
// The transition out is a dive through the "0" of 2026: the whole hero
// scales up around that digit's center until its counter swallows the
// viewport, and the About chapter is revealed *through the hole of the
// zero* — the digit's own ring is the aperture.
export default function IntroChapter({ progress, bgY, fgY }) {
  const wrapRef = useRef(null);
  const zeroRef = useRef(null);

  const dive = useGlyphDive({
    progress,
    sceneRef: wrapRef,
    glyphRef: zeroRef,
    start: ZOOM_START,
    end: ZOOM_END,
  });
  useDivePublisher("intro", dive, fgY);

  // Everything that isn't the year gets out of the way as the dive starts;
  // the year itself never fades — its ring is the transition's frame.
  const supportOpacity = useTransform(progress, (p) => mapRange(p, 0.16, 0.36, 1, 0));
  const cueOpacity = useTransform(progress, (p) => mapRange(p, 0, 0.08, 1, 0));

  // Backdrop drifts forward the whole chapter, then joins the dive toward
  // the same anchor at a slower rate — depth parallax on the way in.
  const bgScale = useTransform(progress, (p) => {
    const drift = mapRange(p, 0, 1, 1, 1.25);
    const push = 1 + mapRangeSmooth(p, ZOOM_START, ZOOM_END, 0, 1.1);
    return drift * push;
  });

  return (
    <>
      <motion.div
        style={{ scale: bgScale, y: bgY, transformOrigin: dive.diveOrigin }}
        className="absolute inset-0 bg-paper-50"
      >
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div className="animate-blob absolute -left-40 top-[-12%] h-[46rem] w-[46rem] rounded-full bg-sky-400/20 blur-2xl" />
        <div className="animate-drift absolute -right-48 bottom-[-18%] h-[42rem] w-[42rem] rounded-full bg-orange-500/15 blur-2xl" />
        <div className="noise-veil" />
      </motion.div>

      <motion.div style={{ opacity: supportOpacity }}>
        <LetterWatermark letter="R" className="-left-10 top-1/2 h-[70vh] w-auto -translate-y-1/2 sm:left-2" opacity={0.05} />
      </motion.div>

      <motion.div
        ref={wrapRef}
        style={{ scale: dive.diveScale, y: fgY, transformOrigin: dive.diveOrigin }}
        className="relative z-10 flex h-full items-center justify-center px-6"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <motion.span
            style={{ opacity: supportOpacity }}
            className="mb-6 inline-flex items-center rounded-full border border-navy-900/12 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-600 shadow-sm backdrop-blur-sm sm:text-xs"
          >
            {intro.kicker}
          </motion.span>
          <h1 className="flex flex-col items-center gap-1 sm:gap-2">
            <motion.div style={{ opacity: supportOpacity }}>
              <RstwAssembly title={intro.title} className="h-24 sm:h-36 md:h-44 xl:h-52" />
            </motion.div>
            <span className="text-gradient animate-gradient-pan font-display text-6xl font-bold leading-none sm:text-8xl md:text-9xl xl:text-[10.5rem]">
              {intro.year.split("").map((ch, i) => (
                <span
                  key={i}
                  ref={i === zeroIndex ? zeroRef : undefined}
                  className="inline-block"
                >
                  {ch}
                </span>
              ))}
            </span>
          </h1>
          <motion.p
            style={{ opacity: supportOpacity }}
            className="mt-6 max-w-2xl text-balance text-base text-slate-600 sm:text-lg md:text-xl"
          >
            {intro.tagline}
          </motion.p>
          <motion.div
            style={{ opacity: supportOpacity }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600"
          >
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-600" />
              {intro.venue}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-orange-600" />
              {intro.date}
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: cueOpacity }}
        className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 text-slate-500"
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em]">
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="grid h-8 w-8 place-items-center rounded-full border border-navy-900/15"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </motion.div>
    </>
  );
}
