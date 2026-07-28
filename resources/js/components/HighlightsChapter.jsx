import { useLayoutEffect, useRef, useState } from "react";
import { motion, useTransform, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import BeatDots from "./BeatDots";
import DiveText from "./DiveText";
import { mapRange, mapRangeSmooth } from "../lib/scroll";
import { highlights, pillarBeatFadeFrac, beatDiveFrac } from "../data/content";
import { el, motifs } from "../lib/elements";
import { useGlyphDive, NULL_DIVE } from "../lib/glyphDive";

const COUNT = highlights.length;
const SEGMENT = 1 / COUNT;
// DIVE is the long push through the glyph (most of a beat's tail); FADE
// is the shorter stagger unit for settles.
const DIVE = SEGMENT * beatDiveFrac;
const FADE = SEGMENT * pillarBeatFadeFrac;

// The glyph each card dives through on its way out — continuing the one
// transition verb through the highlights deck. Highlights is the site's
// last chapter, so the final card (Tech Demos & Talks) doesn't dive
// anywhere — it settles and holds through to the footer instead; see the
// `isLastCard` handling in HighlightCard below.
const DIVE_GLYPHS = [
  { word: "&", char: 0, nth: 1 }, //  the standalone "&" of "Fair & Exhibits"
  { word: "Regional", char: 4 }, //   the "o" of "Regional"
  { word: "Innovation", char: 3 }, // the "o" of "Innovation"
  { word: "Demos", char: 3 }, //      the "o" of "Demos"
];

// Each highlight gets its own brand color, the same treatment as the
// Pillars chapter, so the four cards read as distinct beats rather than
// the same orange card repeated four times. `fillMotif` fills whichever
// side the card's text isn't on.
const HIGHLIGHT_THEME = [
  { text: "text-sky-600", gradient: "from-sky-500 to-sky-600", glow: "shadow-sky-600/20", dot: "bg-sky-500", fillMotif: motifs.lightbulb.blue },
  { text: "text-red-600", gradient: "from-red-500 to-red-700", glow: "shadow-red-700/20", dot: "bg-red-600", fillMotif: motifs.star.red },
  { text: "text-orange-600", gradient: "from-orange-500 to-orange-700", glow: "shadow-orange-700/20", dot: "bg-orange-500", fillMotif: motifs.bolt.orange },
  { text: "text-navy-700", gradient: "from-navy-700 to-navy-900", glow: "shadow-navy-900/20", dot: "bg-navy-800", fillMotif: motifs.windmill.navy },
];

// Real event photos (RSTW 2025), replacing the abstract side motif on the
// two cards whose subjects — past demos, past forums — actually have
// photos to show. Scattered, not stacked: every photo gets its own clear
// patch of ground with real gaps between them, so all three are visible
// (and independently hoverable) at once, rather than overlapping and
// hiding most of each other behind whichever one happens to be on top.
const EVENT_PHOTOS_BASE = "/images/RSTW 2025";

// Tech Demos & Talks — three portrait photos scattered around a shared
// footprint with small, varied rotations, positioned so no two ever
// overlap (checked against each card's actual box, not just eyeballed).
const DEMO_FAN = [
  { file: "553749858_1209289121246092_1791305236642796142_n.jpg", rotate: -9, x: -190, y: -90 },
  { file: "555016653_1210302777811393_6203462054861568929_n.jpg", rotate: 8, x: 190, y: -60 },
  { file: "555842040_1210302321144772_124366025892235478_n.jpg", rotate: -4, x: 0, y: 260 },
];
const DEMO_CARD_CLASS = "h-56 w-44 xl:h-72 xl:w-56";
const DEMO_WRAP_CLASS = "h-[34rem] w-[34rem] xl:h-[40rem] xl:w-[40rem]";

// Regional Forums — three landscape photos from a 2025 regional awarding
// ceremony, scattered the same non-overlapping way as the Demos card
// (this card doesn't need the same exact composition, just the same
// "real photos, popping in, all visible" treatment).
const FORUM_FAN = [
  { file: "Screenshot 2026-07-22 081125.png", rotate: -6, x: -190, y: -90 },
  { file: "Screenshot 2026-07-22 081159.png", rotate: 5, x: 170, y: -20 },
  { file: "Screenshot 2026-07-22 081209.png", rotate: -3, x: -40, y: 170 },
];
const FORUM_CARD_CLASS = "h-28 w-48 xl:h-40 xl:w-64";
const FORUM_WRAP_CLASS = "h-[24rem] w-[34rem] xl:h-[28rem] xl:w-[40rem]";

// One scattered photo: pops in with a fade + grow + a rotation that
// overshoots its resting angle and settles back, plus the usual small
// rise — the same "beat arriving" language as every other piece of
// decor on the site, just applied per-photo instead of per-icon.
//
// Hovering a photo still lifts it slightly, straightens its tilt, and
// enlarges it — a bit of polish/emphasis, not a fix for anything hidden,
// now that the scatter layout means every photo already has a fully
// visible, unobstructed area to hover. The hover amount is blended into
// the SAME useTransform pipeline as the scroll-driven entrance (rather
// than layering a second whileHover animation on top of it): a motion
// value already bound to a style prop can't also be independently driven
// by whileHover, so scale/rotate/y here are each a function of both the
// entrance progress and the hover amount together.
function FannedPhoto({ progress, enterStart, enterDur, rotate, x, y, file, cardClassName }) {
  const opacity = useTransform(progress, (p) => mapRange(p, enterStart, enterStart + enterDur, 0, 1));
  const entranceScale = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, 0.4, 1));
  const entranceRotate = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, rotate * 2.4, rotate));
  const rise = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, 50, 0));

  const [hovered, setHovered] = useState(false);
  const hoverT = useMotionValue(0);
  const scale = useTransform([entranceScale, hoverT], ([s, h]) => s + h * 0.22);
  const hoverRotate = useTransform([entranceRotate, hoverT], ([r, h]) => r * (1 - h));
  const yFinal = useTransform([rise, hoverT], ([r, h]) => r + y - h * 16);

  return (
    <motion.div
      onHoverStart={() => {
        setHovered(true);
        animate(hoverT, 1, { type: "spring", stiffness: 300, damping: 24 });
      }}
      onHoverEnd={() => {
        setHovered(false);
        animate(hoverT, 0, { type: "spring", stiffness: 300, damping: 26 });
      }}
      style={{ opacity, scale, x, y: yFinal, rotate: hoverRotate, zIndex: hovered ? 10 : 1 }}
      className={`pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-2xl border-[3px] border-white shadow-2xl shadow-navy-900/25 ${
        hovered ? "shadow-black/40" : ""
      } ${cardClassName}`}
    >
      <img src={`${EVENT_PHOTOS_BASE}/${file}`} alt="" aria-hidden="true" className="h-full w-full object-cover" />
    </motion.div>
  );
}

// Cards pop open in quick succession right as the beat's own segment
// begins — the same trick that keeps the Pillars watermark from bleeding
// through an earlier dive's small aperture: local progress stays clamped
// at exactly `start` for the whole time the previous card's dive is still
// opening, so the stack stays fully invisible until that hole has already
// swallowed the screen, then pops open in a hair of scroll.
function PhotoFan({ progress, start, fan, wrapClassName, cardClassName }) {
  return (
    <div className={`relative ${wrapClassName}`}>
      {fan.map((f, i) => (
        <FannedPhoto
          key={f.file}
          progress={progress}
          enterStart={start + i * 0.012}
          enterDur={0.014}
          rotate={f.rotate}
          x={f.x}
          y={f.y}
          file={f.file}
          cardClassName={cardClassName}
        />
      ))}
    </div>
  );
}

// Same two-dive framing as the pillar beats: a card is revealed through
// the previous card's glyph (clipped to that dive's growing hole, content
// settling in from under it), holds, then exits by diving through a glyph
// in its own title.
function HighlightCard({ item, progress, index, theme, dive, prevDive, glyphRef, sceneW, sceneH }) {
  const Icon = item.icon;
  const start = index * SEGMENT;
  const end = start + SEGMENT;
  // The site's last beat — nothing dives out after it, so it reveals the
  // same way every other card does, then just stays put through to the
  // chapter's (and the page's) end instead of exiting through its glyph.
  const isLastCard = index === COUNT - 1;
  // Alternating left/right resting position — every other card settles
  // toward the opposite edge instead of all four landing dead-center.
  const onRight = index % 2 === 1;
  const restX = onRight ? 0.66 : 0.34;

  const opacity = useTransform(progress, (p) => {
    const revealStart = start - DIVE;
    if (p < revealStart) return 0;
    if (p < revealStart + DIVE * 0.2) return mapRange(p, revealStart, revealStart + DIVE * 0.2, 0, 1);
    if (isLastCard) return 1;
    if (p < end) return 1;
    return 0;
  });

  const enterClip = useTransform(
    [progress, prevDive.holeRadius, prevDive.anchorX, prevDive.anchorY],
    ([p, r, x, y]) => (p >= start ? "none" : `circle(${r}px at ${x}px ${y}px)`),
  );

  // Card 0 skips the homing — the Pillars chapter's exit dive already
  // reveals it at rest.
  const homing = useTransform(progress, (p) =>
    index === 0 ? 0 : mapRangeSmooth(p, start - DIVE, start + FADE * 0.4, 1, 0),
  );
  const revealX = useTransform([prevDive.anchorX, sceneW, homing], ([ax, w, k]) => (ax - w * restX) * k);
  const revealY = useTransform([prevDive.anchorY, sceneH, homing], ([ay, h, k]) => (ay - h * 0.5) * k);
  const settleScale = useTransform(homing, (k) => 1 - k * 0.15);

  const g = DIVE_GLYPHS[index];
  const photoFan =
    index === 1
      ? { fan: FORUM_FAN, wrapClassName: FORUM_WRAP_CLASS, cardClassName: FORUM_CARD_CLASS }
      : index === 3
        ? { fan: DEMO_FAN, wrapClassName: DEMO_WRAP_CLASS, cardClassName: DEMO_CARD_CLASS }
        : null;

  return (
    <motion.div
      style={{
        opacity,
        clipPath: enterClip,
        willChange: "clip-path",
        scale: isLastCard ? 1 : dive.diveScale,
        transformOrigin: isLastCard ? undefined : dive.diveOrigin,
        zIndex: COUNT - index,
      }}
      className="absolute inset-0"
    >
      <motion.div
        style={{ x: revealX, y: revealY, scale: settleScale }}
        className={`absolute inset-0 flex items-center px-6 sm:px-16 lg:px-24 ${onRight ? "justify-end" : "justify-start"}`}
      >
        {/* Fills the side the text isn't on — rides the same beat frame
            as the card itself, so it arrives and dives away with it. */}
        <div
          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 lg:block ${
            index === 3
              ? (onRight ? "left-24 xl:left-36" : "right-24 xl:right-36")
              : index === 1
                ? (onRight ? "left-14 xl:left-20" : "right-14 xl:right-20")
                : (onRight ? "left-10 xl:left-16" : "right-10 xl:right-16")
          }`}
        >
          {photoFan ? (
            <PhotoFan progress={progress} start={start} {...photoFan} />
          ) : (
            <img
              src={el(theme.fillMotif)}
              alt=""
              aria-hidden="true"
              className="h-64 w-64 object-contain opacity-90 drop-shadow-xl xl:h-80 xl:w-80"
            />
          )}
        </div>

        <div
          className={`flex w-full max-w-2xl flex-col items-center gap-6 text-center sm:flex-row sm:gap-8 sm:text-left ${
            onRight ? "sm:flex-row-reverse sm:items-start sm:text-right" : "sm:items-start"
          }`}
        >
          <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br text-white shadow-xl sm:h-24 sm:w-24 ${theme.gradient} ${theme.glow}`}>
            <Icon className="h-9 w-9 sm:h-10 sm:w-10" />
          </div>
          <div>
            <span className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] ${theme.text}`}>
              <span className="tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              {item.tag}
            </span>
            <h3 className="font-display mt-3 text-4xl font-semibold text-ink sm:text-5xl xl:text-6xl">
              <DiveText text={item.title} word={g.word} charIndex={g.char} nth={g.nth} charRef={glyphRef} />
            </h3>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              {item.copy}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Receives its 0→1 progress from CinematicLayers, which owns this
// chapter's slice of the single master scroll track — there is no
// document section of its own to pin.
export default function HighlightsChapter({ progress, bgY, fgY }) {
  const [beatIndex, setBeatIndex] = useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    const idx = Math.min(COUNT - 1, Math.max(0, Math.floor(p * COUNT)));
    setBeatIndex((prev) => (prev === idx ? prev : idx));
  });

  const sceneRef = useRef(null);
  const glyphRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const sceneW = useMotionValue(1);
  const sceneH = useMotionValue(1);
  useLayoutEffect(() => {
    function measure() {
      const scene = sceneRef.current;
      if (!scene) return;
      sceneW.set(scene.clientWidth);
      sceneH.set(scene.clientHeight);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [sceneW, sceneH]);

  // dive3 (card 3's own glyph measurement) is computed for symmetry with
  // the others but its scale/origin go unused — Highlights is the site's
  // last chapter, so the last card settles instead of diving out; see
  // `isLastCard` in HighlightCard.
  const dive0 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[0], start: SEGMENT - DIVE, end: SEGMENT - 0.008 });
  const dive1 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[1], start: 2 * SEGMENT - DIVE, end: 2 * SEGMENT - 0.008 });
  const dive2 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[2], start: 3 * SEGMENT - DIVE, end: 3 * SEGMENT - 0.008 });
  const dive3 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[3], start: 1 - DIVE * 1.1, end: 0.992 });
  const dives = [dive0, dive1, dive2, dive3];

  const bgScale = useTransform(progress, (p) => mapRange(p, 0, 1, 1, 1.3));
  const theme = HIGHLIGHT_THEME[beatIndex];

  return (
    <>
      <motion.div
        style={{ scale: bgScale, y: bgY }}
        className="absolute inset-0 bg-gradient-to-b from-paper-50 via-white to-paper-100"
      >
        <div className="bg-motif-texture absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="noise-veil" />
      </motion.div>

      <BeatDots count={COUNT} activeIndex={beatIndex} label="Event Highlights" fillClass={theme.dot} />

      <motion.div ref={sceneRef} style={{ y: fgY }} className="relative h-full">
        {highlights.map((item, i) => (
          <HighlightCard
            key={item.title}
            item={item}
            progress={progress}
            index={i}
            theme={HIGHLIGHT_THEME[i]}
            dive={dives[i]}
            prevDive={i ? dives[i - 1] : NULL_DIVE}
            glyphRef={glyphRefs[i]}
            sceneW={sceneW}
            sceneH={sceneH}
          />
        ))}
      </motion.div>
    </>
  );
}
