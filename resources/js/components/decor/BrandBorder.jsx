import { el, motifs } from "../../lib/elements";

// A strip of alternating brand-color tiles with a few carrying an actual
// motif icon — a direct nod to the mosaic border framing the official
// RSTW 2026 poster. Used once at the very top of the page and once at the
// very bottom of the footer so the whole site is "framed" the way the
// poster is.
const CELLS = [
  { bg: "var(--color-navy-800)" },
  { bg: "var(--color-orange-500)", motif: motifs.bolt.orange },
  { bg: "var(--color-red-600)" },
  { bg: "var(--color-gold-500)", motif: motifs.star.orange },
  { bg: "var(--color-sky-500)" },
  { bg: "var(--color-navy-700)", motif: motifs.atom.blue },
  { bg: "var(--color-orange-600)" },
  { bg: "var(--color-red-500)", motif: motifs.lotus.red },
  { bg: "var(--color-gold-400)" },
  { bg: "var(--color-sky-600)", motif: motifs.kulintang.blue },
  { bg: "var(--color-navy-800)" },
  { bg: "var(--color-orange-500)", motif: motifs.lightbulb.red },
  { bg: "var(--color-red-600)" },
  { bg: "var(--color-gold-500)", motif: motifs.windmill.orange },
  { bg: "var(--color-sky-500)" },
  { bg: "var(--color-navy-700)" },
];

export default function BrandBorder({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex w-full select-none ${className}`}
    >
      {CELLS.map((c, i) => (
        <span
          key={i}
          className="relative aspect-square flex-1 overflow-hidden"
          style={{ background: c.bg }}
        >
          {c.motif && (
            <img
              src={el(c.motif)}
              alt=""
              className="absolute inset-0 h-full w-full scale-125 object-contain p-1 opacity-90"
            />
          )}
        </span>
      ))}
    </div>
  );
}
