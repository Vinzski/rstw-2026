import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrandBorder from "../components/decor/BrandBorder";
import { useCameraStream } from "./useCameraStream";
import { useStageMetrics } from "./useStageMetrics";
import VipBox from "./VipBox";
import CornerRing from "./CornerRing";
import FusionFlash from "./FusionFlash";
import VipSpotlight from "./VipSpotlight";
import { VIPS } from "./data";

// Scan order is UL → UR → LR → LL — one clockwise lap. Labels flip
// which side of the box they sit on so they never run off-screen: below
// the top corners (indices 0, 1 — UL, UR), above the bottom ones
// (2, 3 — LR, LL).
const LABEL_BELOW = [true, true, false, false];

const SPOTLIGHT_HOLD_MS = 3000; // how long the full-page reveal holds before wiping away
const FUSE_HOLD_MS = 700; // pause after the 4th verify, before converging
const FUSE_DURATION_MS = 1500; // converge + flash (matches FusionFlash's own duration)
const LOGO_DURATION_MS = 2000; // hold on the big DOST logo
const LEAVE_DURATION_MS = 850; // white-out before the real navigation to "/"

export default function FaceRecognitionPage() {
  const { stream, error, retry } = useCameraStream();
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState("scanning"); // scanning | spotlight | fusing | logo | leaving

  const metrics = useStageMetrics();
  const allVerified = activeIndex >= VIPS.length;
  const converged = phase === "fusing" || phase === "logo";

  // A scan completing doesn't move the box straight to its corner — it
  // takes over the whole screen first (VipSpotlight) so the moment reads
  // as a deliberate reveal. The box only advances once that reveal wipes
  // away, below.
  const handleVerified = useCallback(() => {
    setPhase("spotlight");
  }, []);

  useEffect(() => {
    if (phase !== "spotlight") return;
    const t = setTimeout(() => {
      setActiveIndex((i) => Math.min(i + 1, VIPS.length));
      setPhase("scanning");
    }, SPOTLIGHT_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (!allVerified) return;
    const t = setTimeout(() => setPhase("fusing"), FUSE_HOLD_MS);
    return () => clearTimeout(t);
  }, [allVerified]);

  useEffect(() => {
    if (phase !== "fusing") return;
    const t = setTimeout(() => setPhase("logo"), FUSE_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "logo") return;
    const t = setTimeout(() => setPhase("leaving"), LOGO_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  function rectFor(i) {
    const { bigSize, smallSize, center, corners } = metrics;
    if (converged) {
      const size = smallSize * 0.55;
      return { x: center.x - size / 2, y: center.y - size / 2, size };
    }
    if (i === activeIndex && !allVerified) {
      return { x: center.x - bigSize / 2, y: center.y - bigSize / 2, size: bigSize };
    }
    return { x: corners[i].x - smallSize / 2, y: corners[i].y - smallSize / 2, size: smallSize };
  }

  function stageFor(i) {
    if (converged) return "fusing";
    if (i < activeIndex) return "done";
    if (i === activeIndex && !allVerified) return "active";
    return "idle";
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper-50">
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div className="animate-blob absolute -left-40 top-[-12%] h-[46rem] w-[46rem] rounded-full bg-sky-400/20 blur-2xl" />
      <div className="animate-drift absolute -right-48 bottom-[-18%] h-[42rem] w-[42rem] rounded-full bg-orange-500/15 blur-2xl" />
      <div className="noise-veil" />
      <BrandBorder className="absolute inset-x-0 top-0 z-20 h-[5px] sm:h-[7px]" />

      <motion.div
        animate={{ opacity: phase === "logo" || phase === "leaving" ? 0 : 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 z-10">
          {!converged && <CornerRing center={metrics.center} rx={metrics.rx} ry={metrics.ry} verifiedCount={activeIndex} />}

          {VIPS.map((vip, i) => {
            if (i > activeIndex) return null; // not their turn yet — stay fully unseen, no empty slot to preview
            return (
              <VipBox
                key={vip.id}
                vip={vip}
                stage={stageFor(i)}
                rect={rectFor(i)}
                stream={stream}
                cameraError={i === activeIndex ? error : null}
                onRetryCamera={retry}
                onVerified={i === activeIndex ? handleVerified : undefined}
              />
            );
          })}

          {!converged &&
            VIPS.map((vip, i) => {
              if (i > activeIndex) return null;
              const below = LABEL_BELOW[i];
              const corner = metrics.corners[i];
              return (
                <div
                  key={`label-${vip.id}`}
                  className="absolute -translate-x-1/2 text-center"
                  style={{
                    left: corner.x,
                    top: below ? corner.y + metrics.smallSize / 2 + 14 : undefined,
                    bottom: below ? undefined : metrics.viewport.h - (corner.y - metrics.smallSize / 2 - 14),
                  }}
                >
                  <p className="font-display text-xs font-semibold text-ink sm:text-sm">{vip.name}</p>
                  <p
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] transition-colors duration-500"
                    style={{ color: i < activeIndex ? vip.color : "var(--color-slate-500)" }}
                  >
                    {i < activeIndex ? "Checked in" : "Scanning"}
                  </p>
                </div>
              );
            })}
        </div>
      </motion.div>

      <AnimatePresence>
        {phase === "spotlight" && <VipSpotlight key={VIPS[activeIndex].id} vip={VIPS[activeIndex]} />}
      </AnimatePresence>

      {phase === "fusing" && <FusionFlash />}

      {phase === "logo" && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <motion.img
            src="/images/dost-logo.png"
            alt="DOST Zamboanga Peninsula"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.9, bounce: 0.32, delay: 0.3 }}
            className="h-40 w-40 object-contain mix-blend-multiply sm:h-56 sm:w-56"
            style={{ filter: "drop-shadow(0 0 44px rgba(245,160,81,0.5))" }}
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="font-display text-lg font-semibold uppercase tracking-[0.3em] text-ink sm:text-xl"
          >
            DOST IX
          </motion.p>
        </motion.div>
      )}

      {phase === "leaving" && (
        <motion.div
          className="fixed inset-0 z-50 bg-paper-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: LEAVE_DURATION_MS / 1000, ease: "easeInOut" }}
          onAnimationComplete={() => {
            window.location.href = "/";
          }}
        />
      )}
    </div>
  );
}
