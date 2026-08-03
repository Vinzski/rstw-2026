import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Camera as CameraIcon } from "lucide-react";
import ScanOverlay from "./ScanOverlay";

const BORDER_FILL_DURATION_S = 0.9;
const SCAN_BEAM_LAP_S = 2.4; // one full trip around the frame while scanning

// A circular viewfinder, centered in the middle of its half of the
// screen (see useStageMetrics' circleSize) — `rect` is always a square
// bounding box, and everything below traces its inscribed circle rather
// than a rect.
function circlePath(cx, cy, r) {
  // Clockwise from the top — same "direction of travel" convention as
  // everything else in this app that circles (see the hero's ring in
  // RstwAssembly). `offset-rotate: auto` then keeps a moving element's
  // own local +x axis aligned with whichever direction the path is
  // heading, which is what lets the scan beam's tail trail correctly.
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
}

// One VIP's own circular frame — a single persistent element for their
// entire time on stage, never unmounted (FaceRecognitionPage fades the
// whole pair of panels out together once both have verified, then holds
// on their logos — see LogoFusion). Its `rect` (a square, in real pixels
// — see useStageMetrics) never actually changes: idle → active camera
// viewfinder → a lit panel once checked in, all in the same spot.
export default function VipBox({ vip, stage, rect, stream, cameraError, onVerified, onRetryCamera }) {
  const videoRef = useRef(null);
  const isActive = stage === "active";
  // The border only fills in once this VIP has actually verified.
  // `pathLength` only ever animates 0 → 1 once (this stays true from
  // here on), so it never replays on later re-renders.
  const reached = stage === "done";
  const [borderFilled, setBorderFilled] = useState(false);
  const radius = Math.max(Math.min(rect.width, rect.height) / 2 - 1.5, 0);
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  // A real path, not a `<circle>` + a CSS `transform: rotate()` hack, so
  // "starts from the top" comes from the path's own M command instead of
  // fighting Framer Motion for control of the element's transform.
  const circleD = circlePath(cx, cy, radius);

  useEffect(() => {
    if (isActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isActive, stream]);

  // Soft ambient bloom behind the crisp neon outline (below) — both use
  // this VIP's own color throughout, scanning included, per their
  // request.
  const glow =
    stage === "done"
      ? `0 0 28px 7px ${vip.color}55`
      : isActive
        ? `0 0 60px 18px ${vip.color}55`
        : "0 0 0 2px rgba(12,26,51,0.1)";

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
      {isActive && stream && !cameraError && (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      )}
      {isActive && !stream && !cameraError && (
        <div className="grid h-full w-full place-items-center">
          <CameraIcon className="h-1/3 w-1/3 animate-pulse text-navy-900/30" />
        </div>
      )}
      {isActive && cameraError && (
        <button
          type="button"
          onClick={onRetryCamera}
          className="grid h-full w-full place-items-center bg-paper-50 px-3 text-center text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-red-600"
        >
          Camera blocked
          <br />
          Tap to retry
        </button>
      )}

      {stage === "idle" && (
        <div className="grid h-full w-full place-items-center">
          <Lock className="h-1/4 w-1/4 text-navy-900/15" />
        </div>
      )}

      {stage === "done" && (
        <div className="relative h-full w-full">
          {/* Wipes open top-to-bottom rather than a plain fade, so the
              photo reads as "just revealed" the instant verification
              lands, not merely appearing. */}
          <motion.img
            src={vip.image}
            alt={vip.name}
            initial={{ clipPath: "inset(0 0 100% 0)", scale: 1.08 }}
            animate={{ clipPath: "inset(0 0 0% 0)", scale: 1 }}
            transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full object-cover"
          />
          {/* A quick flash of the VIP's own color, blooming out from
              behind the photo and fading — the same "verified" beat as
              ScanOverlay's checkmark pulse, echoed here. */}
          <motion.span
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: "easeOut" }}
            style={{ background: vip.color }}
          />
        </div>
      )}

      {isActive && stream && !cameraError && <ScanOverlay onDone={onVerified} color={vip.color} />}

      {/* While being scanned, the frame's own border stays blank — no
          traced outline — and instead a thin line circles right along
          that same border line endlessly, fading out behind it into a
          short tail so the direction of travel (and the fact that it's
          actively circling, not static) is obvious — without reading as a
          big obvious glow. Riding the exact same circle (cx/cy/radius) as
          the border-fill circles below, so it's never offset from the
          frame's actual edge. Its own color always matches the border's
          color elsewhere, so it reads as "this VIP's" light rather than a
          generic effect. */}
      {isActive && (
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
          VIP verifies — the confirmation that they're checked in.
          Rendered last (on top of ScanOverlay's own HUD) so it's never
          covered by it. */}
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
