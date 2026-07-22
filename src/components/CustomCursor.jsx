import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, [role="button"], [data-cursor-hover]';

// A small reactive ring standing in for the OS cursor on desktop — it
// trails the pointer with a touch of spring lag and blooms open over
// anything clickable, so even just moving the mouse around feels like
// part of the same designed experience as the scroll.
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { damping: 28, stiffness: 340, mass: 0.5 });
  const springY = useSpring(y, { damping: 28, stiffness: 340, mass: 0.5 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduceMotion) return;

    setEnabled(true);
    document.documentElement.classList.add("custom-cursor-active");

    function onMove(e) {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    }
    function onLeave() {
      setVisible(false);
    }
    function onOver(e) {
      setHovering(Boolean(e.target.closest?.(INTERACTIVE_SELECTOR)));
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] mix-blend-difference"
      style={{ x: springX, y: springY, opacity: visible ? 1 : 0 }}
    >
      <motion.div
        className="rounded-full border border-white bg-white/10"
        animate={{
          width: hovering ? 56 : 18,
          height: hovering ? 56 : 18,
          x: hovering ? -28 : -9,
          y: hovering ? -28 : -9,
        }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
      />
    </motion.div>
  );
}
