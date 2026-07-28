import { motion } from "framer-motion";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

// Same diagonal-wipe language as the rest of the site (lib/wipe.js's
// revealClip/hideClip), but reshaped to land on an exact 0%/100%
// rectangle at the end of the sweep. The site's originals settle a few
// percent short of the far edge, which is invisible there — driven by
// scroll, they pass through their "done" value for a single frame before
// the next segment takes over. This reveal instead HOLDS at "done" for
// several seconds, so that same shortfall would sit onscreen as a
// permanent sliver of whatever's behind. Shrinking the slant to 0 as p
// nears its endpoint keeps the sweep but closes the gap.
const SLANT = 14;

function wipeIn(p) {
  const lead = p * 100;
  const trail = Math.max(0, lead - SLANT * (1 - p));
  return `polygon(0% 0%, ${lead}% 0%, ${trail}% 100%, 0% 100%)`;
}

function wipeOut(p) {
  const lead = p * 100;
  const trail = Math.max(0, lead - SLANT * (1 - p));
  return `polygon(${lead}% 0%, 100% 0%, 100% 100%, ${trail}% 100%)`;
}

// The "you're recognized" beat — takes over the whole screen the instant
// a scan completes, before that VIP's box ever settles into its corner,
// so the moment reads as a deliberate reveal rather than a box quietly
// sliding away. Styled after a warm editorial hero: one full-bleed
// portrait dissolving into a shared, neutral canvas rather than sitting
// in its own hard-edged panel, with a short, minimal block of copy
// alongside it instead of a wall of text.
export default function VipSpotlight({ vip }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-paper-50"
      initial={{ clipPath: wipeIn(0) }}
      animate={{ clipPath: wipeIn(1) }}
      exit={{ clipPath: wipeOut(1) }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex h-full w-full flex-col sm:flex-row">
        <div className="relative h-[46vh] w-full shrink-0 sm:h-full sm:w-[58%]">
          <img
            src={vip.image}
            alt={vip.name}
            className="h-full w-full object-cover object-[center_18%] sm:object-center"
          />
          <div className="pointer-events-none absolute inset-0 [background:linear-gradient(to_bottom,transparent_58%,var(--color-paper-50)_100%)] sm:[background:linear-gradient(to_right,transparent_60%,var(--color-paper-50)_100%)]" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center gap-4 px-8 py-8 sm:py-0 sm:pr-16 sm:pl-2 lg:pr-24">
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
            {vip.name}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500 sm:text-base">{LOREM}</p>
        </div>
      </div>
    </motion.div>
  );
}
