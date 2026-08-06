import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { finaleTeaseNarration } from "../data/content";
import { speakFinaleTease, cancelSpeech } from "../lib/speech";

// The bridge between the tour's last card and the boot countdown. The
// screen dims that card away entirely, holds a beat of real darkness so
// the voice doesn't land on top of the transition, then the narrator's
// tease plays over a chemistry bench: the RSTW mascot holding a glowing
// test tube in each hand, tipping them into a beaker one after the
// other. Nothing on screen is lit except the chemicals themselves —
// everything else is only visible where their glow reaches it, which is
// why the mascot brightens and warms with every pour. When the line
// finishes the mixture flares into one screen-filling burst that hands
// straight off to the countdown; the white-out it ends on is the same
// near-white as the Loader's own background, so the two meet seamlessly.
//
// Timeline: dark → (1s of nothing) → pour, pour, boil → explode → onDone.
//
// The mascot is drawn (see MascotArt below) rather than loaded as an
// image: it's a flat vector likeness of the costume mascot — big round
// head, dark bob and bangs, blue headband, flower, lab coat, lanyard —
// which keeps it sharp at any size, lets the arms actually hold the
// tubes, and lets the lighting be computed from the artwork itself
// instead of needing a background-removed photo.

const DARK_FADE_S = 0.9; // the last card dimming away to nothing
const HOLD_AFTER_DARK_MS = 1000; // the requested beat of silence before anyone speaks
const EXPLOSION_S = 1.5;

// Spread so the two pours land across roughly the whole spoken line
// (finale.wav runs about 11s) instead of finishing in the first half —
// the second tube empties with a few seconds left for the mixture to
// visibly come to a boil before it goes off.
const POUR_START_MS = [1100, 4900];
const POUR_MS = 2100;

// The mixing gets at least this long regardless of the narration —
// muted visits (and any run where the clip is missing) resolve
// `speakFinaleTease` more or less instantly, and without a floor the
// beaker would detonate before either tube had been tipped.
const MIN_MIX_MS = 8800;

// One tube per hand, cool and warm, so the two pours read as visibly
// different reagents rather than the same liquid twice. Each pivots
// about its own grip, so tipping swings the glass while the hand
// holding it stays where the mascot's arm ends.
const TUBES = [
  { color: "#3d97d6", light: "#6fbdea", grip: { x: 135, y: 305 }, rest: -8, pour: 115 }, // sky, left
  { color: "#ee8b3b", light: "#f5a051", grip: { x: 265, y: 305 }, rest: 8, pour: -115 }, // orange, right
];

// Where each tube's mouth ends up once tipped — both converge just above
// the beaker's mouth.
const POUR_MOUTH = [
  { x: 176, y: 324 },
  { x: 224, y: 324 },
];

// What ends up swirling in the beaker. The first pour brings its own
// blues in; the second doesn't just add orange but sets off the rest of
// the brand palette with it, so the final mixture carries all four
// colors rather than settling into one muddy blend.
const BEAKER_SWIRLS = [
  { color: "#3d97d6", after: 1 },
  { color: "#2678b8", after: 1 },
  { color: "#ee8b3b", after: 2 },
  { color: "#c1432c", after: 2 },
  { color: "#d18f34", after: 2 },
];

// Liquid surface in the beaker after each pour. Interior runs to y=434.
const BEAKER_LEVELS = [434, 400, 372];
const BEAKER_FLOOR = 432;

const RAY_COUNT = 16;

// The mascot at full daylight color. Never rendered as-is — it's defined
// once and stamped twice (crushed to shadow, then relit through the
// glow's falloff), so these are the colors the light has to work from
// rather than colors ever seen on screen.
function MascotArt() {
  return (
    <>
      {/* Hair, then face over it, then the fringe over that. */}
      <ellipse cx="200" cy="142" rx="98" ry="100" fill="#1e1e28" />
      <ellipse cx="200" cy="146" rx="71" ry="69" fill="#f3cfae" />
      <path
        d="M131,140 C131,98 162,73 200,73 C238,73 269,98 269,140 C262,129 251,121 239,125 C227,129 221,117 207,119 C193,121 187,131 173,127 C159,123 147,126 139,134 Z"
        fill="#1e1e28"
      />
      <path
        d="M120,122 C126,76 158,48 200,48 C242,48 274,76 280,122"
        fill="none"
        stroke="#5ab4dd"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Flower over the left ear. */}
      <g>
        <ellipse cx="127" cy="57" rx="12" ry="6" transform="rotate(-28 127 57)" fill="#4a8a3f" />
        <ellipse cx="163" cy="49" rx="11" ry="5.5" transform="rotate(22 163 49)" fill="#56a049" />
        <g fill="#ffffff">
          <circle cx="146" cy="51" r="9" />
          <circle cx="156" cy="58" r="9" />
          <circle cx="152" cy="70" r="9" />
          <circle cx="140" cy="70" r="9" />
          <circle cx="136" cy="58" r="9" />
        </g>
        <circle cx="146" cy="61" r="5.5" fill="#f2d16b" />
      </g>

      {/* Eyes — the mascot's are big, blue and highlighted. */}
      {[172, 228].map((ex) => (
        <g key={ex}>
          <ellipse cx={ex} cy="158" rx="20" ry="24" fill="#ffffff" />
          <ellipse cx={ex} cy="160" rx="15" ry="18" fill="#3f8fbf" />
          <ellipse cx={ex} cy="161" rx="8.5" ry="11" fill="#16202e" />
          <circle cx={ex - 7} cy="150" r="6.5" fill="#ffffff" />
          <circle cx={ex + 7} cy="169" r="3.5" fill="#ffffff" fillOpacity="0.85" />
          <path
            d={`M${ex - 20},152 C${ex - 16},137 ${ex + 16},137 ${ex + 20},152`}
            fill="none"
            stroke="#1e1e28"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <ellipse cx="140" cy="184" rx="16" ry="9" fill="#e0908e" fillOpacity="0.5" />
      <ellipse cx="260" cy="184" rx="16" ry="9" fill="#e0908e" fillOpacity="0.5" />
      <path d="M190,191 C195,200 205,200 210,191" fill="none" stroke="#6b3f3a" strokeWidth="3" strokeLinecap="round" />

      {/* Lab coat. */}
      <path
        d="M144,222 C138,240 132,272 130,312 L126,466 L274,466 L270,312 C268,272 262,240 256,222 C242,212 222,208 200,208 C178,208 158,212 144,222 Z"
        fill="#e6e6f2"
      />
      <path d="M200,214 L178,222 L200,276 L222,222 Z" fill="#2a3550" />
      <path d="M178,220 L166,224 L190,280 L200,276 Z" fill="#d8d8e8" />
      <path d="M222,220 L234,224 L210,280 L200,276 Z" fill="#d8d8e8" />
      <path d="M200,276 L200,462" stroke="#cfcfe0" strokeWidth="2" fill="none" />
      <circle cx="194" cy="308" r="3.5" fill="#cfcfe0" />
      <circle cx="194" cy="346" r="3.5" fill="#cfcfe0" />
      <g stroke="#d0d0e0" strokeWidth="2" fill="none">
        <rect x="140" y="356" width="46" height="36" rx="4" />
        <rect x="214" y="356" width="46" height="36" rx="4" />
      </g>

      {/* Lanyard and ID, the way the costume wears it. */}
      <path d="M186,222 L196,300 M214,222 L204,300" stroke="#23304a" strokeWidth="3.5" fill="none" />
      <rect x="185" y="300" width="32" height="40" rx="3" fill="#f6f6fa" stroke="#c2c2d2" strokeWidth="1.5" />
      <rect x="190" y="305" width="12" height="15" fill="#93a3ba" />
      <path d="M190,326 L212,326 M190,332 L206,332" stroke="#b9b9c9" strokeWidth="2" fill="none" />

      {/* Agency pins on the chest. */}
      <circle cx="162" cy="258" r="9" fill="#3f8fbf" />
      <circle cx="162" cy="258" r="4" fill="#e8e8f0" />
      <circle cx="177" cy="273" r="7.5" fill="#f0f0f6" />
      <circle cx="177" cy="273" r="3" fill="#c1432c" />

      {/* Arms, reaching down to where the tubes are held. */}
      <g fill="none" strokeLinecap="round">
        <path d="M152,236 C142,258 136,280 135,302" stroke="#d2d2e2" strokeWidth="38" />
        <path d="M248,236 C258,258 264,280 265,302" stroke="#d2d2e2" strokeWidth="38" />
        <path d="M152,236 C142,258 136,280 135,302" stroke="#e6e6f2" strokeWidth="34" />
        <path d="M248,236 C258,258 264,280 265,302" stroke="#e6e6f2" strokeWidth="34" />
      </g>
    </>
  );
}

export default function FinaleAlchemy({ onDone }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState("dark"); // dark | mixing | explode
  const [poured, setPoured] = useState(0);
  const [pouring, setPouring] = useState(null);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // Each effect run gets its own id so any async continuation from a
  // previous run (StrictMode's dev-only remount, most of all) can tell
  // it's stale and bow out instead of firing a second explosion.
  const runIdRef = useRef(0);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const timers = [];
    const alive = () => runIdRef.current === runId;
    const later = (ms, fn) => {
      timers.push(setTimeout(() => alive() && fn(), ms));
    };

    later(DARK_FADE_S * 1000 + HOLD_AFTER_DARK_MS, () => {
      setStage("mixing");

      POUR_START_MS.forEach((startMs, i) => {
        later(startMs, () => setPouring(i));
        later(startMs + POUR_MS, () => {
          setPouring(null);
          setPoured(i + 1);
        });
      });

      // Whichever takes longer: the narrator actually finishing, or both
      // tubes having had time to go in.
      const spoken = speakFinaleTease(finaleTeaseNarration);
      const floor = new Promise((resolve) => later(MIN_MIX_MS, resolve));
      Promise.all([spoken, floor]).then(() => {
        if (!alive()) return;
        setStage("explode");
        later(EXPLOSION_S * 1000, () => onDoneRef.current?.());
      });
    });

    return () => {
      timers.forEach(clearTimeout);
      cancelSpeech();
    };
  }, []);

  const bubbles = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        x: 158 + ((i * 41) % 84),
        delay: (i * 0.37) % 2.6,
        duration: 2.2 + ((i * 7) % 5) * 0.26,
        r: 1.8 + ((i * 3) % 4) * 0.7,
      })),
    [],
  );

  const sceneVisible = stage !== "dark";
  const charged = poured >= TUBES.length;
  const exploding = stage === "explode";
  const level = BEAKER_LEVELS[poured];

  // How much of the room the chemicals are reaching. Before anything is
  // poured the two tubes are the only sources, so the mascot is barely
  // picked out; each pour moves the light down into the beaker and
  // throws far more of it back up.
  const litAmount = poured === 0 ? 0.4 : poured === 1 ? 0.74 : 1;
  const rimColor = poured >= 2 ? "#f5a051" : poured >= 1 ? "#6fbdea" : "#8ab6d8";
  const rimOpacity = 0.1 + poured * 0.13;
  const warm = poured >= 2;

  return (
    <motion.div
      className="fixed inset-0 z-[90] overflow-hidden bg-[#04060e]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DARK_FADE_S, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative aspect-[400/520]"
          style={{ width: "min(58vh, 88vw)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: sceneVisible ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <svg viewBox="0 0 400 520" className="absolute inset-0 h-full w-full">
            <defs>
              <clipPath id="fa-beaker-inner">
                <path d="M144,359 L150,432 A5,5 0 0 0 155,437 L245,437 A5,5 0 0 0 250,432 L256,359 Z" />
              </clipPath>
              <clipPath id="fa-tube-inner">
                <path d="M-10,-42 L-10,34 A10,10 0 0 0 10,34 L10,-42 Z" />
              </clipPath>
              <filter id="fa-soft" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
              <filter id="fa-bloom" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="22" />
              </filter>
              <filter id="fa-tight" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <linearGradient id="fa-glass" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>

              {/* The mascot in shadow: everything the chemicals aren't
                  reaching, knocked down to a near-silhouette that keeps a
                  cold ambient cast rather than going flat black. */}
              <filter id="fa-unlit" colorInterpolationFilters="sRGB">
                <feColorMatrix
                  type="matrix"
                  values="0.13 0 0 0 0
                          0 0.145 0 0 0
                          0 0 0.2 0 0
                          0 0 0 1 0"
                />
              </filter>

              {/* …and the same artwork relit by the chemicals. Each matrix
                  maps the drawing's own luminance onto the reagent's
                  color, so the mascot's shading survives while everything
                  the light touches takes that color — the "torch held
                  under the face" read, rather than a flat wash of tint.
                  The white coat carries it best, the dark hair barely at
                  all, which is exactly how real uplighting behaves. */}
              <filter id="fa-lit-cool" colorInterpolationFilters="sRGB">
                <feColorMatrix
                  type="matrix"
                  values="0.1387 0.4667 0.0471 0 0
                          0.2363 0.7950 0.0803 0 0
                          0.2927 0.9848 0.0994 0 0
                          0 0 0 1 0"
                />
              </filter>
              <filter id="fa-lit-warm" colorInterpolationFilters="sRGB">
                <feColorMatrix
                  type="matrix"
                  values="0.3065 1.0310 0.1041 0 0
                          0.1999 0.6727 0.0679 0 0
                          0.1014 0.3412 0.0344 0 0
                          0 0 0 1 0"
                />
              </filter>

              {/* Falloff of that light, radiating out of the beaker —
                  strongest on whatever is closest to the glass, gone well
                  before the top of the frame, so the face stays dim and
                  the coat catches most of it. */}
              <radialGradient id="fa-uplight-grad" gradientUnits="userSpaceOnUse" cx="200" cy="405" r="345">
                <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="0.68" stopColor="#ffffff" stopOpacity="0.38" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <mask id="fa-uplight" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="520">
                <rect x="0" y="0" width="400" height="520" fill="url(#fa-uplight-grad)" />
              </mask>

              <g id="fa-mascot">
                <MascotArt />
              </g>
            </defs>

            {/* The glow the beaker throws into the room, growing with
                every pour — the scene's only real light source. */}
            <motion.ellipse
              cx="200"
              cy="400"
              fill={warm ? "#f5a051" : "#6fbdea"}
              filter="url(#fa-bloom)"
              animate={{
                rx: 48 + poured * 40,
                ry: 36 + poured * 28,
                opacity: poured === 0 ? 0.1 : charged ? [0.4, 0.6, 0.4] : 0.28,
              }}
              transition={{
                rx: { duration: 1.1, ease: "easeOut" },
                ry: { duration: 1.1, ease: "easeOut" },
                opacity: charged && !reduce ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 1.1 },
              }}
            />

            {/* The mascot, lit only from the bench: the shadowed stamp
                underneath, the relit stamp over it through the falloff. */}
            <use href="#fa-mascot" filter="url(#fa-unlit)" />
            <motion.g
              mask="url(#fa-uplight)"
              animate={{ opacity: charged && !reduce ? [litAmount * 0.85, litAmount, litAmount * 0.85] : litAmount }}
              transition={charged && !reduce ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 1.1 }}
            >
              <use href="#fa-mascot" filter={warm ? "url(#fa-lit-warm)" : "url(#fa-lit-cool)"} />
            </motion.g>

            {/* A tube in each hand, tipping in turn. */}
            {TUBES.map((tube, i) => {
              const isPouring = pouring === i;
              const emptied = poured > i;
              return (
                <motion.g
                  key={tube.color}
                  style={{ transformOrigin: `${tube.grip.x}px ${tube.grip.y}px` }}
                  initial={{ rotate: tube.rest }}
                  animate={{ rotate: isPouring ? tube.pour : tube.rest }}
                  transition={{ duration: 0.85, ease: "easeInOut" }}
                >
                  <g transform={`translate(${tube.grip.x}, ${tube.grip.y})`}>
                    <g clipPath="url(#fa-tube-inner)">
                      <motion.rect
                        x="-12"
                        width="24"
                        fill={tube.color}
                        filter="url(#fa-tight)"
                        initial={{ y: -30, height: 78 }}
                        animate={{ y: emptied ? 34 : -30, height: emptied ? 0 : 78 }}
                        transition={{ duration: POUR_MS / 1000, ease: "easeInOut" }}
                      />
                    </g>
                    <path
                      d="M-13,-45 L-13,34 A13,13 0 0 0 13,34 L13,-45"
                      fill="none"
                      stroke="url(#fa-glass)"
                      strokeWidth="2.5"
                    />
                    <ellipse cx="0" cy="-45" rx="13" ry="4" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.8" />
                    {/* The mascot's mitten hand, gripping. It rides with
                        the tube so the wrist turns rather than the tube
                        sliding out of a hand that stayed upright — and
                        it's lit hardest of anything, being right against
                        the glass. */}
                    <rect x="-21" y="-17" width="42" height="35" rx="17" fill={tube.light} fillOpacity="0.5" />
                    <rect x="-19" y="-15" width="38" height="31" rx="15" fill="#151d2c" />
                  </g>
                </motion.g>
              );
            })}

            {/* The pour itself: a lit stream from the tipped mouth down
                into the beaker, for exactly as long as that tube is
                going in. */}
            {pouring !== null && (
              <motion.path
                d={`M${POUR_MOUTH[pouring].x},${POUR_MOUTH[pouring].y} Q${
                  POUR_MOUTH[pouring].x + (pouring === 0 ? 6 : -6)
                },${POUR_MOUTH[pouring].y + 34} ${pouring === 0 ? 198 : 202},${BEAKER_LEVELS[pouring + 1]}`}
                fill="none"
                stroke={TUBES[pouring].light}
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#fa-tight)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                transition={{
                  pathLength: { duration: 0.35, delay: 0.5, ease: "easeIn" },
                  opacity: { duration: POUR_MS / 1000, times: [0, 0.25, 0.85, 1] },
                }}
              />
            )}

            {/* Beaker */}
            <g>
              <g clipPath="url(#fa-beaker-inner)">
                <motion.rect
                  x="130"
                  width="140"
                  fill="#0a1730"
                  animate={{ y: level, height: BEAKER_FLOOR - level + 16 }}
                  transition={{ duration: POUR_MS / 1000, ease: "easeInOut" }}
                />

                {/* Ribbons of each color drifting through the mix. */}
                {BEAKER_SWIRLS.filter((s) => poured >= s.after).map((swirl, i) => {
                  const top = BEAKER_LEVELS[swirl.after] + 16;
                  const span = BEAKER_FLOOR - top - 10;
                  return (
                    <motion.ellipse
                      key={swirl.color}
                      rx="36"
                      ry="18"
                      fill={swirl.color}
                      filter="url(#fa-soft)"
                      initial={{ opacity: 0, cx: 200, cy: top + span * 0.4 }}
                      animate={
                        reduce
                          ? { opacity: 0.7, cx: 200, cy: top + span * 0.5 }
                          : {
                              opacity: [0.5, 0.85, 0.5],
                              cx: [172, 228, 186, 216, 172],
                              cy: [
                                top + span * 0.25,
                                top + span * 0.7,
                                top + span * 0.45,
                                top + span * 0.8,
                                top + span * 0.25,
                              ],
                            }
                      }
                      transition={
                        reduce ? { duration: 0.6 } : { duration: 4 + i * 0.55, repeat: Infinity, ease: "easeInOut" }
                      }
                    />
                  );
                })}

                {poured > 0 && (
                  <motion.rect
                    x="130"
                    width="140"
                    height="3"
                    fill={warm ? "#f5a051" : "#6fbdea"}
                    opacity="0.85"
                    filter="url(#fa-tight)"
                    animate={{ y: level }}
                    transition={{ duration: POUR_MS / 1000, ease: "easeInOut" }}
                  />
                )}

                {!reduce &&
                  poured > 0 &&
                  bubbles.map((b, i) => (
                    <motion.circle
                      key={i}
                      cx={b.x}
                      r={b.r}
                      fill={warm ? "#f0c479" : "#6fbdea"}
                      opacity="0.7"
                      initial={{ cy: BEAKER_FLOOR - 6, opacity: 0 }}
                      animate={{ cy: [BEAKER_FLOOR - 6, level + 8], opacity: [0, 0.75, 0] }}
                      transition={{
                        duration: charged ? b.duration * 0.6 : b.duration,
                        repeat: Infinity,
                        delay: b.delay,
                        ease: "easeOut",
                      }}
                    />
                  ))}
              </g>

              {/* Glass: wall, spout, rim and graduation marks. */}
              <path
                d="M140,355 L146,432 A8,8 0 0 0 154,440 L246,440 A8,8 0 0 0 254,432 L260,355"
                fill="none"
                stroke="url(#fa-glass)"
                strokeWidth="2.5"
              />
              <path d="M140,355 L128,350 L134,362" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="2" />
              <ellipse cx="200" cy="355" rx="60" ry="9" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2" />
              <g stroke="#ffffff" strokeOpacity="0.07" strokeWidth="2">
                <path d="M238,388 L250,388" />
                <path d="M240,406 L252,406" />
                <path d="M242,424 L254,424" />
              </g>
            </g>

            {/* The bench, picked out only by what the beaker spills onto it. */}
            <motion.ellipse
              cx="200"
              cy="443"
              rx="120"
              ry="9"
              fill={warm ? "#f5a051" : "#6fbdea"}
              filter="url(#fa-soft)"
              animate={{ opacity: poured === 0 ? 0.06 : 0.2 }}
              transition={{ duration: 1.1 }}
            />
            <path d="M40,441 L360,441" stroke={rimColor} strokeOpacity={rimOpacity * 0.8} strokeWidth="2" />
          </svg>

          {/* The burst, anchored on the beaker itself (77% down the scene
              box is its own center) so the light leaves from where the
              chemistry was, not from the middle of the screen. */}
          {exploding && (
            <div className="pointer-events-none absolute" style={{ left: "50%", top: "77%" }}>
              {Array.from({ length: RAY_COUNT }, (_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-[3px] origin-left"
                  style={{
                    left: 0,
                    top: 0,
                    width: "140vmax",
                    rotate: `${(i * 360) / RAY_COUNT}deg`,
                    background: `linear-gradient(90deg, ${
                      ["#6fbdea", "#f5a051", "#c1432c", "#f0c479"][i % 4]
                    }, transparent)`,
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: [0, 1], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.012 }}
                />
              ))}
              <motion.div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                style={{ width: "18vmax", height: "18vmax", filter: "blur(12px)" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.6, 9], opacity: [0, 1, 0.85] }}
                transition={{ duration: EXPLOSION_S, ease: "easeIn", times: [0, 0.22, 1] }}
              />
              <motion.div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ width: "14vmax", height: "14vmax", borderColor: "#f0c479" }}
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: [0, 7], opacity: [0.9, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Lands on the Loader's own near-white so the countdown doesn't
          cut in against black. */}
      {exploding && (
        <motion.div
          className="absolute inset-0 bg-paper-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: EXPLOSION_S - 0.55, ease: "easeIn" }}
        />
      )}
    </motion.div>
  );
}
