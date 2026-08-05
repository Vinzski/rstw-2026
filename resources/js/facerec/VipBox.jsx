import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";

const BORDER_FILL_DURATION_S = 0.9;
const SCAN_BEAM_LAP_S = 2.4; // one full trip around the frame while waiting

// A circular viewfinder, centered in the middle of its half of the
// screen (see useStageMetrics' circleSize) — `rect` is always a square
// bounding box, and everything below traces its inscribed circle rather
// than a rect.
function circlePath(cx, cy, r) {
  // Clockwise from the top — same "direction of travel" convention as
  // everything else in this app that circles (see the hero's ring in
  // RstwAssembly).
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
}

// One VIP's own circular frame — a single persistent element for their
// entire time on stage, never unmounted (FaceRecognitionPage fades the
// whole pair of panels out together once both have verified, then holds
// on their logos — see LogoFusion). Its `rect` (a square, in real pixels
// — see useStageMetrics) never actually changes. Only two stages now:
// "idle" (locked — waiting on that slot's own VipEvent broadcast; face
// recognition itself happens on a separate device entirely, this page
// never touches a camera) and "done" (verified, photo revealed). There's
// no in-between "scanning" state to animate through anymore, so the
// reveal below carries its own brief "just unlocked" beat rather than
// building on a scan animation that no longer exists. `initializing` is
// a separate, one-time flag layered on top of "idle" — true for exactly
// as long as the HUD activation sound plays (see FaceRecognitionPage),
// giving the "system's powering on" beat a visible match to go with
// that audio instead of the panels just sitting there silently while it
// plays.
const PING_COUNT = 3;
const PING_LAP_S = 1.3; // one ring's full expand-and-fade
const PING_STAGGER_S = PING_LAP_S / PING_COUNT; // evenly spaced so there's always one mid-expansion

export default function VipBox({ vip, stage, rect, initializing = false, flip = false }) {
  // The border only fills in once this VIP has actually verified.
  // `pathLength` only ever animates 0 → 1 once (this stays true from
  // here on), so it never replays on later re-renders.
  const reached = stage === "done";
  const [borderFilled, setBorderFilled] = useState(false);
  // If the broadcast's own avatar URL fails to load (expired signed URL,
  // hosting hiccup, whatever), a bare <img> falls back to its alt text —
  // the person's name rendered as ugly broken-image text right in the
  // middle of the panel. Falling back to this VIP's own institutional
  // logo instead keeps the panel reading as "verified, branded" rather
  // than "broken."
  const [avatarFailed, setAvatarFailed] = useState(false);
  const radius = Math.max(Math.min(rect.width, rect.height) / 2 - 1.5, 0);
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  // A real path, not a `<circle>` + a CSS `transform: rotate()` hack, so
  // "starts from the top" comes from the path's own M command instead of
  // fighting Framer Motion for control of the element's transform.
  const circleD = circlePath(cx, cy, radius);

  const glow = reached ? `0 0 28px 7px ${vip.color}55` : "0 0 0 2px rgba(12,26,51,0.1)";

  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        boxShadow: glow,
      }}
      className="overflow-hidden rounded-full bg-navy-900/5 transition-shadow duration-700 ease-out"
    >
      {/* The lock reads as "waiting," not "broken" — a small pulse keeps
          it visibly alive rather than a static icon that could pass for
          frozen — then springs out the instant this slot's own broadcast
          lands, the one "something just happened" beat standing in for
          the scan animation this flow no longer has. */}
      <AnimatePresence>
        {!reached && (
          <motion.div
            className="grid h-full w-full place-items-center"
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3, ease: "easeIn" }}
          >
            {/* Sonar-style rings pulsing outward from center, one right
                after another so there's always one mid-expansion — the
                "system's powering on" read, live for exactly as long as
                the HUD sound plays and never again after. */}
            {initializing &&
              Array.from({ length: PING_COUNT }, (_, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute rounded-full"
                  style={{ border: `2px solid ${vip.color}`, inset: "8%" }}
                  initial={{ opacity: 0.7, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 1 }}
                  transition={{ duration: PING_LAP_S, repeat: Infinity, ease: "easeOut", delay: i * PING_STAGGER_S }}
                />
              ))}

            <motion.div
              className="h-1/4 w-1/4"
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Lock className="h-full w-full text-navy-900/60" strokeWidth={2.25} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {reached && (
        <div className="relative h-full w-full">
          {/* Wipes open top-to-bottom rather than a plain fade, so the
              photo reads as "just revealed" the instant verification
              lands, not merely appearing. */}
          {avatarFailed ? (
            <div className="grid h-full w-full place-items-center bg-paper-50 p-[18%]">
              <img src={vip.logo} alt={vip.name} className="h-full w-full object-contain" />
            </div>
          ) : (
            <motion.img
              src={vip.avatar}
              alt={vip.name}
              onError={() => setAvatarFailed(true)}
              initial={{ clipPath: "inset(0 0 100% 0)", scaleX: flip ? -1.08 : 1.08, scaleY: 1.08 }}
              animate={{ clipPath: "inset(0 0 0% 0)", scaleX: flip ? -1 : 1, scaleY: 1 }}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full object-cover"
            />
          )}
          {/* A quick flash of the VIP's own color, blooming out from
              behind the photo and fading — the same "verified" beat this
              already carried before, echoed here. */}
          <motion.span
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: "easeOut" }}
            style={{ background: vip.color }}
          />
        </div>
      )}

      {/* While waiting on this slot's own broadcast, a thin line circles
          endlessly right along the border, fading into a short tail so
          the direction of travel (and the fact that it's actively
          circling, not static) is obvious — the same "system's actively
          watching this panel" read the old camera-scan beam gave,
          adapted to a state with no camera behind it. Riding the exact
          same circle (cx/cy/radius) as the border-fill path below, so
          it's never offset from the frame's actual edge. Gone the
          instant this VIP verifies — reached === done means there's
          nothing left to wait on. */}
      {!reached && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[3px] w-32 rounded-full"
          style={{
            offsetPath: `path('${circleD}')`,
            offsetRotate: "auto",
            background: `linear-gradient(to right, transparent, ${vip.color}, #fff)`,
            filter: `drop-shadow(0 0 2px ${vip.color})`,
          }}
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ duration: SCAN_BEAM_LAP_S, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* The border itself "fills in" around the panel the instant this
          VIP verifies — the confirmation that they're checked in. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <motion.path
          d={circleD}
          fill="none"
          stroke={vip.color}
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: reached ? 1 : 0, opacity: reached ? 1 : 0 }}
          transition={{ duration: BORDER_FILL_DURATION_S, ease: "easeOut" }}
          onAnimationComplete={() => reached && setBorderFilled(true)}
          style={{ filter: `drop-shadow(0 0 5px ${vip.color})` }}
        />

        {/* A brief flash + outward pulse the instant the border finishes
            filling. */}
        {borderFilled && (
          <motion.path
            d={circleD}
            fill="none"
            stroke={vip.color}
            strokeWidth="3"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        )}
      </svg>

      {borderFilled && (
        <motion.span
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ background: vip.color }}
        />
      )}
    </div>
  );
}
