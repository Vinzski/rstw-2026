import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FusionFlash from "./FusionFlash";

const MERGE_S = 0.9;
const FLASH_HOLD_MS = 700;

// After the two marks have met and flashed, the pair slides off-center to
// the left and the credit line draws out from behind them to the right,
// so the logos read as the thing the sentence is about rather than
// decoration next to it. The line is revealed by a clip opening
// left-to-right rather than by sliding an opaque block out from under
// them — these are transparent PNGs on a light background, so there's
// nothing solid for text to actually hide behind.
const SHIFT_S = 0.8;
const CREDIT_DELAY_S = 0.35; // lets the pair start clearing the space first
const CREDIT_S = 0.9;
const CREDIT_HOLD_MS = 1500; // the requested beat to actually read it
const CREDIT_LINE =
  "The Department of Science and Technology and Dipolog City, collaborating to bring you today's event.";
// The resting logo fills the exact same footprint as the VIP's own
// circular photo (see useStageMetrics' circleSize) — not a small badge
// lost in the middle of a much bigger circle. Once merging, it shrinks
// to this fraction of that size so the two marks can sit side by side
// without swallowing the screen between them.
const MERGE_SCALE_RATIO = 0.55;
// A little more than one merged-logo-width apart, so the pair reads as
// two marks meeting rather than overlapping into a smear.
const SEPARATION_FACTOR = 1.15;

// Mounted from the "waiting" phase onward (see FaceRecognitionPage) so
// each VIP's own institutional logo is already sitting dead center of
// their half — sized to match their circular photo exactly and directly
// behind it (a lower z-index than VipBox's own circle) — the instant
// `verified` flips true for them, in the same render as VipBox starts
// that photo's own wipe-reveal (and its own small logo badge right on the
// photo — see VipBox — so the logo reads as shown immediately, not hidden
// until later; this full-size copy is just staged for the eventual merge).
// Mounting it any later left a window where the photo was still mid-wipe
// with nothing behind it yet, so the logo would visibly pop in partway
// through instead of the two reading as one reveal. While `covered`
// (still behind/under the photo — "waiting" through "reveal"), it's
// clipped to that same circle so a squared-off
// mark like DOST's doesn't poke its corners out past the photo's round
// edge. `covered` drops the instant the photo starts fading ("clearing"),
// and the clip animates open over `uncoverS` (matching the photo's own
// fade duration) rather than snapping open — DOST's corners are square
// right up to the frame's edge, so an instant, untransitioned clip
// removal used to pop them into view in a single frame, reading as a
// stray cut across the mark. Animating the two together means the mark
// has already grown its full shape by the moment the photo has finished
// fading, instead of popping afterward. Only once the parent flips
// `merging` true (the "merging" phase, once the panels have fully
// cleared) do the two marks shrink and slide together, with a bloom
// marking the moment they meet — reading as "the two check-ins combining
// into one result," not a generic transition — before the white hand-off
// to the real landing page (App), which plays its own boot Loader on
// mount.
export default function LogoFusion({ vips, metrics, verified, merging, covered, uncoverS, onDone }) {
  const [flashed, setFlashed] = useState(false);
  const [shifted, setShifted] = useState(false);
  const { slots, center, circleSize, viewport } = metrics;

  const finalSize = circleSize * MERGE_SCALE_RATIO;
  const travel = Math.max(center.x - slots[0].x - (finalSize * SEPARATION_FACTOR) / 2, 0);

  // Where the pair ends up once it steps aside, and where the line sits
  // beside it. Sized off the viewport rather than fixed pixels so the
  // sentence keeps sensible line lengths on any screen this runs on, and
  // `shiftX` is derived so that logos + gap + text end up centered as one
  // group — the pair moves left by exactly half of what the text adds.
  const pairWidth = finalSize * (SEPARATION_FACTOR + 1);
  const creditGap = Math.max(48, viewport.w * 0.035);
  const creditWidth = Math.min(820, viewport.w * 0.44);
  const shiftX = (creditGap + creditWidth) / 2;
  const creditLeft = center.x - shiftX + pairWidth / 2 + creditGap;

  useEffect(() => {
    if (!merging) return;
    const t = setTimeout(() => setFlashed(true), MERGE_S * 1000);
    return () => clearTimeout(t);
  }, [merging]);

  useEffect(() => {
    if (!flashed) return;
    const t = setTimeout(() => setShifted(true), FLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [flashed]);

  useEffect(() => {
    if (!shifted) return;
    const t = setTimeout(onDone, (CREDIT_DELAY_S + CREDIT_S) * 1000 + CREDIT_HOLD_MS);
    return () => clearTimeout(t);
  }, [shifted, onDone]);

  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[5]" exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
      {/* `object-contain` always — the whole mark scales to fit inside
          its own box and never overflows it, so nothing ever exceeds the
          box regardless of the clip below (the province seal happens to
          already be a tight circular crop, so `object-contain` alone
          keeps it looking round). DOST's mark fills its box corner to
          corner, though, so it still needs the `borderRadius` clip below
          while `covered` to keep its own corners from poking out past
          the round photo in front of it. That clip is an animated value,
          not a conditional class, so releasing it (once the photo starts
          fading) is a smooth grow-into-place rather than an instant pop. */}
      {vips.map((vip, i) => {
        if (!verified[i]) return null;
        const slot = slots[i];
        const converged = i === 0 ? travel : -travel;
        const x = merging ? converged - (shifted ? shiftX : 0) : 0;
        return (
          <motion.div
            key={vip.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden drop-shadow-xl"
            style={{ left: slot.x, top: slot.y, width: circleSize, height: circleSize }}
            // This VIP is only ever first mounted while `covered` is
            // already true (verifying always happens during "scanning"
            // or "reveal" — never later), so pinning `initial` to that
            // same resting state means the very first render is static,
            // not an entrance animation. Only a real change afterward —
            // `covered` flipping false as the photo starts fading, or
            // `merging` kicking in — actually animates.
            initial={{ scale: 1, x: 0, borderRadius: "50%" }}
            animate={{ scale: merging ? MERGE_SCALE_RATIO : 1, x, borderRadius: covered ? "50%" : "0%" }}
            transition={{
              scale: { duration: MERGE_S, ease: "easeInOut" },
              // The converge and the step-aside are the same property
              // animating twice, so the second leg gets its own (longer,
              // softer) duration once `shifted` flips.
              x: { duration: shifted ? SHIFT_S : MERGE_S, ease: "easeInOut" },
              borderRadius: { duration: uncoverS, ease: "easeInOut" },
            }}
          >
            <img src={vip.logo} alt="" aria-hidden="true" className="h-full w-full object-contain" />
          </motion.div>
        );
      })}

      {/* The instant the two marks meet: the same bloom used to mark the
          old convergence, reused here for a pair of static marks instead
          of four color orbs. */}
      {flashed && <FusionFlash />}

      {/* The credit line, drawn out to the right as the pair steps left.
          `inset(0 100% 0 0)` starts it clipped to nothing at its own left
          edge — which sits just past the logos — and opening that to 0%
          wipes it into view left-to-right, so it reads as emerging from
          behind them. The small x slide underneath gives the wipe some
          travel rather than having the words simply appear in place. */}
      {shifted && (
        <motion.div
          className="absolute -translate-y-1/2"
          style={{ left: creditLeft, top: slots[0].y, width: creditWidth }}
          initial={{ clipPath: "inset(0 100% 0 0)", x: -36, opacity: 0 }}
          animate={{ clipPath: "inset(0 0% 0 0)", x: 0, opacity: 1 }}
          transition={{
            duration: CREDIT_S,
            delay: CREDIT_DELAY_S,
            ease: [0.16, 1, 0.3, 1],
            opacity: { duration: 0.3, delay: CREDIT_DELAY_S },
          }}
        >
          <p className="font-display text-2xl font-medium leading-snug text-ink drop-shadow-sm sm:text-3xl xl:text-4xl">
            {CREDIT_LINE}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
