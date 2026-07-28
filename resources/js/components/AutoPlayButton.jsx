import { AnimatePresence, motion } from "framer-motion";
import { Play, Square } from "lucide-react";

// Floating pill button that starts/stops the auto-tour. Shares the same
// visibility rule as the Navbar while playing (hidden unless the mouse
// just moved) so the chrome fades away together into an unobstructed,
// self-driving view instead of one control lingering after the other's
// gone.
export default function AutoPlayButton({ isPlaying, controlsVisible, onStart, onStop, hidden = false }) {
  const visible = !hidden && (!isPlaying || controlsVisible);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={isPlaying ? onStop : onStart}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-navy-900/15 bg-paper-50/85 py-2 pl-4 pr-5 text-ink shadow-sm backdrop-blur-xl transition-colors duration-300 hover:border-orange-500/50 lg:bottom-10"
          aria-label={isPlaying ? "Stop the auto tour" : "Play the auto tour"}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-900/[0.06]">
            {isPlaying ? (
              <Square className="h-3 w-3 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">
            {isPlaying ? "Stop" : "Play"}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
