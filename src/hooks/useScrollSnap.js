import { useEffect, useRef } from "react";
import { useMotionValueEvent } from "framer-motion";
import { progressToScrollY } from "../lib/navigate";

const SETTLE_DELAY_MS = 240;
const SNAP_DURATION = 0.2;
const EPSILON = 0.002;

// If the user stops scrolling while sitting in a gap between two "clear"
// zones — mid-crossfade, nothing fully in focus, exactly the spot that's
// hard to land on precisely on purpose — nudge them the rest of the way to
// whichever clear zone they were heading toward (forward if they were
// scrolling down, back if up) instead of leaving them stranded having to
// hand-tune the scroll position themselves.
//
// Does nothing while the user is actively scrolling, and does nothing if
// they're already inside a zone (including one that's still mid-reveal
// internally, like About's stat cards) — it only acts on genuine dead air.
//
// Also does nothing while `disabled` — the auto-tour deliberately lands
// just past each chapter's entrance fade (matching a nav-click), which
// for a narrow chapter can sit just outside that chapter's own defined
// clear zone; left enabled, this hook would then "correct" the tour's own
// landing spot ~240ms after it arrives, reading as a stutter mid-transition.
// The tour already knows exactly where it wants to be, so it disables this
// while it's driving rather than fighting it.
export default function useScrollSnap(progress, zones, lenisRef, disabled = false) {
  const directionRef = useRef(1);
  const lastPRef = useRef(progress.get());
  const timerRef = useRef(null);
  const snappingRef = useRef(false);

  useMotionValueEvent(progress, "change", (p) => {
    const last = lastPRef.current;
    if (p > last) directionRef.current = 1;
    else if (p < last) directionRef.current = -1;
    lastPRef.current = p;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (disabled) return;
    timerRef.current = setTimeout(() => {
      const settledP = lastPRef.current;
      if (settledP <= 0 || settledP >= 1 || snappingRef.current) return;

      const inZone = zones.some((z) => settledP >= z.start - EPSILON && settledP <= z.end + EPSILON);
      if (inZone) return;

      const direction = directionRef.current;
      const target =
        direction >= 0
          ? zones.find((z) => z.start > settledP)?.start
          : [...zones].reverse().find((z) => z.end < settledP)?.end;
      if (target == null) return;

      const targetY = progressToScrollY(target);
      if (targetY == null) return;

      snappingRef.current = true;
      const lenis = lenisRef?.current;
      if (lenis) {
        lenis.scrollTo(targetY, {
          duration: SNAP_DURATION,
          onComplete: () => {
            snappingRef.current = false;
          },
        });
      } else {
        window.scrollTo({ top: targetY, behavior: "smooth" });
        snappingRef.current = false;
      }
    }, SETTLE_DELAY_MS);
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
