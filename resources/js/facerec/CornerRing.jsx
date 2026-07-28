import { motion } from "framer-motion";
import { VIPS } from "./data";

// The ellipse that passes exactly through all four corner points: for a
// point at offset (rx, ry) from center to lie on an ellipse with
// semi-axes (Rx, Ry), Rx/Ry must be rx/ry scaled up by √2.
//
// Scan order (UL → UR → LR → LL) is a genuine clockwise lap around the
// perimeter, so each segment just connects one corner to the next in
// that same order. No base/preview ring underneath — a segment only
// exists once BOTH corners it connects are already checked in, so the
// ring never hints at a slot (or a total count of slots) that hasn't
// been revealed yet. The 4th segment closes the loop, completing it at
// the exact moment the last VIP verifies.
const ANGLES = [-135, -45, 45, 135, 225]; // UL, UR, LR, LL, UL (closing)

function pointAt(center, Rx, Ry, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: center.x + Rx * Math.cos(rad), y: center.y + Ry * Math.sin(rad) };
}

// SVG's own elliptical-arc command ("A") solves for the ellipse from its
// two endpoints, rx/ry, and a flag pair — which is ambiguous (there are
// two ellipses with a given rx/ry through any two points, mirrored
// across the chord between them), and it's easy to end up with the
// mirrored one cutting through the middle instead of hugging the
// corners. Sampling points directly off the known parametric ellipse
// sidesteps that entirely — this is the exact curve, just as a polyline
// dense enough to look smooth, not something the renderer has to
// re-derive.
const ARC_STEPS = 24;

function arcPath(center, Rx, Ry, fromDeg, toDeg) {
  const points = Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / ARC_STEPS;
    return pointAt(center, Rx, Ry, deg);
  });
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export default function CornerRing({ center, rx, ry, verifiedCount }) {
  const Rx = rx * Math.SQRT2;
  const Ry = ry * Math.SQRT2;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {[0, 1, 2, 3].map((i) => {
        const next = (i + 1) % 4;
        if (i >= verifiedCount || next >= verifiedCount) return null;
        const color = VIPS[i].color;
        return (
          <motion.path
            key={`lit-${i}`}
            d={arcPath(center, Rx, Ry, ANGLES[i], ANGLES[i + 1])}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            style={{ stroke: color, filter: `drop-shadow(0 0 6px ${color})` }}
          />
        );
      })}
    </svg>
  );
}
