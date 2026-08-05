import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Calendar, ChevronDown } from "lucide-react";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import { mapRange, mapRangeSmooth } from "../lib/scroll";
import { intro, welcomeNarration } from "../data/content";
import { speakWelcome } from "../lib/speech";
import { el, logos } from "../lib/elements";
import { LetterWatermark } from "./decor/Decor";
import { useGlyphDive, useDivePublisher } from "../lib/glyphDive";
import { useRevealHeroChrome } from "../lib/heroChromeContext";
import RstwAssembly, { LETTERS_REVEAL_DURATION } from "./RstwAssembly";

// Local-progress window of the dive. The real About layer is revealed
// directly through the zero's counter (CinematicLayers clips it to this
// dive's hole via the diveHandoffs registry — no mirror copy of the next
// scene), so the zoom can run nearly the whole chapter; the short tail
// after it holds on the revealed section until the boundary crosses.
const ZOOM_START = 0.22;
const ZOOM_END = 0.95;

// The year is now the brand's own "2026 Horizontal.png" art rather than
// live text, so the glyph dive (which needs a real DOM box to measure and
// rasterize) points at an invisible marker sized over the "0" instead of
// a character span. Measured off the source PNG's alpha channel (3181x950
// native): the "0" glyph's own column run is x[767,1615], full height —
// as fractions of the whole image that's left 24.11%, width 26.65%, top 0,
// height 100%. Not a literal text node, so glyphDive's counter-rasterizer
// finds no single-character content and falls back to treating this box's
// width as the hole's basis — fine here since the "0" is nearly as tall as
// wide, so a circular approximation reads correctly.
const ZERO_MARKER = { left: 24.11, width: 26.65 };

// Persists for the life of the page (a module singleton, not component
// state) so the welcome line plays once per visit — this chapter is
// mounted and unmounted like any other as the track scrolls, and
// component state wouldn't survive that. Same reason RstwAssembly keeps
// its own `hasPlayedTrainIntro` out here.
let hasPlayedWelcome = false;

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
  const reduceMotion = useReducedMotion();

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

  // The boot sequence: the circling shapes play with nothing else on
  // screen — no text, no logo, no site chrome — the RSTW wordmark and
  // year land together the instant the shapes have all entered the
  // middle, and everything else (kicker, tagline, venue/date, scroll cue,
  // the background watermark, *and* the persistent chrome: nav logo,
  // autoplay button, progress rail corners) waits a further beat before
  // fading in together. `heroRevealed` mirrors RstwAssembly's own reveal
  // moment; `showRest` is that plus 1.5s — unless the wordmark never
  // actually animated (a remount, or reduced motion), in which case
  // there's nothing to stagger and everything just appears together.
  // `revealHeroChrome` is the one-way channel back to App (see
  // heroChromeContext) that fires the site chrome's own reveal in lockstep.
  const revealHeroChrome = useRevealHeroChrome();
  const [heroRevealed, setHeroRevealed] = useState(false);
  const [showRest, setShowRest] = useState(false);

  const showTheRest = useCallback(() => {
    setShowRest(true);
    revealHeroChrome();
  }, [revealHeroChrome]);

  const handleRstwRevealed = useCallback(
    (wasAnimated) => {
      setHeroRevealed(true);
      // The welcome line lands with the wordmark itself, not with the
      // supporting text a beat later — `showTheRest` (and the chrome
      // reveal it drives) is deliberately staggered 1.5s behind this,
      // and hanging the voice off that made it audibly late to its own
      // reveal. Fired straight from here instead, so RSTW appearing and
      // "WELCOME TO RSTW 2026!" are the same moment.
      if (!hasPlayedWelcome) {
        hasPlayedWelcome = true;
        speakWelcome(welcomeNarration);
      }
      if (!wasAnimated) showTheRest();
    },
    [showTheRest],
  );

  useEffect(() => {
    if (!heroRevealed || showRest) return;
    const t = setTimeout(showTheRest, 1500);
    return () => clearTimeout(t);
  }, [heroRevealed, showRest, showTheRest]);

  const restInitial = reduceMotion ? false : { opacity: 0 };
  const restTransition = { duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] };

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
        <div className="bg-motif-texture absolute inset-0 opacity-70" />
        <div className="animate-blob absolute -left-40 top-[-12%] h-[46rem] w-[46rem] rounded-full bg-sky-400/20 blur-2xl" />
        <div className="animate-drift absolute -right-48 bottom-[-18%] h-[42rem] w-[42rem] rounded-full bg-orange-500/15 blur-2xl" />
        <div className="noise-veil" />
      </motion.div>

      <motion.div initial={restInitial} animate={{ opacity: showRest ? 1 : 0 }} transition={restTransition}>
        <motion.div style={{ opacity: supportOpacity }}>
          <LetterWatermark letter="R" className="-left-10 top-1/2 h-[70vh] w-auto -translate-y-1/2 sm:left-2" opacity={0.05} />
        </motion.div>
      </motion.div>

      <motion.div
        ref={wrapRef}
        style={{ scale: dive.diveScale, y: fgY, transformOrigin: dive.diveOrigin }}
        className="relative z-10 flex h-full items-center justify-center px-6"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <motion.div initial={restInitial} animate={{ opacity: showRest ? 1 : 0 }} transition={restTransition}>
            <motion.span
              style={{ opacity: supportOpacity }}
              className="mb-6 inline-flex items-center rounded-full border border-navy-900/12 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-600 shadow-sm backdrop-blur-sm sm:text-xs"
            >
              {intro.kicker}
            </motion.span>
          </motion.div>
          <h1 className="flex flex-col items-center gap-1 sm:gap-2">
            <motion.div style={{ opacity: supportOpacity }}>
              <RstwAssembly title={intro.title} className="h-24 sm:h-36 md:h-44 xl:h-52" onRevealed={handleRstwRevealed} />
            </motion.div>
            <motion.div
              className="relative aspect-[3181/950] h-14 sm:h-20 md:h-24 xl:h-28"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: heroRevealed ? 1 : 0, y: heroRevealed ? 0 : 20 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", duration: 0.4, bounce: 0.15, delay: LETTERS_REVEAL_DURATION }
              }
            >
              <img src={el(logos.yearHorizontal)} alt={intro.year} className="h-full w-full object-contain" />
              <span
                ref={zeroRef}
                aria-hidden="true"
                className="invisible absolute top-0 h-full"
                style={{ left: `${ZERO_MARKER.left}%`, width: `${ZERO_MARKER.width}%` }}
              />
            </motion.div>
          </h1>
          <motion.div initial={restInitial} animate={{ opacity: showRest ? 1 : 0 }} transition={restTransition}>
            <motion.p
              style={{ opacity: supportOpacity }}
              className="mt-6 max-w-2xl text-balance text-base font-semibold text-slate-700 sm:text-lg md:text-xl"
            >
              <span className="text-sky-600">Siyensya</span>,{" "}
              <span className="text-red-600">Teknolohiya</span>, at{" "}
              <span className="text-gold-600">Inobasyon</span>
            </motion.p>
            <motion.p
              style={{ opacity: supportOpacity }}
              className="mt-2 max-w-2xl text-balance text-sm text-slate-600 sm:text-base md:text-lg"
            >
              {intro.subtagline}
            </motion.p>
          </motion.div>
          <motion.div initial={restInitial} animate={{ opacity: showRest ? 1 : 0 }} transition={restTransition}>
            <motion.div
              style={{ opacity: supportOpacity }}
              className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-600"
            >
              <span className="inline-flex max-w-sm items-start gap-1.5 text-center sm:max-w-md">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <span>{intro.venue}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-orange-600" />
                {intro.date}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div initial={restInitial} animate={{ opacity: showRest ? 1 : 0 }} transition={restTransition}>
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
      </motion.div>
    </>
  );
}
