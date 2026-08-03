import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FusionFlash from "./FusionFlash";

const MERGE_S = 0.9;
const FLASH_HOLD_MS = 700;
// The resting logo fills the exact same footprint as the VIP's own
// circular photo (see useStageMetrics' circleSize) — not a small badge
// lost in the middle of a much bigger circle. Once merging, it shrinks
// to this fraction of that size so the two marks can sit side by side
// without swallowing the screen between them.
const MERGE_SCALE_RATIO = 0.42;
// A little more than one merged-logo-width apart, so the pair reads as
// two marks meeting rather than overlapping into a smear.
const SEPARATION_FACTOR = 1.15;

// Mounted the instant both VIPs verify (see FaceRecognitionPage's
// "reveal" phase) — each VIP's own institutional logo sits dead center
// of their half, sized to match their circular photo exactly and
// directly behind it (a lower z-index than VipBox's own circle, which is
// why it stays hidden under it at first). It's already there, in place,
// before "clearing" fades that photo away and reveals it. While `covered`
// (still behind/under the fading photo — "reveal" and "clearing"), it's
// clipped to that same circle so a squared-off mark like DOST's doesn't
// poke its corners out past the photo's round edge; once the photo's
// fully gone, `covered` drops and the logo shows its own true shape
// again, uncropped. Only once the parent flips `merging` true (the
// "merging" phase, once the panels have fully cleared) do the two marks
// shrink and slide together, with a bloom marking the moment they meet —
// reading as "the two check-ins combining into one result," not a
// generic transition — before the white hand-off to the real landing
// page (App), which plays its own boot Loader on mount.
export default function LogoFusion({ vips, metrics, merging, covered, onDone }) {
  const [flashed, setFlashed] = useState(false);
  const { slots, center, circleSize } = metrics;

  const finalSize = circleSize * MERGE_SCALE_RATIO;
  const travel = Math.max(center.x - slots[0].x - (finalSize * SEPARATION_FACTOR) / 2, 0);

  useEffect(() => {
    if (!merging) return;
    const t = setTimeout(() => setFlashed(true), MERGE_S * 1000);
    return () => clearTimeout(t);
  }, [merging]);

  useEffect(() => {
    if (!flashed) return;
    const t = setTimeout(onDone, FLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [flashed, onDone]);

  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[5]" exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
      {/* `object-contain` always — the whole mark scales to fit inside
          its own box and never overflows it, so a squared-off shape like
          DOST's four petals sits fully inside the frame instead of
          getting cropped at the edges the way `object-cover` would (the
          province seal happens to already be a tight circular crop, so
          it looks the same either way). The rounded-full clip on top of
          that only matters while `covered` — with `object-contain`
          already keeping everything inside the box, it's mostly a no-op,
          but still marks "this is paired with the photo in front of it"
          before the logo goes back to standing on its own once
          uncovered. */}
      {vips.map((vip, i) => {
        const slot = slots[i];
        const x = merging ? (i === 0 ? travel : -travel) : 0;
        return (
          <motion.div
            key={vip.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-xl ${covered ? "overflow-hidden rounded-full" : ""}`}
            style={{ left: slot.x, top: slot.y, width: circleSize, height: circleSize }}
            animate={{ scale: merging ? MERGE_SCALE_RATIO : 1, x }}
            transition={{ duration: MERGE_S, ease: "easeInOut" }}
          >
            <img src={vip.logo} alt="" aria-hidden="true" className="h-full w-full object-contain" />
          </motion.div>
        );
      })}

      {/* The instant the two marks meet: the same bloom used to mark the
          old convergence, reused here for a pair of static marks instead
          of four color orbs. */}
      {flashed && <FusionFlash />}
    </motion.div>
  );
}
