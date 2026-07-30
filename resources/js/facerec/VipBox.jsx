import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Camera as CameraIcon } from "lucide-react";
import ScanOverlay from "./ScanOverlay";
import { lighten, shiftHue } from "./colorUtils";

const BORDER_FILL_DURATION_S = 0.9;

const SPRING = { type: "spring", stiffness: 190, damping: 24, mass: 1 };

// One VIP's own frame — a single persistent element for their entire
// time on stage, never unmounted. Its `rect` (left/top/size, in real
// pixels — see useStageMetrics) never actually changes once it lands in
// its row slot: idle → active camera viewfinder → a lit box once
// checked in, all in that same slot. For the final merge (fusing) it
// just fades out right there rather than resizing into the shared
// center circle — that circle is a separate element (see FuseOrb) that
// fades/scales in fresh, so no single element ever has to animate a
// portrait rectangle into a circle (which visibly warps into an
// "oblong" blob mid-FLIP, since the two shapes don't share an aspect
// ratio).
export default function VipBox({ vip, stage, rect, stream, cameraError, onVerified, onRetryCamera }) {
  const videoRef = useRef(null);
  const isActive = stage === "active";
  const isFusing = stage === "fusing";
  // The border only fills in once this VIP has actually verified — see
  // FaceRecognitionPage's "confirming" sub-phase — not the instant their
  // turn starts. `pathLength` only ever animates 0 → 1 once (this stays
  // true from here on), so it never replays on later re-renders.
  const reached = stage === "done" || isFusing;
  const [borderFilled, setBorderFilled] = useState(false);
  const boxRadius = "20%";
  // Matches the CSS `20%` corner radius above, but in real px — an SVG
  // rect needs actual numbers for rx/ry, not a percentage string.
  const rx = rect.width * 0.2;
  const ry = rect.height * 0.2;

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
        : isFusing
          ? `0 0 80px 26px ${vip.color}aa`
          : "0 0 0 2px rgba(12,26,51,0.1)";

  return (
    <motion.div
      layout
      transition={{ layout: SPRING, opacity: { duration: 0.5, ease: "easeOut" } }}
      animate={{ opacity: isFusing ? 0 : 1 }}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: boxRadius,
        boxShadow: glow,
      }}
      className="overflow-hidden bg-navy-900/5 transition-shadow duration-700 ease-out"
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

      {(stage === "done" || isFusing) && (
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

      {isActive && stream && !cameraError && <ScanOverlay onDone={onVerified} />}

      {/* The border itself "fills in" around the panel the instant this
          VIP verifies — the confirmation that they're checked in, before
          the connector (see RowConnectors) travels onward to the next
          panel. Rendered last (on top of ScanOverlay's own orange HUD)
          so it's never covered or color-confused by it. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {/* A full, already-complete neon-tube outline that continuously
            chases around the border while this VIP is being scanned —
            decorative, not a progress indicator. A real neon tube isn't
            one flat hue: this blends a bright near-white core through
            this VIP's own color and a shifted accent hue, tiled around
            the perimeter and animated via native SVG SMIL (not
            framer-motion — gradients aren't one of its animatable
            elements) so the color band keeps traveling rather than just
            fading in and out in place. The actual fill-in (below) only
            plays once the scan itself is done, so the two reads stay
            distinct: "being scanned" vs. "verified." */}
        {isActive && (
          <>
            <linearGradient
              id={`neon-${vip.id}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="56"
              y2="0"
              spreadMethod="repeat"
            >
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="0 0"
                to="56 0"
                dur="1.6s"
                repeatCount="indefinite"
              />
              <stop offset="0%" stopColor={lighten(vip.color, 0.85)} />
              <stop offset="25%" stopColor={vip.color} />
              <stop offset="55%" stopColor={shiftHue(vip.color, 40)} />
              <stop offset="80%" stopColor={vip.color} />
              <stop offset="100%" stopColor={lighten(vip.color, 0.85)} />
            </linearGradient>
            <rect
              x={1.5}
              y={1.5}
              width={Math.max(rect.width - 3, 0)}
              height={Math.max(rect.height - 3, 0)}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={`url(#neon-${vip.id})`}
              strokeWidth="3"
              style={{
                filter: `drop-shadow(0 0 4px ${vip.color}) drop-shadow(0 0 14px ${vip.color}) drop-shadow(0 0 26px ${vip.color}aa)`,
              }}
            />
          </>
        )}

        <motion.rect
          x={1.5}
          y={1.5}
          width={Math.max(rect.width - 3, 0)}
          height={Math.max(rect.height - 3, 0)}
          rx={rx}
          ry={ry}
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
          <motion.rect
            x={1.5}
            y={1.5}
            width={Math.max(rect.width - 3, 0)}
            height={Math.max(rect.height - 3, 0)}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={vip.color}
            strokeWidth="3"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{ transformOrigin: `${rect.width / 2}px ${rect.height / 2}px` }}
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
    </motion.div>
  );
}
