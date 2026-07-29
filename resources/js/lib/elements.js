// Central registry of the official RSTW 2026 brand assets living in
// public/images/RSTW ELEMENTS/. Filenames contain spaces and an apostrophe
// (T'nalak), so every path is built here once rather than re-typed (and
// re-risked) at each call site.
const BASE = "/images/RSTW ELEMENTS";

// Small motifs that exist in multiple brand-color variants. Used as
// scattered decoration in the page gutters and section corners — each
// chapter picks the variant that matches its accent color so the motifs
// read as part of that chapter's palette, not a random sticker.
export const motifs = {
  atom: { blue: "Atom - Blue.png", red: "Atom - Red.png", yellow: "Atom - Yellow.png" },
  bolt: { blue: "Bolt - Blue.png", orange: "Bolt - Orange.png", red: "Bolt - Red.png", yellow: "Bolt - Yellow.png" },
  kulintang: { blue: "Kulintang - Blue.png", orange: "Kulintang - Orange.png", red: "Kulintang - Red.png" },
  lotus: { blue: "Lotus - Blue.png", orange: "Lotus - Orange.png", red: "Lotus - Red.png" },
  palay: { blue: "Palay - Blue.png", orange: "Palay - Orange.png" },
  windmill: { blue: "Wind Mill - Blue.png", navy: "Wind Mill - Dark Blue.png", orange: "Wind Mill - Orange.png", red: "Wind Mill - Red.png" },
  star: { blue: "Star - Blue.png", orange: "Star - Orange.png", red: "Star - Red.png" },
  lightbulb: { blue: "Light Bulb - Blue.png", red: "Light Bulb - Red.png" },
};

// The tall zigzag ribbon meant to run the height of the viewport flush
// against the left/right edge — this is the piece that fills the empty
// side gutters the flat layout used to leave bare.
export const sideRail = {
  blue: "Side - Blue.png",
  navy: "Side - Dark Blue.png",
  orange: "Side - Orange.png",
  red: "Side - Red.png",
  yellow: "Side - Yellow.png",
};

// Traditional geometric weave patterns (T'nalak) used as thin repeating
// border bands, echoing the mosaic strip along the top/bottom of the
// official poster.
export const weave = {
  blue: "T'nalak - Blue.png",
  blueBlank: "T'nalak - Blue (Blank).png",
  orange: "T'nalak - Orange.png",
  orangeBlank: "T'nalak - Orange (Blank).png",
  yellow: "T'nalak - Yellow.png",
  yellowBlank: "T'nalak - Yellow (Blank).png",
};

export const yakan = {
  pattern: "yakan pattern.png",
  square: "yakan square.png",
  square2: "yakan square 2.png",
};

// Oversized single letterforms from the RSTW logotype — used as faint
// giant watermarks behind chapter content.
export const letters = {
  N: "Letter N.png",
  R: "Letter R.png",
  S: "Letter S.png",
  T: "Letter T.png",
  W: "Letter W.png",
};

export const logos = {
  full: "Logo.png",
  rstw: "RSTW.png",
  nstw: "NSTW.png",
  year: "2026.png",
  yearHorizontal: "2026 Horizontal.png",
};

export const emblems = {
  resilience: "Resilience.png",
  pineapple: "Pineapple.png",
  tuna: "Tuna.png",
};

export const backgroundTexture = {
  mono: "Background.png",
  colored: "Background - Colored.png",
};

// Location "mood card" art — Zamboanga Peninsula landmarks rendered as
// duotone color blocks in each brand color. Used in the Explore gallery.
export const locations = {
  calamansi: { blue: "calamansi blue.png", red: "calamansi red.png", yellow: "calamansi yellow.png" },
  malamawi: { blue: "malamawi boardwalk blue.png", orange: "malamawi boardwalk orange.png", red: "malamawi boardwalk red.png" },
  pagsalabuk: { blue: "pgsalabuk fountain blue.png", red: "pagsalabuk fountain red.png", yellow: "pagsalabuk fountain yellow.png" },
  puntaDeDesembarco: { default: "optimized/puntu de desembarco.png" },
  rubber: { blue: "rubber blue.png", orange: "rubber orange.png", red: "rubber red.png" },
  tamban: { default: "tamban.png" },
  unityPark: { multicolor: "unity park multicolor.png", red: "unity park red.png", yellow: "unity park yellow.png" },
  vinta: { default: "vinta.png" },
  yakanSquare: { default: "yakan square.png", alt: "yakan square 2.png" },
};

export function el(name) {
  return `${BASE}/${name}`;
}

// Per-letter "exploded" geometry living in public/images/RSTW Individual
// Words/<LETTER>/ — the numbered pieces (1.png, 2.png, ...) that combine
// to form that letter, plus a same-folder reference render. Separate from
// `letters` above (the flat, already-composited watermark glyphs).
const WORDS_BASE = "/images/RSTW Individual Words";

export function elWord(letter, name) {
  return `${WORDS_BASE}/${letter}/${name}`;
}
