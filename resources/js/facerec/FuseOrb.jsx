import { motion } from "framer-motion";
import LogoBadge from "./LogoBadge";

// The four VIPs' own colors converging into one shared point at the end
// of the flow. This is a fresh circular element, not the (portrait,
// rectangular) row card resized down — animating a rect's width/height
// toward a circle via layout FLIP visibly warps into an "oblong" blob
// mid-transition, since the two shapes don't share an aspect ratio. A
// plain scale/opacity mount avoids that entirely: it's a circle from
// its very first frame.
export default function FuseOrb({ center, size, color, delay = 0 }) {
  return (
    <motion.div
      className="absolute grid place-items-center overflow-hidden rounded-full"
      style={{
        left: center.x - size / 2,
        top: center.y - size / 2,
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${color}33, ${color}77)`,
        boxShadow: `0 0 60px 18px ${color}77, 0 0 0 3px ${color}`,
      }}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.6, bounce: 0.35, delay }}
    >
      <LogoBadge size={size * 0.5} />
    </motion.div>
  );
}
