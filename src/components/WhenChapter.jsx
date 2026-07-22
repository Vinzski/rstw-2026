import { MapPin } from "lucide-react";
import { motion, useTransform } from "framer-motion";
import Countdown from "./Countdown";
import KineticText from "./KineticText";
import { mapRange } from "../lib/scroll";
import { whenWhere } from "../data/content";
import { WeaveBand } from "./decor/Decor";

// One hero, everything else a backup: "12—14" is the single thing this
// chapter is about, so it dominates the frame and stays put for the
// chapter's whole run — eyebrow, month, the "One region..." line, the
// live countdown, and the venue are all small satellites that take turns
// appearing around it, never competing with it for size.
//
// No entrance for the hero or eyebrow — the Highlights chapter's exit
// dive (through the "o" of "Demos") IS this chapter's entrance: the
// destination has to already be sitting there, settled, for the reveal
// through that glyph to land on it.
export default function WhenChapter({ progress, bgY, fgY }) {
  const monthOpacity = useTransform(progress, (p) => mapRange(p, 0.14, 0.24, 0, 1));
  const statementOpacity = useTransform(progress, (p) => mapRange(p, 0.24, 0.36, 0, 1));
  const countdownOpacity = useTransform(progress, (p) => mapRange(p, 0.38, 0.52, 0, 1));
  const countdownScale = useTransform(progress, (p) => mapRange(p, 0.38, 0.54, 0.85, 1));
  const venueOpacity = useTransform(progress, (p) => mapRange(p, 0.56, 0.68, 0, 1));

  const bgScale = useTransform(progress, (p) => mapRange(p, 0, 1, 1, 1.45));

  return (
    <>
      <motion.div style={{ scale: bgScale, y: bgY }} className="absolute inset-0">
        <div className="bg-grid absolute inset-0 opacity-45" />
        <div className="animate-blob absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/12 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-paper-100 via-white to-paper-50" />
        <div className="noise-veil" />
      </motion.div>

      <motion.div style={{ y: fgY }} className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.35em] text-orange-600">
          {whenWhere.eyebrow}
        </p>

        <h2 className="text-gradient font-display text-center text-[6rem] font-bold leading-none sm:text-[10rem] md:text-[13rem]">
          {whenWhere.dayRange}
        </h2>

        <motion.p
          style={{ opacity: monthOpacity }}
          className="mt-1 font-display text-base font-medium tracking-[0.25em] text-slate-600 sm:text-lg"
        >
          <KineticText text={whenWhere.monthYear} progress={progress} start={0.16} />
        </motion.p>

        <motion.p
          style={{ opacity: statementOpacity }}
          className="mt-4 max-w-md text-center text-sm text-slate-500 sm:text-base"
        >
          {whenWhere.statement}
        </motion.p>

        <motion.div style={{ opacity: countdownOpacity, scale: countdownScale }} className="mt-8">
          <Countdown />
        </motion.div>

        <motion.div style={{ opacity: venueOpacity }} className="mt-6 flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
            <MapPin className="h-3.5 w-3.5 text-orange-600" />
            {whenWhere.venueLabel}
          </p>
          <WeaveBand color="orange" className="h-2 w-32 rounded-full opacity-70 sm:w-44" />
        </motion.div>
      </motion.div>
    </>
  );
}
