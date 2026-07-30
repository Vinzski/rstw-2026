import { useLayoutEffect, useRef } from "react";
import { motion, useTransform, useMotionValue } from "framer-motion";
import KineticText from "./KineticText";
import { mapRange, mapRangeSmooth } from "../lib/scroll";
import { pillars, pillarBeatFadeFrac, beatDiveFrac } from "../data/content";
import { el, motifs } from "../lib/elements";
import { useGlyphDive, useDivePublisher, NULL_DIVE } from "../lib/glyphDive";

const COUNT = pillars.length;
const SEGMENT = 1 / COUNT;
// DIVE is the long push through the glyph (most of a beat's tail); FADE
// is the shorter stagger unit for settles and the cluster assembly.
const DIVE = SEGMENT * beatDiveFrac;
const FADE = SEGMENT * pillarBeatFadeFrac;

// The glyph each beat dives through on its way out — the site's one
// transition verb, continued through the hallway of pillars. The last
// beat's dive doubles as the chapter exit into Highlights (published via
// the diveHandoffs registry).
const DIVE_GLYPHS = [
  { word: "to", char: 1 }, //      the "o" of "…a place to grow?"
  { word: "science", char: 1 }, // the "c" of "science"
  { word: "do", char: 1 }, //      the "o" of "What do we owe…"
  { word: "become", char: 0 }, //  the "b" of "become"
];

// Each pillar gets its own brand color instead of every beat reusing the
// same orange accent — Innovation, Community, Sustainability and Digital
// Transformation read as four distinct identities. `clusterMotifs` is the
// [main, satellite, satellite] trio of brand marks composed into the decor
// cluster that fills whichever side the text *isn't* on — an arranged,
// piece-by-piece design instead of one big flat image.
const PILLAR_THEME = [
  {
    text: "text-orange-600", border: "border-orange-500/30", bg: "bg-orange-500/10",
    clusterGlow: "bg-orange-500/15", clusterRing: "border-orange-500/30", clusterDot: "bg-orange-500/70",
    clusterMotifs: [motifs.star.orange, motifs.bolt.orange, motifs.lotus.orange],
  },
  {
    text: "text-red-600", border: "border-red-500/30", bg: "bg-red-500/10",
    clusterGlow: "bg-red-500/15", clusterRing: "border-red-500/30", clusterDot: "bg-red-500/70",
    clusterMotifs: [motifs.kulintang.red, motifs.atom.red, motifs.star.red],
  },
  {
    text: "text-sky-600", border: "border-sky-500/30", bg: "bg-sky-500/10",
    clusterGlow: "bg-sky-500/15", clusterRing: "border-sky-500/30", clusterDot: "bg-sky-500/70",
    clusterMotifs: [motifs.palay.blue, motifs.lotus.blue, motifs.windmill.blue],
  },
  {
    text: "text-gold-600", border: "border-gold-500/30", bg: "bg-gold-500/10",
    clusterGlow: "bg-gold-500/15", clusterRing: "border-gold-500/30", clusterDot: "bg-gold-500/70",
    clusterMotifs: [motifs.bolt.yellow, motifs.atom.yellow, motifs.windmill.orange],
  },
];

// One element of the side cluster: pops in (fade + grow + rise) over its
// own slice of the beat's scroll range, so the pieces show up one after
// another instead of the whole arrangement blinking on at once. `floatY`
// adds the site's usual idle drift once a piece has landed.
function ClusterPiece({ progress, enterStart, enterDur, className, floatY = 0, floatRotate = 0, floatDuration = 5, floatDelay = 0, children }) {
  const opacity = useTransform(progress, (p) => mapRange(p, enterStart, enterStart + enterDur, 0, 1));
  const scale = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, 0.35, 1));
  const rise = useTransform(progress, (p) => mapRangeSmooth(p, enterStart, enterStart + enterDur, 36, 0));

  return (
    <div className={`absolute ${className}`}>
      <motion.div style={{ opacity, scale, y: rise }} className="h-full w-full">
        {floatY ? (
          <motion.div
            animate={{ y: [0, -floatY, 0], rotate: [0, floatRotate, 0] }}
            transition={{ duration: floatDuration, repeat: Infinity, ease: "easeInOut", delay: floatDelay }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        ) : (
          children
        )}
      </motion.div>
    </div>
  );
}

// The arranged decor filling the side the text isn't on: a soft glow, a
// slowly orbiting dashed ring, the pillar's main mark, two smaller
// satellite motifs and a couple of accent dots — staggered so the design
// assembles itself right after the beat lands, while the headline's
// characters are still flipping into place. Rides inside the beat wrapper,
// so it leaves with the beat's dive.
function SideCluster({ progress, start, theme, onRight }) {
  const [main, satA, satB] = theme.clusterMotifs;
  return (
    <div
      className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 select-none lg:block ${
        onRight ? "left-6 xl:left-14" : "right-6 xl:right-14"
      }`}
    >
      {/* Stagger stays inside the beat's hold (segment minus the DIVE
          tail) so the arrangement is fully assembled before the beat
          starts its own dive. */}
      <div className="relative h-[24rem] w-[24rem] xl:h-[28rem] xl:w-[28rem]">
        <ClusterPiece progress={progress} enterStart={start + FADE * 0.05} enterDur={FADE * 0.5} className="inset-8">
          <div className={`h-full w-full rounded-full blur-2xl ${theme.clusterGlow}`} />
        </ClusterPiece>

        <ClusterPiece progress={progress} enterStart={start + FADE * 0.3} enterDur={FADE * 0.5} className="inset-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
            className={`h-full w-full rounded-full border border-dashed ${theme.clusterRing}`}
          />
        </ClusterPiece>

        <ClusterPiece
          progress={progress}
          enterStart={start + FADE * 0.15}
          enterDur={FADE * 0.55}
          className="left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 xl:h-60 xl:w-60"
          floatY={14}
          floatRotate={2.5}
          floatDuration={6}
        >
          <img src={el(main)} alt="" aria-hidden="true" className="h-full w-full object-contain drop-shadow-xl" />
        </ClusterPiece>

        <ClusterPiece
          progress={progress}
          enterStart={start + FADE * 0.5}
          enterDur={FADE * 0.45}
          className="right-4 top-8 h-20 w-20 xl:h-24 xl:w-24"
          floatY={9}
          floatRotate={-4}
          floatDuration={4.6}
          floatDelay={0.4}
        >
          <img src={el(satA)} alt="" aria-hidden="true" className="h-full w-full object-contain drop-shadow-lg" />
        </ClusterPiece>

        <ClusterPiece
          progress={progress}
          enterStart={start + FADE * 0.65}
          enterDur={FADE * 0.45}
          className="bottom-6 left-4 h-24 w-24 xl:h-28 xl:w-28"
          floatY={11}
          floatRotate={4}
          floatDuration={5.4}
          floatDelay={0.9}
        >
          <img src={el(satB)} alt="" aria-hidden="true" className="h-full w-full object-contain drop-shadow-lg" />
        </ClusterPiece>

        <ClusterPiece progress={progress} enterStart={start + FADE * 0.8} enterDur={FADE * 0.3} className="bottom-14 right-14 h-3 w-3">
          <div className={`h-full w-full rounded-full ${theme.clusterDot}`} />
        </ClusterPiece>

        <ClusterPiece progress={progress} enterStart={start + FADE * 0.9} enterDur={FADE * 0.3} className="left-10 top-16 h-2 w-2">
          <div className={`h-full w-full rounded-full ${theme.clusterDot}`} />
        </ClusterPiece>
      </div>
    </div>
  );
}

// A beat's life is now framed by two dives: it's *revealed* through the
// previous beat's glyph (clipped to that dive's growing hole, its content
// settling in from under it), holds while its question flips in and its
// side cluster assembles, then *exits* by diving through its own glyph —
// the same verb as the hero's zero, applied beat to beat.
function PillarBeat({ pillar, progress, index, theme, dive, prevDive, glyphRef, sceneW, sceneH }) {
  const Icon = pillar.icon;
  const start = index * SEGMENT;
  const end = start + SEGMENT;
  // Alternating left/right resting position — every other pillar settles
  // toward the opposite side, using the space a permanently-centered
  // layout never touched.
  const onRight = index % 2 === 1;
  const restX = onRight ? 0.66 : 0.34;

  // Visible from the moment the previous dive starts opening its hole
  // until this beat's own dive has swallowed the screen. Earlier beats
  // paint above later ones (zIndex below) so the diving glyph's ring
  // always covers the reveal circle's rim.
  const opacity = useTransform(progress, (p) => {
    const revealStart = start - DIVE;
    if (p < revealStart) return 0;
    if (p < revealStart + DIVE * 0.2) return mapRange(p, revealStart, revealStart + DIVE * 0.2, 0, 1);
    if (p < end) return 1;
    return 0;
  });

  const enterClip = useTransform(
    [progress, prevDive.holeRadius, prevDive.anchorX, prevDive.anchorY],
    ([p, r, x, y]) => (p >= start ? "none" : `circle(${r}px at ${x}px ${y}px)`),
  );

  // Content wakes up under the previous glyph's hole, then slides and
  // settles into its real resting spot as the counter swallows the
  // screen. Beat 0 skips this — the About chapter's exit dive already
  // reveals it at rest.
  const homing = useTransform(progress, (p) =>
    index === 0 ? 0 : mapRangeSmooth(p, start - DIVE, start + FADE * 0.4, 1, 0),
  );
  const revealX = useTransform([prevDive.anchorX, sceneW, homing], ([ax, w, k]) => (ax - w * restX) * k);
  const revealY = useTransform([prevDive.anchorY, sceneH, homing], ([ay, h, k]) => (ay - h * 0.5) * k);
  const settleScale = useTransform(homing, (k) => 1 - k * 0.15);

  const q = pillar.question;
  const g = DIVE_GLYPHS[index];
  const wordAt = q.indexOf(g.word);
  const glyphIndex = wordAt === -1 ? -1 : wordAt + g.char;
  const kineticStart = start + FADE * 0.3;

  // The giant code numeral sits dead-center of the full viewport and, at
  // any nonzero opacity, its curves reach every screen edge — so unlike
  // the text/cluster (which only occupy their own corner), it can peek
  // through a dive's aperture no matter how small the hole still is,
  // reading as a stray discolored patch. `opacity` above is already 1 for
  // most of a beat's revealed lifetime (by design — content should
  // already look settled the moment it's revealed), so it doesn't gate
  // this. Instead the numeral gets its own near-instant fade tied to the
  // beat's local segment start: local progress stays clamped at exactly
  // that start value for the entire time an earlier dive's aperture is
  // still small (this beat hasn't "started" yet), so the numeral stays
  // fully invisible through that whole window and only appears once the
  // aperture has already grown to cover the screen.
  const codeOpacity = useTransform(progress, (p) => mapRange(p, start, start + 0.01, 0, 1));

  return (
    <motion.div
      style={{
        opacity,
        clipPath: enterClip,
        willChange: "clip-path",
        scale: dive.diveScale,
        transformOrigin: dive.diveOrigin,
        zIndex: COUNT - index,
      }}
      className="absolute inset-0"
    >
      <motion.span
        style={{ opacity: codeOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[13rem] font-bold leading-none text-navy-900/[0.04] sm:text-[20rem]"
      >
        {pillar.code}
      </motion.span>

      <SideCluster progress={progress} start={start} theme={theme} onRight={onRight} />

      <motion.div
        style={{ x: revealX, y: revealY, scale: settleScale }}
        className={`relative flex h-full flex-col justify-center px-6 sm:px-16 lg:px-24 ${
          onRight ? "items-end text-right" : "items-start text-left"
        }`}
      >
        <span className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl border ${theme.border} ${theme.bg} ${theme.text} sm:h-16 sm:w-16`}>
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.35em] ${theme.text}`}>
          {pillar.title}
        </p>
        <h3 className="font-display max-w-2xl text-4xl font-semibold leading-tight text-ink sm:text-6xl xl:text-7xl">
          <KineticText
            text={q}
            progress={progress}
            start={kineticStart}
            glyphIndex={glyphIndex}
            glyphRef={glyphRef}
          />
        </h3>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-xl">
          {pillar.copy}
        </p>
      </motion.div>
    </motion.div>
  );
}

// Receives its 0→1 progress from CinematicLayers, which owns this
// chapter's slice of the single master scroll track — there is no
// document section of its own to pin.
export default function PillarsChapter({ progress, bgY, fgY }) {
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

  // Beat i's dive occupies the last DIVE of its own segment — most of the
  // beat's tail, so the push through the letter is as slow as the hero's
  // zero-dive — finishing a hair early so the hole has fully swallowed
  // the screen before the next beat drops its clip. The last dive is the
  // chapter exit (published for CinematicLayers to reveal the Highlights
  // layer through) and runs slightly wider still.
  const dive0 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[0], start: SEGMENT - DIVE, end: SEGMENT - 0.008 });
  const dive1 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[1], start: 2 * SEGMENT - DIVE, end: 2 * SEGMENT - 0.008 });
  const dive2 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[2], start: 3 * SEGMENT - DIVE, end: 3 * SEGMENT - 0.008 });
  const dive3 = useGlyphDive({ progress, sceneRef, glyphRef: glyphRefs[3], start: 1 - DIVE * 1.1, end: 0.992 });
  const dives = [dive0, dive1, dive2, dive3];
  useDivePublisher("pillars", dive3, fgY);

  // A slow, constant zoom on the backdrop itself so the scene keeps
  // drifting forward even during a beat's "hold" — the room is always
  // slightly in motion, not just the foreground beats.
  const bgScale = useTransform(progress, (p) => mapRange(p, 0, 1, 1, 1.35));

  return (
    <>
      <motion.div style={{ scale: bgScale, y: bgY }} className="absolute inset-0 bg-paper-50">
        <div className="bg-motif-texture absolute inset-0 opacity-40" />
        <div className="animate-drift absolute -right-40 top-[-10%] h-[38rem] w-[38rem] rounded-full bg-sky-400/15 blur-2xl" />
        <div className="noise-veil" />
      </motion.div>

      <motion.div ref={sceneRef} style={{ y: fgY }} className="relative h-full">
        {pillars.map((pillar, i) => (
          <PillarBeat
            key={pillar.title}
            pillar={pillar}
            progress={progress}
            index={i}
            theme={PILLAR_THEME[i]}
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
