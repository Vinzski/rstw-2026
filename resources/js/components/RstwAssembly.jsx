import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { el, elWord, letters } from "../lib/elements";
import { BOOT_DURATION_MS } from "../lib/bootTiming";

// Placement of each separately-exported letterform PNG within the shared
// RSTW lockup frame (2782x704 — the intrinsic size of the combined
// RSTW.png). Measured directly off the source art's alpha channel (each
// letter PNG is already a tight crop with almost no padding, so its own
// canvas edges double as the glyph's bounding box) so the four pieces
// land exactly where they sit in the official combined wordmark.
const PIECES = [
  { key: "R", src: letters.R, left: 0, top: 0, width: 23.47, height: 92.47 },
  { key: "S", src: letters.S, left: 24.95, top: 0, width: 24.01, height: 94.82 },
  { key: "T", src: letters.T, left: 48.96, top: 0, width: 24.33, height: 88.92 },
  { key: "W", src: letters.W, left: 74.41, top: 0, width: 25.59, height: 100 },
];

// The reveal: R, S, T, W pop in one at a time, left to right, each rising
// into place with a springy overshoot rather than all four just fading in
// together. `LETTERS_REVEAL_DURATION` is exported so IntroChapter can
// delay the year's own landing until these have actually settled.
const LETTER_STAGGER = 0.08;
const LETTER_SPRING = { type: "spring", duration: 0.55, bounce: 0.35 };
export const LETTERS_REVEAL_DURATION = (PIECES.length - 1) * LETTER_STAGGER + LETTER_SPRING.duration;

// The loose exploded-letter pieces (public/images/RSTW Individual
// Words/<LETTER>/) that make up the train. Only R/S/T have pieces
// exported — W sits out the train and just appears with the rest of the
// lockup once it lands. Listed in word order so the train "reads" R→S→T
// from head (arrives/vanishes first) to tail.
const TRAIN_LETTERS = [
  { letter: "R", files: ["1.png", "2.png", "3.png", "4.png", "5.png"] },
  { letter: "S", files: ["1.png", "2.png", "3.png", "4.png"] },
  { letter: "T", files: ["1.png", "2.png", "3.png"] },
];
const TRAIN_PIECES = TRAIN_LETTERS.flatMap(({ letter, files }) =>
  files.map((file) => ({ key: `${letter}-${file}`, src: elWord(letter, file) })),
);

// Brand palette (src/index.css `@theme`) — navy, sky blue, a
// maroon-leaning red, and gold, the same colors used across the rest of
// the site, so the ambient sparks read as on-brand rather than a generic
// effect dropped in.
const FIREWORK_COLORS = [
  "var(--color-orange-500)",
  "var(--color-sky-500)",
  "var(--color-red-600)",
  "var(--color-gold-500)",
  "var(--color-navy-600)",
];

const BOX = 52; // px — fixed on-screen size of each traveling piece
const SAMPLE_COUNT = 48;
const SAMPLE_TIMES = Array.from({ length: SAMPLE_COUNT }, (_, i) => i / (SAMPLE_COUNT - 1));

const START_ANGLE = -Math.PI / 2;

// Formation: every piece rotates around the ring continuously from the
// moment the sequence starts, running the whole time the boot Loader's
// own countdown is up (its ring sits small and centered; this ring
// orbits in a much wider ellipse around it) — there's no separate
// "sweep into place" step distinct from the rotation, and no pause
// anywhere in it. Pieces fade into visibility one at a time (left to
// right, R→S→T) while already riding that same rotation, so the ring is
// always either not-yet-fully-visible or turning, never both stopped
// *and* incomplete. Once the shared rotation reaches its target angle
// (at least one full lap) it locks in place all at once — that's the
// only stop in the whole sequence — and only then do pieces start
// peeling off, one at a time, in slot order starting from the top and
// going clockwise (the same direction the ring was just turning),
// diving into the wordmark's slot and vanishing there. The dive-turn
// gap between pieces is a fixed (not randomized) fraction of whatever's
// left of BOOT_DURATION_MS after the rotation and the final dive, so the
// very last piece always vanishes at the exact instant the loader's own
// countdown reaches 0 — see DIVE_GAP below.
const RING_ENTRY_STAGGER = 0.05; // per-piece fade-in start offset — assembles left to right
const RING_ENTRY_FADE_DURATION = 0.5; // how long a piece takes to fade/scale up once its own turn to appear comes
const RING_ROTATION_DURATION = 3.5; // wall-clock length of the one continuous, uninterrupted rotation
const RING_ROTATION_LAPS = 1; // full laps completed by the time the rotation locks — "at least one full rotation"
const DIVE_GAP_BASE = 0.4; // pause after the rotation locks before the top piece's own turn
const CENTER_DIVE_DURATION = 0.6;
// Whatever's left of the shared boot duration after the rotation, the
// pre-dive pause, and the last piece's own dive, split evenly across the
// gaps between all the pieces' dive-turns — this is what pins the very
// last piece's disappearance to the countdown's own 0.
const DIVE_GAP =
  (BOOT_DURATION_MS / 1000 - RING_ROTATION_DURATION - CENTER_DIVE_DURATION - DIVE_GAP_BASE) / (TRAIN_PIECES.length - 1);

// Depth cue for the ring's "3D" read: pieces toward the near side of the
// ellipse (bottom, facing the viewer) render bigger and brighter than the
// ones on the far side (top) — the same illusion a carousel or clock face
// gives when viewed from a slight angle instead of dead-on flat. Read off
// the piece's *current* angle (not just its resting slot), so a piece
// visibly grows and brightens as the lap swings it toward the front and
// shrinks again as it swings toward the back.
const RING_SCALE_MIN = 0.72;
const RING_SCALE_MAX = 1.3;
const RING_OPACITY_MIN = 0.55;

function depthFactor(angle) {
  return (Math.sin(angle) + 1) / 2;
}
function ringScale(angle) {
  return lerp(RING_SCALE_MIN, RING_SCALE_MAX, depthFactor(angle));
}
function ringOpacity(angle) {
  return lerp(RING_OPACITY_MIN, 1, depthFactor(angle));
}

// Ambient background sparks that keep popping around the page margins
// once the wordmark has landed — a standing, permanent presence for as
// long as the hero is on screen (not the rest of the site), several
// independent emitters overlapping so there's always at least one active
// rather than a single spark then a long silence.
const AMBIENT_EMITTERS = 5;
const AMBIENT_MIN_INTERVAL = 1.1;
const AMBIENT_MAX_INTERVAL = 2.4;
const AMBIENT_BURST_DURATION = 1.1;
const AMBIENT_RADIUS = 38;
const AMBIENT_PARTICLES = 8;

// Persists for the life of the page (module singletons, not component
// state) so the train-and-fireworks sequence plays once per visit —
// scrolling away from the hero and back doesn't replay the whole boot
// flourish, it just settles straight into the finished wordmark. Set at
// the *end* of the sequence (not when it starts) so React StrictMode's
// dev-only mount→cleanup→remount doesn't see the flag already flipped
// and skip the second (real) mount's animation entirely.
let hasPlayedTrainIntro = false;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function pieceSlotAngle(index, total) {
  return START_ANGLE + (index / total) * Math.PI * 2;
}

function ringPoint(angle, orbit) {
  return { x: orbit.cx + Math.cos(angle) * orbit.rx, y: orbit.cy + Math.sin(angle) * orbit.ry };
}

// How far into its own fade a piece is at time `t` — 0 before its turn to
// appear, 1 once fully visible. Purely an opacity/scale multiplier; the
// piece's *position* follows the shared rotation the whole time regardless
// (see ringPiecePoint), so there's nothing to "catch up" on once it fades
// in — it's already exactly where the rest of the ring is.
function entryProgress(t, index) {
  const start = RING_ENTRY_STAGGER * index;
  return Math.min(Math.max((t - start) / RING_ENTRY_FADE_DURATION, 0), 1);
}

// One piece's whole path, `t` in wall-clock seconds since the sequence
// started (the same clock for every piece, which is what keeps the
// rotation genuinely synchronized). Rotates continuously around the ring
// from t=0 — fading into view partway through, on its own staggered
// schedule, but never changing *how* it moves to do so — until the shared
// rotation locks in place (a whole number of laps, so every piece lands
// exactly back on its own slot at the same instant); only then does it
// wait out its own turn and dive from its slot to `target`, shrinking
// away — the same "entering the middle" flourish the old single
// dive-through had.
function ringPiecePoint(t, index, total, orbit, target, diveDelay) {
  const angleSlot = pieceSlotAngle(index, total);
  const diveStart = RING_ROTATION_DURATION + diveDelay;

  if (t <= diveStart) {
    const spinT = Math.min(t, RING_ROTATION_DURATION);
    const angle = angleSlot + (spinT / RING_ROTATION_DURATION) * RING_ROTATION_LAPS * Math.PI * 2;
    const p = ringPoint(angle, orbit);
    const fade = entryProgress(t, index);
    return {
      x: p.x,
      y: p.y,
      scale: lerp(0.5, 1, fade) * ringScale(angle),
      opacity: fade * ringOpacity(angle),
      rotate: 0,
    };
  }
  // Diving to center — always from its slot: the rotation completes a
  // whole number of laps, so that's exactly where it comes to rest.
  const slot = ringPoint(angleSlot, orbit);
  const baseOpacity = ringOpacity(angleSlot);
  // The dive-in fade stays right at the tail — a piece sits fully arrived
  // at the wordmark's slot before it vanishes, not still fading mid-flight.
  const u = Math.min((t - diveStart) / CENTER_DIVE_DURATION, 1);
  const eased = u * u;
  const fadeStart = 0.82;
  const opacity = u < fadeStart ? baseOpacity : lerp(baseOpacity, 0, (u - fadeStart) / (1 - fadeStart));
  return {
    x: lerp(slot.x, target.x, eased),
    y: lerp(slot.y, target.y, eased),
    scale: lerp(ringScale(angleSlot), 0.15, eased),
    opacity,
    rotate: 420 * eased,
  };
}

// One piece of the ring — see `ringPiecePoint` for its full timeline.
// `diveDelay` is this piece's own wait, after the rotation locks, for its
// top-to-clockwise turn — see pieceDiveDelays in RstwAssembly.
function TrainPiece({ src, index, total, orbit, target, diveDelay, duration }) {
  const { xs, ys, scales, opacities, rotates } = useMemo(() => {
    const xs = [];
    const ys = [];
    const scales = [];
    const opacities = [];
    const rotates = [];
    for (const frac of SAMPLE_TIMES) {
      const p = ringPiecePoint(frac * duration, index, total, orbit, target, diveDelay);
      xs.push(p.x - BOX / 2);
      ys.push(p.y - BOX / 2);
      scales.push(p.scale);
      opacities.push(p.opacity);
      rotates.push(p.rotate);
    }
    return { xs, ys, scales, opacities, rotates };
  }, [index, total, orbit, target, diveDelay, duration]);

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      className="absolute left-0 top-0 object-contain drop-shadow-md"
      style={{ width: BOX, height: BOX }}
      initial={{ x: xs[0], y: ys[0], opacity: 0, scale: 0.5, rotate: 0 }}
      animate={{ x: xs, y: ys, opacity: opacities, scale: scales, rotate: rotates }}
      transition={{
        x: { duration, times: SAMPLE_TIMES, ease: "linear" },
        y: { duration, times: SAMPLE_TIMES, ease: "linear" },
        opacity: { duration, times: SAMPLE_TIMES, ease: "linear" },
        scale: { duration, times: SAMPLE_TIMES, ease: "linear" },
        rotate: { duration, times: SAMPLE_TIMES, ease: "linear" },
      }}
    />
  );
}

// Picks a spot for one ambient spark somewhere around the page margins —
// left/right gutters or the top/bottom strips — steering clear of the
// centered text column (kicker/wordmark/year/tagline) so a spark never
// pops up on top of something readable.
function randomAmbientPoint() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: vw * (0.04 + Math.random() * 0.12), y: vh * (0.12 + Math.random() * 0.7) };
  if (side === 1) return { x: vw * (0.84 + Math.random() * 0.12), y: vh * (0.12 + Math.random() * 0.7) };
  if (side === 2) return { x: vw * (0.22 + Math.random() * 0.56), y: vh * (0.05 + Math.random() * 0.08) };
  return { x: vw * (0.22 + Math.random() * 0.56), y: vh * (0.88 + Math.random() * 0.08) };
}

// One ambient spark: a small dim flash plus a ring of particles thrown
// out and gone within a bit over a second. Dimmer and smaller than the
// old centered firework burst, but with a real (if brief) flash core so
// it still reads as a little firework going off, not just drifting dust.
function AmbientSpark({ x, y }) {
  const particles = useMemo(
    () =>
      Array.from({ length: AMBIENT_PARTICLES }, (_, i) => {
        const angle = (i / AMBIENT_PARTICLES) * Math.PI * 2 + Math.random() * 0.6;
        const dist = AMBIENT_RADIUS * (0.7 + Math.random() * 0.5);
        return { angle, dist, color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)] };
      }),
    [],
  );

  return (
    <div className="absolute left-0 top-0" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <motion.span
        className="absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0.6, 0], scale: [0, 2.6, 3.4] }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full"
          style={{ background: p.color, boxShadow: `0 0 7px 2px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
          animate={{
            x: [0, Math.cos(p.angle) * p.dist],
            y: [0, Math.sin(p.angle) * p.dist],
            opacity: [0, 0.75, 0],
            scale: [0.6, 1.1, 0.3],
          }}
          transition={{ duration: AMBIENT_BURST_DURATION, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// One emitter: spawns a spark at a random margin point, then reschedules
// itself after a randomized pause, for as long as it stays mounted — a
// slow, irregular drip rather than a metronome, so it doesn't read as a
// repeating loop.
function AmbientEmitter({ seedDelay }) {
  const [sparks, setSparks] = useState([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    let timer;
    function spawn() {
      const id = nextIdRef.current++;
      setSparks((prev) => [...prev, { id, ...randomAmbientPoint() }]);
      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => s.id !== id));
      }, AMBIENT_BURST_DURATION * 1000 + 50);
      const next = AMBIENT_MIN_INTERVAL + Math.random() * (AMBIENT_MAX_INTERVAL - AMBIENT_MIN_INTERVAL);
      timer = setTimeout(spawn, next * 1000);
    }
    timer = setTimeout(spawn, seedDelay * 1000);
    return () => clearTimeout(timer);
  }, [seedDelay]);

  return sparks.map((s) => <AmbientSpark key={s.id} x={s.x} y={s.y} />);
}

// Several emitters running at once, started out of phase with each
// other, so there's always at least one spark active somewhere — a
// standing background presence rather than one spark then a gap.
function AmbientFireworks() {
  const seedDelays = useMemo(
    () => Array.from({ length: AMBIENT_EMITTERS }, (_, i) => (i / AMBIENT_EMITTERS) * AMBIENT_MAX_INTERVAL + Math.random() * 0.4),
    [],
  );
  return seedDelays.map((seedDelay, i) => <AmbientEmitter key={i} seedDelay={seedDelay} />);
}

// The RSTW wordmark. On first load: R/S/T's exploded pieces spin up into a
// complete, evenly spaced ring around the hero, fading in one at a time
// (left to right, R→S→T) while already riding that same rotation — no
// separate "fly into place" step, no pause, the ring is simply turning
// continuously from the first frame. Once the rotation completes at least
// one full lap, it locks in place all at once — the only stop in the
// whole sequence — and only then do pieces start peeling off the ring one
// at a time, starting from the top and going clockwise (the same direction
// it was just turning), diving into the wordmark's own on-screen slot
// (above "2026") and vanishing there. The flat, fully-assembled wordmark
// lands right after the last piece is gone — no pause, no burst in
// between. Once it's landed, faint ambient sparks keep drifting up around
// the page margins for as long as the hero is on screen. On every later
// mount (or under reduced motion) it just settles straight into that
// finished state — see `hasPlayedTrainIntro`.
export default function RstwAssembly({ title, className = "", onRevealed }) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef(null);
  // Captured once at construction: whether this mount is actually going to
  // play the train-and-circle sequence, vs. settling straight into the
  // finished state (a remount, or reduced motion). `onRevealed` reports
  // this so callers can tell "the real thing just finished" apart from
  // "there was never anything to wait for".
  const [startedAnimated] = useState(() => !reduceMotion && !hasPlayedTrainIntro);
  const [phase, setPhase] = useState(() => (reduceMotion || hasPlayedTrainIntro ? "done" : "travel"));
  const [target, setTarget] = useState(null);
  const [orbit, setOrbit] = useState(null);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  // Each piece's own wait, after the shared rotation locks in place, for
  // its top-to-clockwise turn to dive — index 0 (the top slot) goes
  // first, then each next slot clockwise, a fixed DIVE_GAP apart so the
  // last one always lands exactly on BOOT_DURATION_MS (see DIVE_GAP).
  const pieceDiveDelays = useMemo(
    () => TRAIN_PIECES.map((_, i) => DIVE_GAP_BASE + i * DIVE_GAP),
    [],
  );

  useLayoutEffect(() => {
    function measure() {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setOrbit({ cx: window.innerWidth / 2, cy: window.innerHeight / 2, rx: window.innerWidth * 0.4, ry: window.innerHeight * 0.34 });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setPhase("done");
      return;
    }
    if (hasPlayedTrainIntro) {
      setPhase("done");
      return;
    }

    // Starts immediately on mount — alongside the boot Loader's own
    // countdown, not after it — so the pieces are already circling while
    // the number is still counting down. Every piece locks out of
    // rotation at the same instant; the last one to actually finish is
    // whichever has the largest dive-delay — the last slot in the
    // top-to-clockwise order — which by construction (see DIVE_GAP) lands
    // at BOOT_DURATION_MS, the same moment the countdown hits 0.
    const travelEnd = RING_ROTATION_DURATION + pieceDiveDelays[pieceDiveDelays.length - 1] + CENTER_DIVE_DURATION;
    const doneTimer = setTimeout(() => {
      hasPlayedTrainIntro = true;
      setPhase("done");
    }, travelEnd * 1000);

    return () => clearTimeout(doneTimer);
  }, [reduceMotion, pieceDiveDelays]);

  useEffect(() => {
    if (phase === "done") onRevealedRef.current?.(startedAnimated);
  }, [phase, startedAnimated]);

  const revealed = phase === "done";

  return (
    <>
      <div ref={wrapRef} role="img" aria-label={title} className={`relative aspect-[2782/704] drop-shadow-sm ${className}`}>
        {PIECES.map((piece, i) => (
          <motion.img
            key={piece.key}
            src={el(piece.src)}
            alt=""
            aria-hidden="true"
            className="absolute"
            style={{
              left: `${piece.left}%`,
              top: `${piece.top}%`,
              width: `${piece.width}%`,
              height: `${piece.height}%`,
            }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.8, y: revealed ? 0 : 12 }}
            transition={reduceMotion ? { duration: 0 } : { ...LETTER_SPRING, delay: i * LETTER_STAGGER }}
          />
        ))}
      </div>

      {!reduceMotion &&
        createPortal(
          <>
            {/* z-[110] — above the boot Loader's own z-[100], so the ring
                is visible circling around its countdown rather than
                hidden behind its opaque background. */}
            {phase === "travel" && target && orbit && (
              <div className="pointer-events-none fixed inset-0 z-[110]">
                {TRAIN_PIECES.map((piece, i) => (
                  <TrainPiece
                    key={piece.key}
                    src={piece.src}
                    index={i}
                    total={TRAIN_PIECES.length}
                    orbit={orbit}
                    target={target}
                    diveDelay={pieceDiveDelays[i]}
                    duration={RING_ROTATION_DURATION + pieceDiveDelays[i] + CENTER_DIVE_DURATION}
                  />
                ))}
              </div>
            )}
            {revealed && (
              <div className="pointer-events-none fixed inset-0 z-[65]">
                <AmbientFireworks />
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
