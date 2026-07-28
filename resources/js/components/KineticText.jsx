import { Fragment, useState } from "react";
import { motion, useMotionValueEvent } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

// No per-character blur — with a whole word's characters staggering in at
// once, that's dozens of simultaneous filter animations for a fairly
// subtle effect. The 3D flip (rotateX + y + opacity) reads the kinetic
// arrival on its own without the extra paint cost.
const char = {
  hidden: { opacity: 0, y: "0.5em", rotateX: -75 },
  show: {
    opacity: 1,
    y: "0em",
    rotateX: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// Splits `text` into characters that flip up into place together, staggered
// left to right — driven by a scroll-progress crossing point (`start`)
// rather than mount, so it's just another beat in an already scroll-scrubbed
// chapter and reverses cleanly if the user scrolls back up past it.
//
// `glyphIndex`/`glyphRef` land a ref on one character so a glyph-dive
// transition (lib/glyphDive) can anchor its zoom on that letter. The index
// is into the full string (spaces included), matching how callers compute
// it (e.g. `text.indexOf(word) + charInWord`).
export default function KineticText({ text, progress, start = 0, className, glyphIndex = -1, glyphRef }) {
  const [shown, setShown] = useState(() => progress.get() >= start);

  useMotionValueEvent(progress, "change", (p) => {
    const next = p >= start;
    setShown((prev) => (prev === next ? prev : next));
  });

  // Characters are grouped word-by-word, each word wrapped in its own
  // whitespace-nowrap span, with only the literal inter-word spaces left
  // as ordinary breakable text. Browsers treat every inline-block as a
  // line-break opportunity in its own right — with each *character*
  // rendered as its own inline-block (needed for the per-character flip),
  // a line could otherwise wrap between any two letters, not just at a
  // space, splitting words mid-way.
  const words = text.split(" ");
  let idx = -1;

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate={shown ? "show" : "hidden"}
      className={`inline-block ${className ?? ""}`}
      style={{ perspective: 600 }}
    >
      {words.map((word, wi) => {
        const isLast = wi === words.length - 1;
        const chars = [...word].map((ch) => {
          idx++;
          return (
            <motion.span
              key={idx}
              ref={idx === glyphIndex ? glyphRef : undefined}
              variants={char}
              className="inline-block"
              style={{ transformOrigin: "50% 100%" }}
            >
              {ch}
            </motion.span>
          );
        });
        if (!isLast) idx++; // the space between this word and the next
        return (
          <Fragment key={wi}>
            <span className="inline-block whitespace-nowrap">{chars}</span>
            {!isLast && " "}
          </Fragment>
        );
      })}
    </motion.span>
  );
}
