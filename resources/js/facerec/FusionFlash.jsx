import { motion } from "framer-motion";

// The instant all four VIPs converge: a bright radial flash blooming
// from where they meet, in the same brand colors as their own stones,
// reading as "combined into one" rather than a generic screen-flash.
export default function FusionFlash() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.15] }}
      transition={{ duration: 1.5, times: [0, 0.4, 1], ease: "easeOut" }}
      style={{
        background:
          "radial-gradient(circle at 50% 44%, rgba(255,255,255,0.95), rgba(245,160,81,0.5) 30%, rgba(61,151,214,0.28) 55%, transparent 72%)",
      }}
    />
  );
}
