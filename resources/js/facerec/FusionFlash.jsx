import { motion } from "framer-motion";

// A bright radial flash blooming from center, in the site's own brand
// colors — used wherever something needs to read as "combined into one"
// rather than a generic screen-flash (see LogoFusion).
export default function FusionFlash() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.15] }}
      transition={{ duration: 1.5, times: [0, 0.4, 1], ease: "easeOut" }}
      style={{
        background:
          "radial-gradient(circle at 50% 44%, rgba(255,255,255,0.95), rgba(245,160,81,0.55) 30%, rgba(227,169,79,0.32) 55%, transparent 72%)",
      }}
    />
  );
}
