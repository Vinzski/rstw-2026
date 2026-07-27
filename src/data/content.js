import {
  Sparkles,
  Users,
  Leaf,
  Cpu,
  FlaskConical,
  Rocket,
  Trophy,
  Presentation,
} from "lucide-react";

// The narrative chapters (Intro through Highlights) don't live in their
// own document sections anymore — they're layers inside one continuous
// pinned track (see CinematicTrack), each owning a weighted slice of it.
// `vh` here is relative weight, not an actual CSS height; only the ratio
// between them matters. This is the single source of truth for that
// weighting — the track's total height and each chapter's start/end
// fraction are both derived from it below.
// Weights sized so every glyph-dive matches the hero's pacing: the
// hero's zero-dive spans ~210vh of scroll, so each beat's dive gets a
// comparable ~140-180vh — which is why Pillars and Highlights (four
// dives each) tower over the other chapters.
export const cinematicSegments = [
  { id: "intro", label: "Intro", vh: 290 },
  { id: "about", label: "About", vh: 600 },
  { id: "pillars", label: "Pillars", vh: 1000 },
  { id: "highlights", label: "Highlights", vh: 950 },
];

export const cinematicTotalVh = cinematicSegments.reduce((sum, seg) => sum + seg.vh, 0);

let cumulativeVh = 0;
export const cinematicRanges = cinematicSegments.map((seg) => {
  const start = cumulativeVh / cinematicTotalVh;
  cumulativeVh += seg.vh;
  const end = cumulativeVh / cinematicTotalVh;
  return { ...seg, start, end };
});

// Fade-window fractions shared between the chapters that use them and the
// snap-zone map (see lib/snapZones.js) — defined once here so the two stay
// in sync instead of duplicating magic numbers in both places.
export const chapterEdgeFade = 0.028;

// Depth-parallax envelope every chapter rides (CinematicLayers): backdrop
// drifts -bg→+bg px and foreground +fg→-fg px across a chapter's run.
export const chapterParallax = { bg: 36, fg: 20 };

// Beat rhythm shared by the Pillars/Highlights chapters and the snap-zone
// map: `beatDiveFrac` is how much of a beat's segment its exit dive
// occupies (the long push through the letter), `pillarBeatFadeFrac` is
// the shorter stagger unit for settle margins and the side-cluster
// assembly.
export const beatDiveFrac = 0.6;
export const pillarBeatFadeFrac = 0.3;

// The single source of truth for the journey's order — drives the nav and
// the progress rail. Tech Demos & Talks (the last card in `highlights`
// below) is the site's final beat, so the Highlights chapter itself is
// the last stop before the footer.
export const chapters = cinematicSegments.map(({ id, label }) => ({ id, label }));

export const navLinks = chapters.map((c) => ({
  label: c.label,
  href: `#${c.id}`,
}));

export const intro = {
  kicker: "Regional Science, Technology & Innovation Week",
  title: "RSTW",
  year: "2026",
  tagline: "Science, Technology, and Innovation",
  venue: "Dipolog City · Zamboanga del Norte",
  date: "August 12–14, 2026",
};

// The official 2026 theme — shown as its own beat in About, styled as two
// lines the way the print materials set it: a bold headline clause and a
// softer, differently-colored line underneath. `body` is kept to one short
// clause on purpose — this is a scroll-scrubbed beat on screen for a
// couple of seconds, not a page anyone stops to read a paragraph on.
export const about = {
  eyebrow: "RSTW 2026 Theme",
  theme: {
    main: "Science, Technology, & Digital Innovation",
    sub: "Driving food security, sustainable energy, and national resilience.",
  },
  body: "OneDOST4U — solutions and opportunities for all.",
  // The program-name token inside `body` that gets the brand-gradient
  // highlight treatment.
  bodyHighlight: "OneDOST4U",
  stats: [
    { value: "3", label: "Days" },
    { value: "9+", label: "Provinces & cities" },
    { value: "1", label: "Region" },
  ],
};

export const pillars = [
  {
    icon: Sparkles,
    code: "01",
    title: "Innovation",
    question: "What if every idea had a place to grow?",
    copy: "Homegrown inventions and research from across the peninsula.",
  },
  {
    icon: Users,
    code: "02",
    title: "Community Empowerment",
    question: "What happens when science reaches every barangay?",
    copy: "S&T services brought directly to LGUs, schools, and co-ops.",
  },
  {
    icon: Leaf,
    code: "03",
    title: "Sustainability",
    question: "What do we owe the reefs, the rivers, the next generation?",
    copy: "Food security and climate-resilient practices, region-wide.",
  },
  {
    icon: Cpu,
    code: "04",
    title: "Digital Transformation",
    question: "What could the peninsula become, fully connected?",
    copy: "Digital literacy and smart infrastructure for every LGU.",
  },
];

export const highlights = [
  {
    icon: FlaskConical,
    title: "S&T Fair & Exhibits",
    copy: "Research, prototypes, and DOST-assisted enterprises on the floor.",
    tag: "Exhibit",
  },
  {
    icon: Presentation,
    title: "Regional Forums",
    copy: "Experts on innovation policy and disaster resilience.",
    tag: "Forum",
  },
  {
    icon: Trophy,
    title: "Innovation Competitions",
    copy: "Youth inventors pitch for recognition and seed support.",
    tag: "Competition",
  },
  {
    icon: Rocket,
    title: "Tech Demos & Talks",
    copy: "Live demos from DOST agencies and regional partners.",
    tag: "Demo",
  },
];

