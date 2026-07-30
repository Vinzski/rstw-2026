import { useEffect, useState } from "react";
import { motion, animate, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

// Total time for the confidence readout to climb 0 → 100%, at which
// point the scan auto-resolves as verified. Standing in for a real
// face-match call — swap `onDone` to fire from that response instead of
// this timeline once the real recognition backend exists.
export const SCAN_DURATION = 4.3;
const VERIFIED_HOLD_MS = 800;

// Status copy keyed to how far along the confidence readout is, rather
// than run on its own separate timers — keeps the label always in sync
// with the number instead of two clocks drifting apart.
const STATUS_STEPS = [
  { at: 0, label: "Face Detected" },
  { at: 14, label: "Facial Mapping" },
  { at: 44, label: "Identity Analysis" },
  { at: 72, label: "Iris Verification" },
  { at: 92, label: "Confirming Identity" },
];

// Rough, purely decorative eye positions (% of the circle) standing in
// for real eye-tracking coordinates until recognition is wired up to a
// real model — this is what the iris rings below are drawn at.
const EYES = [
  { x: 36, y: 35 },
  { x: 64, y: 35 },
];

export default function ScanOverlay({ onDone, color }) {
  const [pct, setPct] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const controls = animate(0, 100, {
      duration: SCAN_DURATION,
      ease: "easeInOut",
      onUpdate: setPct,
      onComplete: () => setVerified(true),
    });
    return () => controls.stop();
  }, []);

  useEffect(() => {
    if (!verified) return;
    const t = setTimeout(onDone, VERIFIED_HOLD_MS);
    return () => clearTimeout(t);
  }, [verified, onDone]);

  const status = [...STATUS_STEPS].reverse().find((s) => pct >= s.at)?.label ?? STATUS_STEPS[0].label;
  const showMesh = pct > 14;
  const showIris = pct > 72;

  return (
    <>
      <div className="absolute inset-0 bg-navy-900/15" />

      <AnimatePresence>
        {!verified && (
          <motion.div
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* One sweeping scan line — a single clean pass reads as
                "actively scanning" on its own; a second crossing line
                (the old vertical sweep) was HUD clutter more than signal. */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-6"
              style={{
                background: `linear-gradient(to bottom, transparent, ${color}99 45%, #fff 50%, ${color}99 55%, transparent)`,
                boxShadow: `0 0 10px 2px ${color}66`,
              }}
              initial={{ top: "-8%" }}
              animate={{ top: ["-8%", "100%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Viewfinder corner brackets — pulled in from the literal square
                corners since VipBox clips to a circle while active; at the
                true corners these would sit entirely outside that mask.
                The one piece of "HUD" kept beyond the sweep and status
                text: on their own they already read as "targeting a face"
                without needing the coordinate readout the old design also
                had here. */}
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
              {[
                "M20,30 L20,20 L30,20",
                "M70,20 L80,20 L80,30",
                "M80,70 L80,80 L70,80",
                "M30,80 L20,80 L20,70",
              ].map((d) => (
                <motion.path
                  key={d}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}

              {/* Iris rings, fading in once "Facial Mapping" starts — the
                  one cue that's specifically about a *face* (not just a
                  generic framed object), so it stays even in the
                  minimalist pass. */}
              <motion.g animate={{ opacity: showMesh ? 1 : 0 }} transition={{ duration: 0.5 }}>
                {showIris &&
                  EYES.map((eye, i) => (
                    <motion.circle
                      key={`iris-${i}`}
                      cx={eye.x}
                      cy={eye.y}
                      r="3.2"
                      fill="none"
                      stroke={color}
                      strokeWidth="0.5"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.85 }}
                      transition={{ duration: 0.4 }}
                      style={{ transformOrigin: `${eye.x}px ${eye.y}px` }}
                    />
                  ))}
              </motion.g>
            </svg>

            {/* Status label + confidence readout */}
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center gap-1 sm:bottom-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={status}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-white drop-shadow sm:text-[0.65rem]"
                >
                  {status}
                </motion.p>
              </AnimatePresence>
              <p
                className="text-[0.5rem] font-semibold uppercase tracking-[0.15em] sm:text-[0.6rem]"
                style={{ color }}
              >
                Confidence: {Math.round(pct)}%
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {verified && (
        <motion.div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.span
            className="absolute aspect-square w-1/2 rounded-full bg-gold-400/50"
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.45 }}
            className="grid aspect-square w-1/4 place-items-center rounded-full border-2 border-emerald-400 bg-emerald-500/20"
            style={{ boxShadow: "0 0 24px 4px rgba(52,211,153,0.5)" }}
          >
            <Check className="h-1/2 w-1/2 text-emerald-300" strokeWidth={3} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-emerald-300 drop-shadow sm:text-xs"
          >
            Identity Verified
          </motion.p>
        </motion.div>
      )}
    </>
  );
}
