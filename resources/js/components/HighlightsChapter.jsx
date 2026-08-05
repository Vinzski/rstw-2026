import { useLayoutEffect, useRef } from "react";
import { motion, useTransform, useMotionValue } from "framer-motion";
import DiveText from "./DiveText";
import { mapRange, mapRangeSmooth } from "../lib/scroll";
import { highlights, pillarBeatFadeFrac, beatDiveFrac } from "../data/content";
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
// the same orange card repeated four times. `light` is the same color
// lifted to a pale tint — the schedule card now sits on a dimmed photo
// (see ScheduleList), so its day/time caption needs something that still
// reads on a dark backdrop instead of the mid-tone used everywhere else.
const HIGHLIGHT_THEME = [
  { text: "text-sky-600", light: "text-sky-300", gradient: "from-sky-500 to-sky-600", glow: "shadow-sky-600/20" },
  { text: "text-red-600", light: "text-red-300", gradient: "from-red-500 to-red-700", glow: "shadow-red-700/20" },
  { text: "text-orange-600", light: "text-orange-300", gradient: "from-orange-500 to-orange-700", glow: "shadow-orange-700/20" },
  { text: "text-navy-700", light: "text-slate-300", gradient: "from-navy-700 to-navy-900", glow: "shadow-navy-900/20" },
];

// Real event photos (RSTW 2025) — one per card now, as the schedule
// card's own dimmed background rather than a separate floating cluster
// (see ScheduleList). Local Inventors' Convention (index 2, formerly
// "Innovation Competitions") reuses a competition-floor shot; close
// enough in spirit that it still fits.
const EVENT_PHOTOS_BASE = "/images/RSTW 2025";
const COVER_PHOTOS = [
  "553579800_1210302201144784_7655861267300697454_n.jpg",
  "optimized/Screenshot 2026-07-22 081125.jpg",
  "554658171_1210302714478066_6490822275766403100_n.jpg",
  "553749858_1209289121246092_1791305236642796142_n.jpg",
];

// One schedule row. Text is sized generously (this whole site is meant
// to also run on a lobby TV, viewed from across a room, not just a
// laptop) rather than tuned for a phone screen up close. Light-on-dark
// now (title white, divider white/15) since the card sits on a dimmed
// photo instead of the plain paper backdrop it used to.
function ScheduleRow({ progress, enterStart, enterDur, day, time, label, theme }) {
  const opacity = useTransform(progress, (p) => mapRange(p, enterStart, enterStart + enterDur, 0, 1));
  const rise = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, 28, 0));

  return (
    <motion.div style={{ opacity, y: rise }} className="border-b border-white/15 py-4 last:border-b-0 xl:py-5">
      <p className={`text-base font-semibold uppercase tracking-[0.2em] ${theme.light} xl:text-lg`}>
        {day} &middot; {time}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold leading-snug text-white xl:text-3xl">{label}</p>
    </motion.div>
  );
}

// Each card's list is a curated few rows off the PDF's Calendar of
// Activities, not the whole day — this trailing line is the tell that
// there's more beyond what's shown, without pretending to be another
// row itself: no border-b to pair it with, dimmer than the real rows,
// and no day/time above it the way every real row gets.
function AndMoreRow({ progress, enterStart, enterDur }) {
  const opacity = useTransform(progress, (p) => mapRange(p, enterStart, enterStart + enterDur, 0, 0.65));
  const rise = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, 12, 0));

  return (
    <motion.p style={{ opacity, y: rise }} className="pb-4 text-sm italic tracking-wide text-white/70 xl:pb-5 xl:text-base">
      …and more on the day
    </motion.p>
  );
}

// Every card's real content — straight off the PDF's own Calendar of
// Activities — now shown over that beat's own event photo instead of a
// plain paper card: the photo itself is heavily darkened (`brightness`,
// not an opacity fade, so it never washes out to a flat tint) and a
// solid navy scrim sits on top of it for a second, guaranteed layer of
// contrast — between the two, every row stays legible regardless of
// what's actually in the underlying photo.
function ScheduleList({ progress, start, schedule, theme, coverPhoto }) {
  return (
    <div className="relative w-[28rem] overflow-hidden rounded-3xl shadow-2xl shadow-navy-900/30 xl:w-[34rem]">
      <img
        src={`${EVENT_PHOTOS_BASE}/${coverPhoto}`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover brightness-[0.35] saturate-[0.7]"
      />
      <div className="absolute inset-0 bg-navy-950/55" />
      <div className="relative px-8 py-1 xl:px-10">
        {schedule.map((row, i) => (
          <ScheduleRow
            key={row.label}
            progress={progress}
            enterStart={start + i * 0.012}
            enterDur={0.014}
            day={row.day}
            time={row.time}
            label={row.label}
            theme={theme}
          />
        ))}
        <AndMoreRow progress={progress} enterStart={start + schedule.length * 0.012} enterDur={0.014} />
      </div>
    </div>
  );
}

// Cards pop open in quick succession right as the beat's own segment
// begins — the same trick that keeps the Pillars watermark from bleeding
// through an earlier dive's small aperture: local progress stays clamped
// at exactly `start` for the whole time the previous card's dive is still
// opening, so the stack stays fully invisible until that hole has already
// swallowed the screen, then pops open in a hair of scroll.
//
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
            as the card itself, so it arrives and dives away with it.
            Pulled in from the screen edge toward the middle (it used to
            sit right at `left/right-10-14`, which read as two islands
            with a dead strip of paper between them) — not all the way to
            center, so it still reads as "opposite the text" rather than
            competing with it for the same spot. */}
        <div
          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 lg:block ${
            onRight ? "left-[8%] xl:left-[10%]" : "right-[8%] xl:right-[10%]"
          }`}
        >
          <ScheduleList progress={progress} start={start} schedule={item.schedule} theme={theme} coverPhoto={COVER_PHOTOS[index]} />
        </div>

        <div
          className={`relative flex w-full max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left ${
            onRight ? "sm:flex-row-reverse" : ""
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
