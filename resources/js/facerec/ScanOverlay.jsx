import { useEffect, useState } from "react";
import { motion, animate, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

// Total time for the confidence readout to climb 0 → 100%, at which
// point the scan auto-resolves as verified. Standing in for a real
// face-match call — swap `onDone` to fire from that response instead of
// this timeline once the real recognition backend exists.
export const SCAN_DURATION = 4.3;
const VERIFIED_HOLD_MS = 800;
const SCAN_SOUND_SRC = "/audio/HUD Activation Sound Effect.mp3";

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

export default function ScanOverlay({ onDone }) {
  const [pct, setPct] = useState(0);
  const [verified, setVerified] = useState(false);
  const [coords, setCoords] = useState({ x: 512.0, y: 288.0 });

  useEffect(() => {
    const controls = animate(0, 100, {
      duration: SCAN_DURATION,
      ease: "easeInOut",
      onUpdate: setPct,
      onComplete: () => setVerified(true),
    });
    return () => controls.stop();
  }, []);

  // Plays once for this VIP's scan, starting the instant their overlay
  // mounts. Left to ring out on its own past verification — only cut
  // short if this VIP's turn ends before the clip finishes.
  useEffect(() => {
    const sound = new Audio(SCAN_SOUND_SRC);
    sound.play().catch(() => {});
    return () => sound.pause();
  }, []);

  // Jittering fake coordinates — reads as "actively measuring," no
  // real tracking data behind it.
  useEffect(() => {
    if (verified) return;
    const id = setInterval(() => {
      setCoords({ x: 420 + Math.random() * 180, y: 210 + Math.random() * 140 });
    }, 160);
    return () => clearInterval(id);
  }, [verified]);

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
            {/* Sweeping scan lines — horizontal + vertical, looping the whole scan */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-8"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, rgba(245,160,81,0.8) 45%, rgba(255,255,255,0.95) 50%, rgba(245,160,81,0.8) 55%, transparent)",
                boxShadow: "0 0 14px 3px rgba(245,160,81,0.5)",
              }}
              initial={{ top: "-8%" }}
              animate={{ top: ["-8%", "100%"] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute inset-y-0 w-8"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(227,169,79,0.65) 45%, rgba(255,255,255,0.8) 50%, rgba(227,169,79,0.65) 55%, transparent)",
                boxShadow: "0 0 14px 3px rgba(227,169,79,0.4)",
              }}
              initial={{ left: "-8%" }}
              animate={{ left: ["-8%", "100%"] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />

            {/* Viewfinder corner brackets — pulled in from the literal square
                corners since VipBox clips to a circle while active; at the
                true corners these would sit entirely outside that mask. */}
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
                  stroke="rgba(245,160,81,0.7)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}

              {/* Iris rings, fading in once "Facial Mapping" starts */}
              <motion.g animate={{ opacity: showMesh ? 1 : 0 }} transition={{ duration: 0.5 }}>
                {showIris &&
                  EYES.map((eye, i) => (
                    <motion.circle
                      key={`iris-${i}`}
                      cx={eye.x}
                      cy={eye.y}
                      r="3.2"
                      fill="none"
                      stroke="#e3a94f"
                      strokeWidth="0.5"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.85 }}
                      transition={{ duration: 0.4 }}
                      style={{ transformOrigin: `${eye.x}px ${eye.y}px` }}
                    />
                  ))}
              </motion.g>
            </svg>

            {/* Coordinate readout — centered near the top rather than pinned
                to a literal corner, so it stays inside the circular mask. */}
            <div className="pointer-events-none absolute inset-x-0 top-[10%] text-center font-mono text-[0.5rem] leading-tight text-orange-200/70 sm:text-[0.6rem]">
              <p>X:{coords.x.toFixed(1)} Y:{coords.y.toFixed(1)}</p>
            </div>

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
              <p className="text-[0.5rem] font-semibold uppercase tracking-[0.15em] text-orange-200/80 sm:text-[0.6rem]">
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
