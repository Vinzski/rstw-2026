import { useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLenisRef } from "../lib/lenisContext";
import { scrollToChapter } from "../lib/navigate";

const DOT_H = 16;
const GAP = 12;
const RAIL_W = 24;

// A gently winding trail rather than a straight vertical line — sampled
// as a dense polyline (not bezier math) so it reads as a smooth curve
// without any curve-control-point bugs to chase. The traveling marker
// riding this path (via CSS offset-path) is the "you are here, still
// walking" read: the whole nav is a path being walked, not a static list.
function buildTrail(height, waves, amplitude) {
  const steps = 48;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;
    const x = RAIL_W / 2 + Math.sin(t * Math.PI * waves) * amplitude;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d.trim();
}

export default function ProgressRail({ chapters, active, stepOverride, hidden = false }) {
  const { scrollYProgress } = useScroll();
  const lenisRef = useLenisRef();
  const activeIndex = Math.max(
    0,
    chapters.findIndex((c) => c.id === active),
  );
  // The auto-tour visits more distinct stops than there are top-level
  // chapters (each of Pillars'/Highlights' 4 beats is its own stop) — while
  // it's driving, show its own count instead of the chapter-level one so
  // the number on screen matches what's actually being counted through.
  const displayIndex = stepOverride ? stepOverride.index : activeIndex + 1;
  const displayTotal = stepOverride ? stepOverride.total : chapters.length;

  const railHeight = chapters.length * DOT_H + (chapters.length - 1) * GAP;
  const trailPath = useMemo(() => buildTrail(railHeight, 2.6, 6), [railHeight]);
  const markerDistance = useTransform(scrollYProgress, (p) => `${p * 100}%`);

  function goTo(id) {
    scrollToChapter(id, lenisRef?.current);
  }

  return (
    <>
      <motion.div
        className="fixed inset-x-0 top-0 z-40 h-[2px] origin-left bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700"
        style={{ scaleX: scrollYProgress }}
      />

      <motion.div
        className="pointer-events-none fixed bottom-6 left-6 z-40 hidden flex-col gap-1.5 font-display text-ink sm:flex lg:bottom-10 lg:left-10"
        animate={{ opacity: hidden ? 0 : 1, y: hidden ? -16 : 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="text-2xl font-semibold tabular-nums leading-none">
          {String(displayIndex).padStart(2, "0")}
        </span>
        <span className="h-px w-6 bg-navy-900/20" />
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
          {String(displayTotal).padStart(2, "0")}
        </span>
      </motion.div>

      <motion.div
        className="pointer-events-none fixed bottom-6 right-6 z-40 hidden sm:block lg:right-10"
        style={{ width: RAIL_W, height: railHeight }}
        animate={{ opacity: hidden ? 0 : 1, y: hidden ? -16 : 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg
          aria-hidden="true"
          width={RAIL_W}
          height={railHeight}
          viewBox={`0 0 ${RAIL_W} ${railHeight}`}
          className="absolute inset-0"
        >
          <path d={trailPath} fill="none" stroke="rgba(12,26,51,0.14)" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" />
        </svg>

        {/* The traveling marker — rides the winding trail via CSS
            offset-path/offset-distance, driven by overall scroll
            progress, so the nav itself visibly "walks" instead of just
            listing chapters. */}
        <motion.span
          aria-hidden="true"
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500"
          style={{
            offsetPath: `path('${trailPath}')`,
            offsetDistance: markerDistance,
            offsetRotate: "0deg",
            boxShadow: "0 0 8px 2px rgba(245,160,81,0.55)",
          }}
        />

        <div className={`flex flex-col items-center ${hidden ? "pointer-events-none" : "pointer-events-auto"}`} style={{ gap: GAP }}>
          {chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo(c.id)}
              aria-label={`Go to ${c.label}`}
              className="group relative flex items-center justify-center"
              style={{ height: DOT_H, width: DOT_H }}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  active === c.id
                    ? "scale-[1.7] bg-orange-500"
                    : "bg-navy-900/20 group-hover:bg-navy-900/40"
                }`}
              />
              <span className="pointer-events-none absolute right-6 whitespace-nowrap rounded-md bg-ink/90 px-2 py-1 text-[0.65rem] font-medium text-paper-50 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}
