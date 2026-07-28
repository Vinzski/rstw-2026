import { useLayoutEffect, useRef } from "react";
import { motion, useTransform, useMotionValue, useMotionTemplate } from "framer-motion";
import {
  FlaskConical,
  Atom,
  Rocket,
  Lightbulb,
  Cpu,
  Microscope,
} from "lucide-react";
import { mapRange, mapRangeSmooth } from "../lib/scroll";
import { about } from "../data/content";
import { el, locations } from "../lib/elements";
import { useGlyphDive, useDivePublisher, HOLE_FRAC, COUNTER_FRAC } from "../lib/glyphDive";
import DiveText from "./DiveText";

const icons = [FlaskConical, Atom, Rocket, Lightbulb, Cpu, Microscope];

// The statement leaves the same way the hero did: a dive through a round
// glyph — here the first "o" of "Technology" — with the next beat revealed
// through the letter's counter. Same fractions as the intro's zero-dive.
const DIVE_WORD = "Technology";
const DIVE_CHAR = DIVE_WORD.indexOf("o");

// And the chapter itself leaves the same way: the OneDOST4U beat dives
// through the "o" of "solutions" over the chapter's tail, with the
// Pillars chapter revealed through it (via the diveHandoffs registry —
// CinematicLayers clips the incoming layer to this hole).
const OUT_DIVE_START = 0.74;
const OUT_DIVE_END = 0.99;

// The program name leads the sentence and carries the brand-gradient
// highlight; the dive glyph (the "o" of "solutions") lives in the
// remainder, so the split never touches it.
const bodyLead = about.body.startsWith(about.bodyHighlight) ? about.bodyHighlight : "";
const bodyRest = about.body.slice(bodyLead.length);

// Local-progress window of the dive. Starts right after the intro's
// reveal window over this chapter's start has finished crossing: the
// statement already had its whole screen-time inside the intro's dive, so
// holding it longer here just reads as the same section shown twice.
const DIVE_START = 0.18;
const DIVE_END = 0.46;


// Receives its 0→1 progress from CinematicLayers, which owns this
// chapter's slice of the single master scroll track — there is no
// document section of its own to pin.
export default function AboutChapter({ progress, bgY, fgY }) {
  const sceneRef = useRef(null);
  const statementRef = useRef(null);
  const oRef = useRef(null);
  const bodyGlyphRef = useRef(null);

  // The "o" glyph's center in scene coordinates (for the reveal circle),
  // in statement-local coordinates (for the dive's transform origin), and
  // the zoom needed for its counter to swallow the whole screen.
  const anchorX = useMotionValue(0);
  const anchorY = useMotionValue(0);
  const originX = useMotionValue(0);
  const originY = useMotionValue(0);
  const holeBase = useMotionValue(1);
  const endScale = useMotionValue(60);
  const revealFromX = useMotionValue(0);
  const revealFromY = useMotionValue(0);

  useLayoutEffect(() => {
    function measure() {
      const scene = sceneRef.current;
      const stmt = statementRef.current;
      if (!scene || !stmt) return;
      const vw = scene.clientWidth;
      const vh = scene.clientHeight;
      const o = oRef.current;
      if (o) {
        // offsetLeft/offsetTop are layout-based and ignore transforms, so
        // the measurement is stable no matter where mid-scroll it happens.
        // First accumulate up to the statement wrapper (the element the
        // dive scale is applied to) for the transform origin…
        let x = o.offsetLeft + o.offsetWidth / 2;
        let y = o.offsetTop + o.offsetHeight / 2;
        let node = o.offsetParent;
        while (node && node !== stmt && stmt.contains(node)) {
          x += node.offsetLeft;
          y += node.offsetTop;
          node = node.offsetParent;
        }
        originX.set(x);
        originY.set(y);
        // …then continue up to the scene wrapper for the coordinates the
        // reveal circle is drawn in.
        let sx = x + stmt.offsetLeft;
        let sy = y + stmt.offsetTop;
        node = stmt.offsetParent;
        while (node && node !== scene && scene.contains(node)) {
          sx += node.offsetLeft;
          sy += node.offsetTop;
          node = node.offsetParent;
        }
        anchorX.set(sx);
        anchorY.set(sy);
        holeBase.set(Math.max(o.offsetWidth * HOLE_FRAC, 1));
        const cover = Math.hypot(Math.max(sx, vw - sx), Math.max(sy, vh - sy));
        endScale.set((cover / Math.max(o.offsetWidth * COUNTER_FRAC, 1)) * 1.05);
        // Offset that puts the incoming body copy (a centered composition)
        // underneath the hole at dive start.
        revealFromX.set(sx - vw * 0.5);
        revealFromY.set(sy - vh * 0.45);
      } else {
        // The theme copy lost its dive word — degrade to a center iris so
        // the beat handoff still happens rather than beat two never showing.
        originX.set(stmt.offsetWidth / 2);
        originY.set(stmt.offsetHeight / 2);
        anchorX.set(vw / 2);
        anchorY.set(vh / 2);
        const r0 = Math.min(vw, vh) * 0.12;
        holeBase.set(r0);
        endScale.set((Math.hypot(vw, vh) / 2 / r0) * 1.1);
      }
    }
    measure();
    // Space Grotesk swapping in changes the glyph's metrics.
    document.fonts?.ready?.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchorX, anchorY, originX, originY, holeBase, endScale, revealFromX, revealFromY]);

  const diveOrigin = useMotionTemplate`${originX}px ${originY}px`;

  // Geometric interpolation — the same constant-speed camera-dolly feel as
  // the intro's dive through the zero.
  const diveScale = useTransform([progress, endScale], ([p, end]) =>
    Math.pow(end, mapRangeSmooth(p, DIVE_START, DIVE_END, 0, 1)),
  );

  // No entrance for the statement — the intro's dive through the zero IS
  // its entrance: this chapter is revealed directly through that digit's
  // counter, so the beat has to already be sitting here at rest for the
  // reveal to land on it. The eyebrow and subline get out of the way as
  // the dive starts; the heading never fades mid-dive — its "o" is the
  // transition's frame — only a late safety fade once the counter has
  // cleared the viewport.
  const supportOpacity = useTransform(progress, (p) => mapRange(p, 0.16, 0.24, 1, 0));
  const headingOpacity = useTransform(progress, (p) => mapRange(p, 0.43, 0.48, 1, 0));

  // The reveal: a circle pinned to the "o", growing at exactly the glyph's
  // rate so its rim rides hidden inside the letter's ring. Once the dive is
  // over the clip drops away entirely — the stats and icons beats later in
  // the chapter shouldn't pay for a huge no-op clip-path.
  const holeRadius = useTransform([diveScale, holeBase], ([s, r0]) => s * r0);
  const revealClipPath = useTransform(
    [holeRadius, anchorX, anchorY, progress],
    ([r, x, y, p]) => (p > 0.52 ? "none" : `circle(${r}px at ${x}px ${y}px)`),
  );
  const revealOpacity = useTransform(progress, (p) =>
    mapRange(p, DIVE_START + 0.02, DIVE_START + 0.08, 0, 1),
  );

  // The incoming beat wakes up with its copy under the hole, then the
  // whole group slides and settles into its real resting layout as the
  // counter swallows the screen.
  const revealHoming = useTransform(progress, (p) => mapRangeSmooth(p, 0.22, 0.5, 1, 0));
  const revealX = useTransform([revealFromX, revealHoming], ([o, k]) => o * k);
  const revealY = useTransform([revealFromY, revealHoming], ([o, k]) => o * k);
  const revealScale = useTransform(progress, (p) => mapRange(p, 0.22, 0.5, 0.8, 1));

  // The chapter's exit: the whole OneDOST4U group zooms through the "o"
  // of "solutions"; the incoming Pillars layer reads this dive's hole via
  // the handoff registry. Composed with the entrance-settle scale — the
  // two never overlap in time, so the product is always just one of them.
  const outDive = useGlyphDive({
    progress,
    sceneRef,
    glyphRef: bodyGlyphRef,
    start: OUT_DIVE_START,
    end: OUT_DIVE_END,
  });
  useDivePublisher("about", outDive, fgY);
  const revealGroupScale = useTransform([revealScale, outDive.diveScale], ([a, b]) => a * b);

  // The body never fades mid-dive — its "o" is the transition's frame —
  // only a late safety fade once the counter has cleared the viewport.
  const bodyOpacity = useTransform(
    progress,
    (p) => mapRange(p, 0.26, 0.46, 0, 1) * mapRange(p, 0.96, 1, 1, 0),
  );

  // Stats and icons ride the dive but get out of the way as it starts,
  // the same supporting-cast fade as the hero's kicker and tagline.
  const outFade = (p) => mapRange(p, 0.7, 0.78, 1, 0);
  const statsOpacity = useTransform(progress, (p) => mapRange(p, 0.52, 0.64, 0, 1) * outFade(p));
  const statsScale = useTransform(progress, (p) => mapRange(p, 0.52, 0.66, 0.75, 1));
  const statsY = useTransform(progress, (p) => mapRangeSmooth(p, 0.52, 0.64, 46, 0));

  const iconsOpacity = useTransform(progress, (p) => mapRange(p, 0.62, 0.74, 0, 1) * outFade(p));
  const iconsScale = useTransform(progress, (p) => mapRange(p, 0.62, 0.76, 0.6, 1));
  const iconsY = useTransform(progress, (p) => mapRangeSmooth(p, 0.62, 0.74, 36, 0));

  const bgScale = useTransform(progress, (p) => mapRange(p, 0, 1, 1, 1.35));

  // The right-side emblem belongs to the statement beat only — the
  // OneDOST4U beat that follows is a centered composition with no side
  // design — so it steps aside as the statement's dive gets going instead
  // of holding through the whole chapter. Already at rest from p=0 (this
  // chapter is revealed mid-frame through the intro's zero).
  const fillOpacity = useTransform(progress, (p) => {
    if (p < 0.28) return 0.85;
    return mapRange(p, 0.28, 0.42, 0.85, 0);
  });

  return (
    <>
      <motion.div
        style={{ scale: bgScale, y: bgY }}
        className="absolute inset-0 bg-gradient-to-b from-paper-100 via-paper-50 to-white"
      >
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="absolute left-1/2 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="noise-veil" />
      </motion.div>

      <motion.div
        style={{ opacity: fillOpacity }}
        className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block xl:right-20"
      >
        <motion.img
          src={el(locations.puntaDeDesembarco.default)}
          alt=""
          aria-hidden="true"
          animate={{ y: [0, -18, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="h-72 w-72 object-contain drop-shadow-xl xl:h-96 xl:w-96"
        />
      </motion.div>

      <motion.div ref={sceneRef} style={{ y: fgY }} className="relative z-10 h-full">
        {/* Painted above the reveal layer (z-20 vs default) so the "o"'s
            opaque ring stays in front of the circle's rim all the way
            through the zoom. */}
        <div className="absolute inset-0 z-20 flex flex-col items-start justify-center px-6 sm:pl-16 lg:pl-24 xl:pl-32">
          <motion.p
            style={{ opacity: supportOpacity }}
            className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-orange-600"
          >
            {about.eyebrow}
          </motion.p>

          <motion.div
            ref={statementRef}
            style={{ scale: diveScale, transformOrigin: diveOrigin }}
            className="relative flex max-w-2xl flex-col items-start gap-3 text-left"
          >
            <motion.h2
              style={{ opacity: headingOpacity }}
              className="font-display text-gradient text-4xl font-bold leading-tight sm:text-6xl xl:text-7xl"
            >
              <DiveText text={about.theme.main} word={DIVE_WORD} charIndex={DIVE_CHAR} charRef={oRef} />
            </motion.h2>
            <motion.p
              style={{ opacity: supportOpacity }}
              className="font-display max-w-xl text-xl font-medium leading-snug text-purple-600 sm:text-3xl"
            >
              {about.theme.sub}
            </motion.p>
          </motion.div>
        </div>

        <motion.div
          style={{ clipPath: revealClipPath, opacity: revealOpacity }}
          className="absolute inset-0"
        >
          <motion.div
            style={{ x: revealX, y: revealY, scale: revealGroupScale, transformOrigin: outDive.diveOrigin }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <motion.p
                style={{ opacity: bodyOpacity }}
                className="max-w-4xl text-center text-2xl font-semibold uppercase tracking-[0.1em] text-navy-800 sm:text-4xl xl:text-5xl"
              >
                <span className="text-gradient">{bodyLead}</span>
                <DiveText text={bodyRest} word="solutions" charIndex={1} charRef={bodyGlyphRef} />
              </motion.p>
            </div>

            <div className="absolute inset-x-0 bottom-[18%] flex justify-center px-6 sm:bottom-[16%]">
              <motion.div
                style={{ opacity: statsOpacity, scale: statsScale, y: statsY }}
                className="grid w-full max-w-2xl grid-cols-3 gap-4"
              >
                {about.stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-navy-900/10 bg-white/75 px-3 py-4 text-center shadow-sm shadow-navy-900/5 sm:px-4 sm:py-5"
                  >
                    <div className="text-gradient font-display text-3xl font-bold sm:text-5xl">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[0.65rem] text-slate-500 sm:text-xs">
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="absolute inset-x-0 bottom-8 flex justify-center px-6">
              <motion.div
                style={{ opacity: iconsOpacity, scale: iconsScale, y: iconsY }}
                className="flex items-center gap-3 sm:gap-4"
              >
                {icons.map((Icon, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-navy-900/10 bg-white/70 text-orange-600 shadow-sm shadow-navy-900/5 sm:h-11 sm:w-11"
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
