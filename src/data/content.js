import {
  Sparkles,
  Users,
  Leaf,
  Cpu,
  FlaskConical,
  Rocket,
  Trophy,
  Presentation,
  Building2,
  Hotel,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";

// The narrative chapters (Intro through When & Where) don't live in their
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
  { id: "when", label: "When & Where", vh: 260 },
];

export const cinematicTotalVh = cinematicSegments.reduce((sum, seg) => sum + seg.vh, 0);

let cumulativeVh = 0;
export const cinematicRanges = cinematicSegments.map((seg) => {
  const start = cumulativeVh / cinematicTotalVh;
  cumulativeVh += seg.vh;
  const end = cumulativeVh / cinematicTotalVh;
  return { ...seg, start, end };
});

// Stay, Explore and Contact remain real, independently-scrollable
// sections — a pinned contact form (or a pinned photo gallery) is a
// usability trap, not a flourish.
export const flowChapterIds = ["explore", "stay", "contact"];

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

// The single source of truth for the journey's order — drives the nav,
// the progress rail, and the active-chapter observer.
export const chapters = [
  ...cinematicSegments.map(({ id, label }) => ({ id, label })),
  { id: "explore", label: "Explore" },
  { id: "stay", label: "Stay" },
  { id: "contact", label: "Contact" },
];

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

export const whenWhere = {
  eyebrow: "Save the Date",
  statement: "One region, moving forward.",
  target: "2026-08-12T00:00:00+08:00",
  dayRange: "12—14",
  monthYear: "AUGUST 2026",
  dateLabel: "August 12–14, 2026",
  venueLabel: "Dipolog City · Zamboanga del Norte",
};

// Zamboanga Peninsula landmarks and local specialties, illustrated in the
// official RSTW brand art — a gallery so those location pieces have
// somewhere real to live rather than being scattered as tiny decoration.
export const explore = {
  eyebrow: "Around the Peninsula",
  title: "The region RSTW 2026 calls home",
  description:
    "Zamboanga del Norte's coastline, culture, and local trade — the backdrop for three days of science and innovation in Dipolog City.",
  places: [
    { key: "vinta", image: "vinta.png", name: "The Vinta", tag: "Culture", copy: "Mindanao's iconic multicolored sail." },
    { key: "malamawi", image: "malamawi boardwalk orange.png", name: "Malamawi Boardwalk", tag: "Coast", copy: "Where the sea meets the city." },
    { key: "puntaDeDesembarco", image: "puntu de desembarco.png", name: "Punta de Desembarco", tag: "Landmark", copy: "A historic coastal landing site." },
    { key: "pagsalabuk", image: "pgsalabuk fountain blue.png", name: "Pagsalabuk Fountain", tag: "Landmark", copy: "The heart of community life." },
    { key: "unityPark", image: "unity park multicolor.png", name: "Unity Park", tag: "Community", copy: "Green space built for the people." },
    { key: "yakan", image: "yakan square.png", name: "Yakan Weave", tag: "Heritage", copy: "Geometric weave of the Yakan people." },
    { key: "calamansi", image: "calamansi yellow.png", name: "Calamansi", tag: "Agriculture", copy: "A staple citrus, grown region-wide." },
    { key: "rubber", image: "rubber orange.png", name: "Rubber Trade", tag: "Industry", copy: "A long-standing local livelihood." },
    { key: "tamban", image: "tamban.png", name: "Tamban", tag: "Fisheries", copy: "Central to the coastal fishing trade." },
  ],
};

export const hotels = [
  {
    icon: Building2,
    name: "Dipolog Garden Hotel",
    area: "Dipolog City Center",
    copy: "Placeholder listing — a full-service hotel within easy reach of the main venue and downtown attractions.",
  },
  {
    icon: Hotel,
    name: "Peninsula Bay Suites",
    area: "Coastal Dipolog",
    copy: "Placeholder listing — waterfront accommodations with conference-friendly meeting spaces.",
  },
  {
    icon: Building2,
    name: "Coastal View Inn",
    area: "Near Venue",
    copy: "Placeholder listing — budget-friendly rooms a short walk from the event grounds.",
  },
];

export const contactInfo = [
  {
    icon: MapPin,
    label: "Address",
    value: "DOST Zamboanga Peninsula, Dipolog City, Zamboanga del Norte",
  },
  {
    icon: Mail,
    label: "Email",
    value: "region9@dost.gov.ph",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "(062) 991-1024",
  },
];
