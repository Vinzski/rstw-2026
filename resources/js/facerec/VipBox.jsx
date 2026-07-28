import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Camera as CameraIcon } from "lucide-react";
import ScanOverlay from "./ScanOverlay";

const SPRING = { type: "spring", stiffness: 190, damping: 24, mass: 1 };

// One VIP's own frame — a single persistent element for their entire
// time on stage, never unmounted. Its `rect` (left/top/size, in real
// pixels — see useStageMetrics) just changes with `stage`, and the
// `layout` prop turns that into a smooth FLIP animation: resting boxy
// in its corner (idle) → lifted, growing, and rounding into a circle at
// center for its turn (active) → landing back in its corner, now a lit
// box (done) → drawn back to center once more, alongside its siblings,
// rounding into an orb again (fusing).
export default function VipBox({ vip, stage, rect, stream, cameraError, onVerified, onRetryCamera }) {
  const videoRef = useRef(null);
  const isActive = stage === "active";
  const isFusing = stage === "fusing";
  const isCircle = isActive || isFusing;

  useEffect(() => {
    if (isActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isActive, stream]);

  const glow =
    stage === "done"
      ? `0 0 28px 7px ${vip.color}55, 0 0 0 3px ${vip.color}`
      : isActive
        ? `0 0 55px 16px ${vip.color}55, 0 0 0 3px ${vip.color}`
        : isFusing
          ? `0 0 80px 26px ${vip.color}aa, 0 0 0 4px ${vip.color}`
          : "0 0 0 2px rgba(12,26,51,0.1)";

  return (
    <motion.div
      layout
      transition={SPRING}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.size,
        height: rect.size,
        borderRadius: isCircle ? "50%" : "22%",
        boxShadow: glow,
      }}
      className="overflow-hidden bg-navy-900/5 transition-shadow duration-700 ease-out"
    >
      {isActive && (
        <motion.span
          className="pointer-events-none absolute -inset-2 rounded-full"
          animate={{ opacity: [0.3, 0.75, 0.3], scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: `0 0 0 2px ${vip.color}77` }}
        />
      )}

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
          className="grid h-full w-full place-items-center bg-red-600/10 px-3 text-center text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-red-700"
        >
          Camera blocked
          <br />
          Tap to retry
        </button>
      )}

      {stage === "idle" && (
        <div className="grid h-full w-full place-items-center">
          <User className="h-1/3 w-1/3 text-navy-900/15" />
        </div>
      )}

      {(stage === "done" || isFusing) && (
        <div
          className="grid h-full w-full place-items-center"
          style={{ background: `linear-gradient(150deg, ${vip.color}33, ${vip.color}77)` }}
        >
          {isFusing ? (
            // The merge reads as "combining into one" rather than "four
            // people," so each orb becomes the org's own mark instead of
            // a person silhouette the instant it starts converging.
            <motion.img
              key="logo"
              src="/images/dost-logo.png"
              alt="DOST Zamboanga Peninsula"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
              className="h-1/2 w-1/2 object-contain mix-blend-multiply"
            />
          ) : (
            <motion.div
              key="person"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
              className="grid h-1/3 w-1/3 place-items-center"
            >
              <User className="h-full w-full" style={{ color: vip.color }} />
            </motion.div>
          )}
        </div>
      )}

      {isActive && stream && !cameraError && <ScanOverlay onDone={onVerified} />}
    </motion.div>
  );
}
