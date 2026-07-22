import { forwardRef, useRef } from "react";
import { motion, useScroll } from "framer-motion";

// Shared pin-and-scrub scaffold: the outer <section> is tall (the scroll
// "track"), its inner wrapper sticks to the top of the viewport for the
// entire track, and `children` receives 0→1 progress across that pin. This
// is what turns scrolling into scrubbing — the viewport holds still while
// content transforms underneath the cursor, reading as movement *through* a
// scene rather than a page sliding past.
const ChapterTrack = forwardRef(function ChapterTrack(
  { id, vh = 240, children, className = "", innerClassName = "" },
  labelRef,
) {
  const trackRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id={id}
      ref={trackRef}
      className={`relative ${className}`}
      style={{ height: `${vh}vh` }}
    >
      <motion.div
        ref={labelRef}
        className={`sticky top-0 h-screen w-full overflow-hidden ${innerClassName}`}
      >
        {typeof children === "function" ? children(scrollYProgress) : children}
      </motion.div>
    </section>
  );
});

export default ChapterTrack;
