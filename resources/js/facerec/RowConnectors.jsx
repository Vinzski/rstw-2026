import { useState } from "react";
import { motion } from "framer-motion";

// A jagged lightning-bolt path between two points instead of a plain
// straight line — echoes the reference portal's energized connectors
// (which pair with each panel's own glowing border, done separately in
// VipBox).
function boltPath(x1, y1, x2, y2, segments, jitter) {
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const px = -(y2 - y1) / len;
  const py = (x2 - x1) / len;
  const points = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const mag = jitter * (0.6 + (i % 3) * 0.2);
    points.push({ x: x1 + dx * i + px * mag * dir, y: y1 + dy * i + py * mag * dir });
  }
  points.push({ x: x2, y: y2 });
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

// Exported so VipBox can start its own border-fill exactly when this
// finishes traveling, instead of the two drifting out of sync.
export const FLOW_DURATION_S = 1.6; // slow, deliberate travel from one panel to the next

// One segment's own draw-in → arrival flash/pulse sequence. Split out
// from the map loop below purely so each segment can hold its own
// "has it finished flowing yet" state — the flash/pulse only fires once,
// the instant its own line finishes, not on every re-render.
function Connector({ d, gradId, colorFrom, colorTo, x1, y1, x2, y2 }) {
  const [arrived, setArrived] = useState(false);

  return (
    <>
      <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={colorFrom} />
        <stop offset="100%" stopColor={colorTo} />
      </linearGradient>

      {/* Draws in from this VIP's panel toward the next one, glowing
          brighter while it travels — reads as energy filling the line
          into the next panel rather than just fading in already formed. */}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.95 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: FLOW_DURATION_S, ease: "easeInOut" }}
        onAnimationComplete={() => setArrived(true)}
        style={{ filter: `drop-shadow(0 0 ${arrived ? 5 : 9}px ${colorTo})` }}
      />

      {/* A brief flash + pulse right where the line lands, marking the
          moment it "fills up" rather than just quietly stopping. */}
      {arrived && (
        <>
          <motion.circle
            cx={x2}
            cy={y2}
            r={3}
            fill={colorTo}
            initial={{ opacity: 1, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 10px ${colorTo})`, transformOrigin: `${x2}px ${y2}px` }}
          />
          <motion.circle
            cx={x2}
            cy={y2}
            r={3}
            fill="none"
            stroke={colorTo}
            strokeWidth={2}
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ transformOrigin: `${x2}px ${y2}px` }}
          />
        </>
      )}
    </>
  );
}

export default function RowConnectors({ slots, vips, activeIndex, subPhase }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {slots.slice(0, -1).map((p, i) => {
        const next = slots[i + 1];
        // Only starts traveling once the source VIP's own confirm beat
        // (border-fill + flash, see VipBox) has finished — not the
        // instant they verify.
        const lit = i < activeIndex || (i === activeIndex && subPhase === "traveling");
        const d = boltPath(p.x, p.y, next.x, next.y, 6, 9);
        const gradId = `row-link-${vips[i].id}-${vips[i + 1].id}`;
        return (
          <g key={gradId}>
            {/* Faint resting thread — always present, colors in once lit */}
            <path
              d={d}
              fill="none"
              stroke="rgba(12,26,51,0.15)"
              strokeWidth="1.25"
              strokeDasharray="2 7"
              strokeLinecap="round"
            />

            {lit && (
              <Connector
                d={d}
                gradId={gradId}
                colorFrom={vips[i].color}
                colorTo={vips[i + 1].color}
                x1={p.x}
                y1={p.y}
                x2={next.x}
                y2={next.y}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
