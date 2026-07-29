import { useEffect, useState } from "react";

// Real pixel geometry for the whole stage (not percentages), recomputed
// on resize. Everything is plain numbers so framer-motion's `layout`
// prop can FLIP-animate a VipBox between its idle/active/done row
// positions with zero CSS transform tricks fighting the transform
// Motion itself applies during that animation. The row card never
// resizes into the final merge circle (see FuseOrb) — only fades out
// in place — so `fuseSize` is a separate, unrelated dimension.
//
// All `count` VIPs sit in a single centered horizontal row, left to
// right in scan order. There's no header/title/progress-bar chrome
// around the stage anymore, so the slot size is driven up as large as
// the viewport allows — capped by whichever of width or height (minus
// room for each slot's own name/status label below it) runs out first.
//
// Slots are portrait rectangles (a camera viewfinder, not a headshot
// square) — ASPECT is width/height, so 1 would be a square and smaller
// values get taller and narrower.
const ASPECT = 0.78;

export function useStageMetrics(count) {
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

  const marginX = isNarrow ? 20 : isMid ? 48 : 80;
  const marginY = isNarrow ? 28 : isMid ? 40 : 56;
  const labelSpace = isNarrow ? 48 : isMid ? 54 : 60; // room for the name/status text under each slot
  let gap = isNarrow ? 14 : isMid ? 24 : 36;

  const maxRowWidth = w - marginX * 2;
  const availableHeight = h - marginY * 2;
  const maxSlotHeight = availableHeight - labelSpace;

  // Start from a generous desired height and shrink only as far as
  // either constraint actually forces — this is what "maximize the
  // space" means here: as big as fits, not a fixed size that happens to
  // fit often.
  let slotHeight = Math.min(isNarrow ? 320 : isMid ? 500 : 660, maxSlotHeight);
  let slotWidth = slotHeight * ASPECT;

  let rowWidth = count * slotWidth + (count - 1) * gap;
  if (rowWidth > maxRowWidth) {
    const scale = maxRowWidth / rowWidth;
    slotWidth *= scale;
    slotHeight *= scale;
    gap *= scale;
    rowWidth = maxRowWidth;
  }

  // The merge orb is a genuinely separate circular element (see
  // FuseOrb), not the row card resized — sized off the card's shorter
  // side so it reads proportionate to it without inheriting its
  // portrait aspect ratio.
  const fuseSize = Math.min(slotWidth, slotHeight) * 0.6;
  // Center the slot+label block as a whole within the available height,
  // rather than just the slot — otherwise the label's reserved space
  // pushes the row visibly above true center.
  const blockTop = marginY + (availableHeight - (slotHeight + labelSpace)) / 2;
  const centerY = blockTop + slotHeight / 2;
  const startX = w / 2 - rowWidth / 2 + slotWidth / 2;

  const slots = Array.from({ length: count }, (_, i) => ({
    x: startX + i * (slotWidth + gap),
    y: centerY,
  }));

  const center = { x: w / 2, y: centerY };

  return { slotWidth, slotHeight, fuseSize, slots, center, viewport };
}
