import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { el, letters } from "../lib/elements";
import { useAppReady } from "../lib/appReadyContext";

// Placement of each separately-exported letterform PNG within the shared
// RSTW lockup frame (2782x704 — the intrinsic size of the combined
// RSTW.png). Measured directly off the source art's alpha channel (each
// letter PNG is already a tight crop with almost no padding, so its own
// canvas edges double as the glyph's bounding box) so the four pieces
// land exactly where they sit in the official combined wordmark once
// assembled — glyph proportions differ letter to letter, so these aren't
// even quarters. `from` is the pre-scale px offset each piece flies in
// from — a different corner per letter so the four converge from all sides.
const PIECES = [
  { key: "R", src: letters.R, left: 0, top: 0, width: 23.47, height: 92.47, from: { x: -220, y: -180, rotate: -42 } },
  { key: "S", src: letters.S, left: 24.95, top: 0, width: 24.01, height: 94.82, from: { x: -220, y: 180, rotate: 36 } },
  { key: "T", src: letters.T, left: 48.96, top: 0, width: 24.33, height: 88.92, from: { x: 220, y: -180, rotate: 42 } },
  { key: "W", src: letters.W, left: 74.41, top: 0, width: 25.59, height: 100, from: { x: 220, y: 180, rotate: -36 } },
];

const SPARK_COLORS = ["#f5a051", "#5ab6e8", "#dd6a2e", "#3d7fc4"];

const FLIGHT_DURATION = 0.85;
const FLIGHT_STAGGER = 0.09;
const START_DELAY = 0.15;
const FLIGHT_EASE = [0.16, 1, 0.3, 1];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Sparks spawned progressively along a piece's flight path — each covers
// a short stretch of the path and fades before catching up to the
// letter, reading as a trail left in its wake rather than static
// decoration riding along with it.
function Trail({ from, delay, color }) {
  const steps = [0, 1, 2, 3].map((i) => {
    const t0 = i / 4;
    const t1 = t0 + 0.28;
    const jitter = i % 2 === 0 ? 9 : -9;
    return {
      key: i,
      x0: lerp(from.x, 0, t0) + jitter,
      y0: lerp(from.y, 0, t0) - jitter,
      x1: lerp(from.x, 0, t1) + jitter * 0.4,
      y1: lerp(from.y, 0, t1) - jitter * 0.4,
      delay: delay + t0 * FLIGHT_DURATION,
      dur: (t1 - t0) * FLIGHT_DURATION * 1.7,
    };
  });

  return steps.map((p) => (
    <motion.span
      key={p.key}
      className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 6px 1px ${color}` }}
      initial={{ x: p.x0, y: p.y0, opacity: 0, scale: 0.6 }}
      animate={{ x: [p.x0, p.x1], y: [p.y0, p.y1], opacity: [0, 1, 0], scale: [0.6, 1, 0.4] }}
      transition={{ delay: p.delay, duration: p.dur, ease: "easeOut" }}
    />
  ));
}

// The "snap into place" punctuation fired once a piece lands: a small
// radial burst that scatters and fades.
function Burst({ color }) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 24 + (i % 2) * 10;
    return (
      <motion.span
        key={i}
        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
        style={{ background: color }}
        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.2 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    );
  });
}

// The RSTW wordmark, assembled on load: the four letterforms fly in from
// alternating corners and snap into their measured positions, each
// trailing sparks along its path and popping a small burst on landing.
// Waits for `useAppReady` (App's boot Loader having fully cleared) so the
// entrance actually plays where the user can see it, rather than
// finishing behind the loader — IntroChapter is mounted underneath it
// from the very first frame.
export default function RstwAssembly({ title, className = "" }) {
  const appReady = useAppReady();
  const reduceMotion = useReducedMotion();
  const [landed, setLanded] = useState(() => new Set());

  const markLanded = useCallback((key) => {
    setLanded((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  const restState = { x: 0, y: 0, rotate: 0, opacity: 1 };

  return (
    <div role="img" aria-label={title} className={`relative aspect-[2782/704] drop-shadow-sm ${className}`}>
      {PIECES.map((piece, i) => {
        const delay = START_DELAY + i * FLIGHT_STAGGER;
        const color = SPARK_COLORS[i];
        const hiddenState = reduceMotion
          ? { x: 0, y: 0, rotate: 0, opacity: 0 }
          : { ...piece.from, opacity: 0 };

        return (
          <div
            key={piece.key}
            className="absolute"
            style={{
              left: `${piece.left}%`,
              top: `${piece.top}%`,
              width: `${piece.width}%`,
              height: `${piece.height}%`,
            }}
          >
            {appReady && !reduceMotion && !landed.has(piece.key) && (
              <Trail from={piece.from} delay={delay} color={color} />
            )}
            <motion.img
              src={el(piece.src)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              initial={hiddenState}
              animate={appReady ? restState : hiddenState}
              transition={{
                duration: reduceMotion ? 0.3 : FLIGHT_DURATION,
                delay: reduceMotion ? 0 : delay,
                ease: FLIGHT_EASE,
              }}
              onAnimationComplete={() => appReady && markLanded(piece.key)}
            />
            {!reduceMotion && (
              <AnimatePresence>
                {landed.has(piece.key) && (
                  <motion.div key="burst" className="pointer-events-none absolute inset-0">
                    <Burst color={color} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </div>
  );
}
