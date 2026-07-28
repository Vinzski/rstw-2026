import { motion } from "framer-motion";

// How long a simulated scan takes before it auto-resolves as verified.
// Standing in for a real face-match call — swap `onDone` to fire from
// that response instead of this ring's own completion once the real
// recognition backend exists.
export const SCAN_DURATION = 3.2;

const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

// The ring drawn over the live camera feed while a guest is being
// "scanned" — sweeps a full lap over SCAN_DURATION and calls `onDone`
// (the parent's verify handler) the instant it closes. Kept neutral
// gray rather than the VIP's own color: it's reading as "processing,"
// not an identity yet — that color only shows up once they're verified.
export default function ScanOverlay({ onDone }) {
  return (
    <>
      <div className="absolute inset-0 bg-navy-900/15" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="#9ca3af"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: SCAN_DURATION, ease: "linear" }}
          onAnimationComplete={onDone}
        />
      </svg>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-0 bottom-1.5 text-center text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-white drop-shadow"
      >
        Scanning
      </motion.div>
    </>
  );
}
