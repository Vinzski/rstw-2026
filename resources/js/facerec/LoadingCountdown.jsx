import { motion } from "framer-motion";
import { ScanFace } from "lucide-react";

// How long the ring takes to sweep one full lap — standing in for a real
// countdown number: nothing here is actually counting anything down, but
// a ring filling all the way around reads as "winding up to start" just
// as clearly as digits would, without needing a number that'd have to be
// kept in sync with anything real.
export const COUNTDOWN_DURATION_S = 2.6;

const RING_SIZE = 168;
const STROKE = 5;
const RADIUS = (RING_SIZE - STROKE) / 2;

// Plays once, right before the first VIP's scan actually starts — see
// FaceRecognitionPage's "countdown" phase. A dark, full-screen beat on
// purpose: the rest of the kiosk reads as a bright paper-toned panel, so
// this one moment of a glowing ring against near-black is what sells
// "the system is booting up" before that panel appears under it.
export default function LoadingCountdown() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy-950"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="bg-grid absolute inset-0 opacity-40" />

      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0 -rotate-90">
          {/* Faint track the sweep fills in around — without it the sweep
              alone doesn't read as "a ring" until it's already most of
              the way around. */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(245,160,81,0.15)"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-orange-500)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: COUNTDOWN_DURATION_S, ease: "linear" }}
            style={{
              filter: "drop-shadow(0 0 4px var(--color-orange-500)) drop-shadow(0 0 14px var(--color-orange-500))",
            }}
          />
        </svg>

        <motion.div
          className="absolute inset-0 grid place-items-center"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ScanFace className="h-12 w-12 text-orange-200" strokeWidth={1.5} />
        </motion.div>
      </div>

      <motion.p
        className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200/80"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        Initializing Check-In
      </motion.p>
    </motion.div>
  );
}
