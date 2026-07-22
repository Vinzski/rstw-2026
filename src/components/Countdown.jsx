import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { whenWhere } from "../data/content";

const TARGET_TIME = new Date(whenWhere.target).getTime();

function getTimeLeft() {
  const diff = Math.max(0, TARGET_TIME - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function FlipDigit({ char }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62ch] overflow-hidden align-middle">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={{ y: "55%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-55%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function CountdownBox({ label, value, minDigits = 2 }) {
  const chars = String(value).padStart(minDigits, "0").split("");
  return (
    <div className="group relative flex w-[4.2rem] flex-col items-center gap-1 rounded-2xl bg-navy-900 px-2 py-3 shadow-lg shadow-navy-900/25 transition-transform duration-300 hover:-translate-y-0.5 sm:w-20 sm:py-4">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(245,160,81,0.28), transparent 70%)",
        }}
      />
      <span className="font-display relative flex text-2xl font-semibold tabular-nums text-white sm:text-3xl">
        {chars.map((c, i) => (
          <FlipDigit char={c} key={i} />
        ))}
      </span>
      <span className="relative text-[0.62rem] font-medium uppercase tracking-[0.18em] text-gold-400">
        {label}
      </span>
    </div>
  );
}

export default function Countdown() {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { label: "Days", value: time.days, minDigits: 2 },
    { label: "Hours", value: time.hours, minDigits: 2 },
    { label: "Minutes", value: time.minutes, minDigits: 2 },
    { label: "Seconds", value: time.seconds, minDigits: 2 },
  ];

  return (
    <div className="flex items-start justify-center gap-2.5 sm:gap-4">
      {units.map((u) => (
        <CountdownBox key={u.label} {...u} />
      ))}
    </div>
  );
}
