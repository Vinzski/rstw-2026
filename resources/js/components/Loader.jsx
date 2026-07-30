import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BOOT_DURATION_MS } from "../lib/bootTiming";

const RING_R = 90;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const LOAD_DURATION_MS = BOOT_DURATION_MS; // shared with RstwAssembly, so its circling pieces land in sync with this countdown

export default function Loader({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    let raf;
    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / LOAD_DURATION_MS, 1);
      setProgress(t * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (progress >= 100 && !doneRef.current) {
      doneRef.current = true;
      const t = setTimeout(() => setLeaving(true), 420);
      return () => clearTimeout(t);
    }
  }, [progress]);

  const secondsLeft = Math.max(0, Math.ceil(((100 - progress) / 100) * 10));
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);
  const angle = -90 + (progress / 100) * 360;

  return (
    <motion.div
      data-testid="loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper-50"
      initial={false}
      animate={leaving ? { clipPath: "circle(0% at 50% 50%)" } : { clipPath: "circle(150% at 50% 50%)" }}
      transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        if (leaving) onDone();
      }}
    >
      <div className="bg-motif-texture absolute inset-0 opacity-50" />
      <div className="noise-veil" />
      <div className="animate-blob absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/15 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="relative h-44 w-44 sm:h-52 sm:w-52">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke="rgba(12,26,51,0.09)"
              strokeWidth="1.5"
            />
            <circle
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke="url(#loaderGradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
            <defs>
              <linearGradient id="loaderGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f0c479" />
                <stop offset="35%" stopColor="#f5a051" />
                <stop offset="70%" stopColor="#ee8b3b" />
                <stop offset="100%" stopColor="#dd6a2e" />
              </linearGradient>
            </defs>
          </svg>

          {/* Orbiting marker tracing the progress ring */}
          <div
            className="absolute inset-0"
            style={{ transform: `rotate(${angle}deg)`, transition: "transform 80ms linear" }}
          >
            <span
              className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500"
              style={{ boxShadow: "0 0 12px 3px rgba(245,160,81,0.75)" }}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {/* `key={secondsLeft}` remounts both spans every tick, so
                their own initial→animate replays fresh each second: a
                soft ring pings outward and fades (the "beat"), while the
                number itself springs from oversized back down to normal
                — not just a swap, an actual thump in time with the count. */}
            <motion.span
              key={`ping-${secondsLeft}`}
              className="absolute h-16 w-16 rounded-full bg-orange-400/50 sm:h-20 sm:w-20"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            <motion.span
              key={secondsLeft}
              initial={{ scale: 1.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 11 }}
              className="relative font-display text-4xl font-semibold tabular-nums text-ink sm:text-5xl"
            >
              {secondsLeft}
            </motion.span>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-navy-900/5">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
