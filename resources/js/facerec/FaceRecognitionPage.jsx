import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrandBorder from "../components/decor/BrandBorder";
import { useCameraStream } from "./useCameraStream";
import { useStageMetrics } from "./useStageMetrics";
import VipBox from "./VipBox";
import FusionFlash from "./FusionFlash";
import RowConnectors from "./RowConnectors";
import FuseOrb from "./FuseOrb";
import LogoBadge from "./LogoBadge";
import RadialLoader from "./RadialLoader";
import { VIPS } from "./data";

const FUSE_HOLD_MS = 700; // pause after the 4th verify, before converging
const FUSE_DURATION_MS = 1500; // converge + flash (matches FusionFlash's own duration)
const LOGO_DURATION_MS = 2000; // hold on the big DOST logo
const LEAVE_DURATION_MS = 850; // white-out before handing off to the real landing page

// The handoff from one VIP to the next is three beats, in order: (1)
// "confirming" — the VIP who just verified holds while their own border
// fills in and flashes (see VipBox — its border only ever fills once
// `stage` is "done"), (2) "traveling" — only once that's finished does
// the connector actually travel to the next panel (see RowConnectors'
// FLOW_DURATION_S, which this is sized to match), (3) the next VIP goes
// "active" and starts scanning immediately once it arrives. The last
// VIP has no next panel to travel to, so their handoff skips straight
// from confirming to done.
const CONFIRM_MS = 1500; // ~ VipBox's own border-fill + flash duration
const FLOW_MS = 1600; // ~ RowConnectors' FLOW_DURATION_S

export default function FaceRecognitionPage({ onFinished }) {
  const { stream, error, retry } = useCameraStream();
  const [activeIndex, setActiveIndex] = useState(0);
  // loading | scanning | fusing | logo | leaving — "loading" is the
  // one-time radial boot screen, played once before VIP 1 starts (not
  // repeated per VIP).
  const [phase, setPhase] = useState("loading");
  const [subPhase, setSubPhase] = useState("scanning"); // scanning | confirming | traveling — see the handoff comment above

  const metrics = useStageMetrics(VIPS.length);
  const allVerified = activeIndex >= VIPS.length;
  const converged = phase === "fusing" || phase === "logo";

  const handleLoaded = useCallback(() => setPhase("scanning"), []);

  // ScanOverlay itself already holds on its own "Identity Verified"
  // checkmark for a beat before calling this — so a scan completing goes
  // straight into that VIP's own confirm beat, below.
  const handleVerified = useCallback(() => {
    setSubPhase("confirming");
  }, []);

  useEffect(() => {
    if (subPhase !== "confirming") return;
    const isLast = activeIndex >= VIPS.length - 1;
    const t = setTimeout(() => {
      if (isLast) {
        setActiveIndex((i) => i + 1);
        setSubPhase("scanning");
      } else {
        setSubPhase("traveling");
      }
    }, CONFIRM_MS);
    return () => clearTimeout(t);
  }, [subPhase, activeIndex]);

  useEffect(() => {
    if (subPhase !== "traveling") return;
    const t = setTimeout(() => {
      setActiveIndex((i) => i + 1);
      setSubPhase("scanning");
    }, FLOW_MS);
    return () => clearTimeout(t);
  }, [subPhase]);

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
    const { slotWidth, slotHeight, slots } = metrics;
    return {
      x: slots[i].x - slotWidth / 2,
      y: slots[i].y - slotHeight / 2,
      width: slotWidth,
      height: slotHeight,
    };
  }

  function stageFor(i) {
    // Nobody scans while the boot loader is still up — VIP 1 only goes
    // "active" once it hands off via `handleLoaded`.
    if (phase === "loading") return "idle";
    if (converged) return "fusing";
    if (i < activeIndex) return "done";
    // Confirming/traveling: this VIP has already verified — they read as
    // "done" (photo revealed, border filling/settled) even though the
    // parent hasn't advanced activeIndex to the next one quite yet.
    if (i === activeIndex && !allVerified) return subPhase === "scanning" ? "active" : "done";
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
          {!converged && <RowConnectors slots={metrics.slots} vips={VIPS} activeIndex={activeIndex} subPhase={subPhase} />}

          {VIPS.map((vip, i) => (
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
          ))}

          {!converged &&
            VIPS.map((vip, i) => {
              const slot = metrics.slots[i];
              const status =
                i < activeIndex
                  ? "Checked in"
                  : i === activeIndex
                    ? subPhase === "scanning"
                      ? "Scanning"
                      : "Checked in"
                    : "Pending";
              const color = i <= activeIndex ? vip.color : "var(--color-slate-500)";
              return (
                <div
                  key={`label-${vip.id}`}
                  className="absolute -translate-x-1/2 text-center"
                  style={{ left: slot.x, top: slot.y + metrics.slotHeight / 2 + 14 }}
                >
                  <p className="font-display text-xs font-semibold text-ink sm:text-sm">{vip.name}</p>
                  <p
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] transition-colors duration-500"
                    style={{ color }}
                  >
                    {status}
                  </p>
                </div>
              );
            })}
          {converged &&
            VIPS.map((vip, i) => (
              <FuseOrb key={vip.id} center={metrics.center} size={metrics.fuseSize} color={vip.color} delay={i * 0.06} />
            ))}
        </div>
      </motion.div>

      {phase === "fusing" && <FusionFlash />}

      {phase === "logo" && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.9, bounce: 0.32, delay: 0.3 }}
          >
            <LogoBadge size={192} glow />
          </motion.div>
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
          onAnimationComplete={onFinished}
        />
      )}

      <AnimatePresence>{phase === "loading" && <RadialLoader onDone={handleLoaded} />}</AnimatePresence>
    </div>
  );
}
