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
  // Rendered as three separately colored words in IntroChapter (sky/red/gold) —
  // kept out of this data file since the per-word coloring lives in the JSX.
  subtagline: "Kabalikat sa Matatag, Maginhawa, at Panatag na Kinabukasan",
  venue: "Zamboanga del Norte Convention and Sports Center, Dipolog City, Zamboanga del Norte",
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
    question: "Did you know RSTW just got a whole new name?",
    copy: "It's now the Regional Science, Technology, and Innovation Week — with LIC-HA and the R&D Symposium putting homegrown inventions on stage.",
  },
  {
    icon: Users,
    code: "02",
    title: "Community Empowerment",
    question: "Why does RSTW exist as its own regional celebration?",
    copy: "So DOST's own technologies reach every province directly — like the DOST x LGU Forum, brought straight to local governments.",
  },
  {
    icon: Leaf,
    code: "03",
    title: "Food Security",
    question: "How does science and technology actually put food on the table?",
    copy: "Through blue economy seminars and real farm tech, like AGROTIS, DOST's own agricultural robot.",
  },
  {
    icon: Cpu,
    code: "04",
    title: "Digital Transformation",
    question: "What does a more resilient region actually look like?",
    copy: "A new satellite calibration lab and cybersecurity training for SETUP-assisted MSMEs — this region's own piece of it.",
  },
];

export const highlights = [
  {
    icon: FlaskConical,
    title: "S&T Fair & Exhibits",
    copy: "The DOST Bazaar, Science Centrum, and exhibit floor — research and DOST-assisted enterprises on display.",
    tag: "Exhibit",
    // Straight from the PDF's own Calendar of Activities — shown as a
    // schedule list beside this card instead of event photos.
    schedule: [
      { day: "Aug 12", time: "11:55 AM", label: "Opening of the Exhibits" },
      { day: "Aug 12", time: "4:00 – 5:40 PM", label: "Satellite Lab & Science Centrum Inaugurations" },
      { day: "Aug 12–14", time: "8:00 AM – 5:00 PM", label: "Exhibits, Science Centrum, Trivia & DOST Bazaar" },
    ],
  },
  {
    icon: Presentation,
    title: "Regional Forums",
    copy: "Blue economy, smart agriculture, and local development, each with its own dedicated forum.",
    tag: "Forum",
    schedule: [
      { day: "Aug 12", time: "1:00 – 5:00 PM", label: "DOST x LGU Forum on STI for Local Development" },
      { day: "Aug 13", time: "8:00 AM – 12:00 NN", label: "Seminar on Blue Economy" },
      { day: "Aug 13", time: "8:00 AM – 5:00 PM", label: "Smart Agriculture Forum" },
    ],
  },
  {
    icon: Trophy,
    title: "Local Inventors' Convention",
    copy: "LIC-HA — inventors from across the peninsula take the stage to showcase what they've built.",
    tag: "Convention",
    schedule: [
      { day: "Aug 13", time: "1:00 – 5:00 PM", label: "LIC-HA: Local Inventors' Convention-Horizons and Advancement" },
    ],
  },
  {
    icon: Rocket,
    title: "Tech Demos & Talks",
    copy: "The Technology Forum brings DOST agencies and regional partners to one main stage.",
    tag: "Demo",
    schedule: [{ day: "Aug 13", time: "1:00 – 5:00 PM", label: "Technology Forum" }],
  },
];

// Read aloud by the tour's own narrator (see lib/speech.js) as it lands
// on each stop — one entry per non-Intro stop in useAutoPlay's STOPS,
// in that same order (About's two beats, then each Pillar, then each
// Highlight). Intro has no entry: the tour's very first stop just gets
// the plain dwell-then-advance pacing narration everywhere else now
// drives. Written as its own short script rather than reused from the
// fields above — a few phrases are trimmed or reworded here for how
// they read out loud rather than how they read on screen: "&" spelled
// out as "and" (not every voice pronounces the symbol), and "DOST"
// spelled out letter by letter as "D.O.S.T" rather than read as one
// word — a hyphenated "D-O-S-T" was tried first and confirmed (by
// actually listening to the generated clip) to still read as the word
// "DOST"; the period-delimited form is the more standard "spell this
// out" convention and is what the narration:generate command's own
// style instruction now also explicitly asks for as a second measure.
export const tourNarration = [
  "Science, Technology and Innovation",
  "One D.O.S.T 4U - Solutions and Opportunities for All",
  "Did you know RSTW just got a whole new name? It's now the Regional Science, Technology, and Innovation Week — with LIC-HA and the R and D Symposium putting homegrown inventions on stage.",
  "Why does RSTW exist as its own regional celebration? So D.O.S.T's own technologies reach every province directly — like the D.O.S.T x LGU Forum, brought straight to local governments.",
  "How does science and technology actually put food on the table? Through blue economy seminars and real farm tech, like AGROTIS, D.O.S.T's own agricultural robot.",
  "What does a more resilient region actually look like? A new satellite calibration lab and cybersecurity training for SETUP-assisted MSMEs — this region's own piece of it.",
  "S and T Fair and Exhibits",
  "Regional Forums",
  "Local Inventors' Convention",
  "Tech Demos and Talks",
];

// The narrator's bridge line — not part of the tour above, so it isn't
// keyed by a STOPS index. Plays once the tour's last stop (Tech Demos &
// Talks) finishes narrating, while the background music hushes to
// silence under it, filling what used to be a dead beat between the
// tour ending and the countdown starting (see App's handlePreviewFinale).
// Deliberately doesn't name RSTW — it's a tease for the reveal that
// follows, not a repeat of it.
export const finaleTeaseNarration =
  "Alright, Zamboanga Peninsula... are you ready? Because what happens next... you're not going to want to miss.";

// The payoff to that tease — played once, the moment the hero has fully
// landed after the countdown (see App's revealHeroChrome), not on every
// later scroll back up to it.
export const welcomeNarration = "WELCOME TO RSTW 2026!";

