import { useEffect, useState } from "react";

// Real pixel geometry for the whole stage (not percentages), recomputed
// on resize. Everything is plain numbers so framer-motion's `layout`
// prop can FLIP-animate a VipBox between "resting in its corner" and
// "lifted to center to scan" with zero CSS transform tricks fighting
// the transform Motion itself applies during that animation.
//
// The four "done" slots live in the four screen corners, filled in scan
// order UL → UR → LR → LL — one clockwise lap, i.e. an actual circle
// motion rather than a diagonal skip. `center`/`rx`/`ry` describe the
// ellipse that passes exactly through all four corner points (see
// CornerRing), defined around their own midpoint rather than the true
// viewport center.
export function useStageMetrics() {
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    function onResize() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { w, h } = viewport;
  const isNarrow = w < 640;
  const isMid = w < 1024;

  const bigSize = isNarrow ? 220 : isMid ? 300 : 380;
  const smallSize = isNarrow ? 108 : isMid ? 150 : 190;

  const marginX = isNarrow ? 50 : isMid ? 80 : 120;
  const marginTop = isNarrow ? 70 : isMid ? 90 : 110;
  const marginBottom = isNarrow ? 60 : isMid ? 80 : 100;

  const leftX = marginX + smallSize / 2;
  const rightX = w - marginX - smallSize / 2;
  const topY = marginTop + smallSize / 2;
  const bottomY = h - marginBottom - smallSize / 2;

  // Scan order: index 0 → upper-left, 1 → upper-right, 2 → lower-right,
  // 3 → lower-left.
  const corners = [
    { x: leftX, y: topY },
    { x: rightX, y: topY },
    { x: rightX, y: bottomY },
    { x: leftX, y: bottomY },
  ];

  const center = { x: (leftX + rightX) / 2, y: (topY + bottomY) / 2 };
  const rx = (rightX - leftX) / 2;
  const ry = (bottomY - topY) / 2;

  return { bigSize, smallSize, center, corners, rx, ry, viewport };
}
