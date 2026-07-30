import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOAD_DURATION_MS = 2600;
const DISSOLVE_DURATION_MS = 900;
const RING_R = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

const STEPS = [
  { at: 0, label: "Initializing System" },
  { at: 30, label: "Calibrating Sensors" },
  { at: 65, label: "Loading Recognition Engine" },
  { at: 92, label: "Ready" },
];

// The one-time "device is booting up" screen, played once before VIP 1's
// own scan starts — not repeated per VIP. Recreates the reference
// video's radial sweep + concentric rings + particle dissolve as real
// animated SVG/DOM rather than an embedded video, in the site's own
// orange/gold palette instead of the reference's cyan (matching every
// other screen here, which is deliberately light/paper, not a dark HUD).
export default function RadialLoader({ onDone }) {
  const [pct, setPct] = useState(0);
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / LOAD_DURATION_MS, 1);
      setPct(Math.round(t * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDissolving(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!dissolving) return;
    const t = setTimeout(onDone, DISSOLVE_DURATION_MS);
    return () => clearTimeout(t);
  }, [dissolving, onDone]);

  const status = [...STEPS].reverse().find((s) => pct >= s.at)?.label ?? STEPS[0].label;

  // Burst of particles radiating outward from the ring the instant
  // loading finishes — echoes the reference clip's dissolve-into-dots.
  const particles = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2;
    return { x: Math.cos(a), y: Math.sin(a), delay: (i % 7) * 0.025 };
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-paper-50"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div className="noise-veil" />

      {/* Full-width horizontal scan-laser lines, like the reference clip —
          purple against the loader's orange for the same complementary
          contrast the reference gets from cyan-vs-magenta. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[0.22, 0.38, 0.5, 0.62, 0.78].map((topPct, i) => (
          <motion.div
            key={i}
            className="absolute inset-x-0 h-[3px]"
            style={{
              top: `${topPct * 100}%`,
              background:
                "linear-gradient(90deg, transparent, rgba(124,88,189,0.9) 20%, rgba(124,88,189,1) 50%, rgba(124,88,189,0.9) 80%, transparent)",
              filter:
                "drop-shadow(0 0 6px rgba(124,88,189,0.95)) drop-shadow(0 0 16px rgba(124,88,189,0.7))",
            }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
          />
        ))}
      </div>

      {/* Once loading finishes, the ring itself slides off to the left
          (not just fading in place) — matching the reference clip's own
          transition before it hands off. */}
      <motion.div
        className="relative flex h-60 w-60 items-center justify-center sm:h-80 sm:w-80"
        animate={dissolving ? { x: "-30vw", opacity: 0 } : { x: "0vw", opacity: 1 }}
        transition={{ duration: DISSOLVE_DURATION_MS / 1000, ease: "easeInOut" }}
      >
        {/* Ambient concentric rings, gently breathing */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-orange-400/25"
            style={{ inset: -i * 26 }}
            animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.03, 1] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}

        <div className="absolute inset-8 rounded-full bg-orange-400/10 blur-2xl" />

        {/* Progress ring */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={RING_R} fill="none" stroke="rgba(12,26,51,0.08)" strokeWidth="3" />
          <motion.circle
            cx="100"
            cy="100"
            r={RING_R}
            fill="none"
            stroke="#f5a051"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - pct / 100) }}
            transition={{ duration: 0.1, ease: "linear" }}
            style={{ filter: "drop-shadow(0 0 6px #f5a051) drop-shadow(0 0 16px rgba(245,160,81,0.7))" }}
          />
        </svg>

        {/* Rotating radar sweep while still loading; freezes in place once done */}
        <motion.div
          className="absolute inset-0"
          animate={dissolving ? { rotate: (pct / 100) * 360 } : { rotate: 360 }}
          transition={dissolving ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-1/2 w-[2px] origin-top"
            style={{
              background: "linear-gradient(to bottom, #f5a051, transparent)",
              filter: "drop-shadow(0 0 6px #f5a051)",
            }}
          />
        </motion.div>

        <AnimatePresence>
          {!dissolving && (
            <motion.span
              key="pct"
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative font-display text-4xl font-bold text-ink sm:text-5xl"
            >
              {pct}%
            </motion.span>
          )}
        </AnimatePresence>

        {dissolving &&
          particles.map((p, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-orange-400"
              style={{ left: "50%", top: "50%" }}
              initial={{ x: p.x * 40, y: p.y * 40, opacity: 1 }}
              animate={{ x: p.x * 150, y: p.y * 150, opacity: 0 }}
              transition={{ duration: 0.7, delay: p.delay, ease: "easeOut" }}
            />
          ))}
      </motion.div>

      <motion.p
        key={status}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: dissolving ? 0 : 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-ink/70 sm:text-sm"
      >
        {status}
      </motion.p>
    </motion.div>
  );
}
