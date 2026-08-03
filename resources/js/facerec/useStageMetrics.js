import { useEffect, useState } from "react";

// Real pixel geometry for the two VIP panels, recomputed on resize.
// Exactly two slots, each covering one full half of the viewport (full
// height, half width) with no gap or margin between them — together
// they cover the entire screen, edge to edge.
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
  const slotWidth = w / 2;
  const slotHeight = h;

  const slots = [
    { x: slotWidth / 2, y: h / 2 },
    { x: slotWidth + slotWidth / 2, y: h / 2 },
  ];

  const center = { x: w / 2, y: h / 2 };

  // The circular viewfinder's own diameter — centered in its slot, sized
  // well under the slot's shorter dimension so there's room left over
  // below it for the name/title label.
  const circleSize = Math.min(slotWidth, slotHeight) * 0.68;

  return { slotWidth, slotHeight, slots, center, circleSize, viewport };
}
