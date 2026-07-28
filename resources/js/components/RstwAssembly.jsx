import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { el, elWord, letters } from "../lib/elements";
import { useAppReady } from "../lib/appReadyContext";

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

const LOOPS = 1.35;
const CIRCLE_FRACTION = 0.72;
const ARRIVE_FRACTION = 0.88;
const START_ANGLE = -Math.PI / 2;

const TRAVEL_DURATION = 3.4;
const STAGGER = 0.12;
const START_DELAY = 0.15;

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

// Where a piece sits along the circling-then-diving route at time t
// (0→1): an elliptical orbit around the whole viewport for the first
// ~72% of the trip, then an eased pull from wherever the orbit left off
// straight to the wordmark's real on-screen slot for the rest. Every
// piece samples this same curve, just phase-shifted by its own start
// delay (see TrainPiece) — one shared track is what reads as a train
// following a leader instead of a dozen unrelated flight paths.
function trainPoint(t, orbit, target) {
  if (t <= CIRCLE_FRACTION) {
    const angle = START_ANGLE + (t / CIRCLE_FRACTION) * LOOPS * Math.PI * 2;
    return { x: orbit.cx + Math.cos(angle) * orbit.rx, y: orbit.cy + Math.sin(angle) * orbit.ry };
  }
  const endAngle = START_ANGLE + LOOPS * Math.PI * 2;
  const from = { x: orbit.cx + Math.cos(endAngle) * orbit.rx, y: orbit.cy + Math.sin(endAngle) * orbit.ry };
  // Fully arrives at the target by ARRIVE_FRACTION — before the
  // opacity/scale fade (which starts at that same fraction, see
  // TrainPiece) — so a piece sits still, fully at the wordmark's slot,
  // for the whole time it's vanishing, instead of still being mid-flight
  // toward it when it disappears.
  const u = Math.min((t - CIRCLE_FRACTION) / (ARRIVE_FRACTION - CIRCLE_FRACTION), 1);
  const eased = u * u;
  return { x: lerp(from.x, target.x, eased), y: lerp(from.y, target.y, eased) };
}

// One car of the train: rides `trainPoint` on its own delayed clock, then
// — right as it reaches the wordmark's slot — shrinks and fades away
// rather than stopping there, reading as "entering" the middle instead of
// piling up on top of it.
function TrainPiece({ src, index, orbit, target }) {
  const delay = START_DELAY + index * STAGGER;
  const spin = (index % 2 === 0 ? 1 : -1) * 420;

  const { xs, ys } = useMemo(() => {
    const xs = SAMPLE_TIMES.map((t) => trainPoint(t, orbit, target).x - BOX / 2);
    const ys = SAMPLE_TIMES.map((t) => trainPoint(t, orbit, target).y - BOX / 2);
    return { xs, ys };
  }, [orbit, target]);

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden="true"
      className="absolute left-0 top-0 object-contain drop-shadow-md"
      style={{ width: BOX, height: BOX }}
      initial={{ x: xs[0], y: ys[0], opacity: 0, scale: 0.5, rotate: 0 }}
      animate={{ x: xs, y: ys, opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.15], rotate: [0, spin] }}
      transition={{
        x: { duration: TRAVEL_DURATION, delay, times: SAMPLE_TIMES, ease: "linear" },
        y: { duration: TRAVEL_DURATION, delay, times: SAMPLE_TIMES, ease: "linear" },
        opacity: { duration: TRAVEL_DURATION, delay, times: [0, 0.05, ARRIVE_FRACTION, 1] },
        scale: { duration: TRAVEL_DURATION, delay, times: [0, 0.05, ARRIVE_FRACTION, 1] },
        rotate: { duration: TRAVEL_DURATION, delay, ease: "linear" },
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

// The RSTW wordmark. On first load: R/S/T's exploded pieces spool into a
// train that circles the hero, dives into the wordmark's own on-screen
// slot (above "2026") disappearing one by one as each arrives, and the
// flat, fully-assembled wordmark lands right after — no pause, no burst
// in between. Once it's landed, faint ambient sparks keep drifting up
// around the page margins for as long as the hero is on screen. On every
// later mount (or under reduced motion) it just settles straight into
// that finished state — see `hasPlayedTrainIntro`.
export default function RstwAssembly({ title, className = "", onRevealed }) {
  const appReady = useAppReady();
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
    if (!appReady) return;

    const travelEnd = START_DELAY + (TRAIN_PIECES.length - 1) * STAGGER + TRAVEL_DURATION;
    const doneTimer = setTimeout(() => {
      hasPlayedTrainIntro = true;
      setPhase("done");
    }, travelEnd * 1000);

    return () => clearTimeout(doneTimer);
  }, [appReady, reduceMotion]);

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
          <div className="pointer-events-none fixed inset-0 z-[65]">
            {phase === "travel" &&
              appReady &&
              target &&
              orbit &&
              TRAIN_PIECES.map((piece, i) => (
                <TrainPiece key={piece.key} src={piece.src} index={i} orbit={orbit} target={target} />
              ))}
            {revealed && <AmbientFireworks />}
          </div>,
          document.body,
        )}
    </>
  );
}
