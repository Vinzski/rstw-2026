import { el, letters, weave } from "../../lib/elements";

// An oversized, very faint letterform from the RSTW logotype sitting
// behind a chapter's content — a quiet textural watermark rather than a
// legible label.
export function LetterWatermark({ letter, className = "", opacity = 0.05 }) {
  const src = letters[letter];
  if (!src) return null;
  return (
    <img
      src={el(src)}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 select-none ${className}`}
      style={{ opacity }}
    />
  );
}

// A thin repeating strip of the T'nalak weave pattern — a nod to the
// mosaic border framing the official poster — used at the top or bottom
// edge of a section.
export function WeaveBand({ color = "blue", className = "h-2.5 sm:h-3" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none bg-repeat-x ${className}`}
      style={{ backgroundImage: `url(${el(weave[color])})`, backgroundSize: "auto 100%" }}
    />
  );
}
