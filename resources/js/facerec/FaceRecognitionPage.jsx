import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrandBorder from "../components/decor/BrandBorder";
import { useCameraStream } from "./useCameraStream";
import { useStageMetrics } from "./useStageMetrics";
import VipBox from "./VipBox";
import RadialLoader from "./RadialLoader";
import LogoFusion from "./LogoFusion";
import { VIPS } from "./data";

const HOLD_BEFORE_CLEAR_MS = 800; // once both verify, how long their own border-fill/flash gets before the panels start fading
const CLEAR_FADE_S = 0.6; // the panels' own fade-out, once both are done

// booting | scanning | clearing | logos | leaving — see the phase-by-
// phase rundown above each transition's own effect below.
const INITIAL_PHASE = "booting";

// Both VIPs scan side by side, full-screen, at the same time — there's
// no queue, no handoff, no "next panel" the way earlier versions of this
// page worked. The whole run is one straight line:
//
// 1. "booting" — RadialLoader's boot ring; the camera(s) are already
//    warming up underneath it.
// 2. "scanning" — both panels active at once. Each VIP's own panel goes
//    "done" (photo revealed, border filled) independently the moment
//    *they* verify — the other panel keeps scanning regardless.
// 3. "clearing" — once both have verified (and had a beat for their own
//    border-fill/flash to finish), both cameras are released and the
//    panels fade away together.
// 4. "logos" — DOST's mark and the province seal arrive where each
//    panel just was, hold, then slide together into one shared lockup
//    (see LogoFusion).
// 5. "leaving" — the existing white-out before handing off to the real
//    landing page (App), which already plays its own boot Loader on
//    mount — no second ring here, or the two loading screens visibly
//    stack back to back.
export default function FaceRecognitionPage({ onFinished }) {
  const [phase, setPhase] = useState(INITIAL_PHASE);
  const [verified, setVerified] = useState(() => VIPS.map(() => false));

  const camerasWanted = phase === "booting" || phase === "scanning";
  const cam0 = useCameraStream(camerasWanted);
  const cam1 = useCameraStream(camerasWanted);
  const cams = [cam0, cam1];

  const metrics = useStageMetrics();
  const bothVerified = verified.every(Boolean);

  const handleBooted = useCallback(() => setPhase("scanning"), []);

  const handleVerified = useCallback((i) => {
    setVerified((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }, []);

  useEffect(() => {
    if (phase !== "scanning" || !bothVerified) return;
    const t = setTimeout(() => setPhase("clearing"), HOLD_BEFORE_CLEAR_MS);
    return () => clearTimeout(t);
  }, [phase, bothVerified]);

  useEffect(() => {
    if (phase !== "clearing") return;
    const t = setTimeout(() => setPhase("logos"), CLEAR_FADE_S * 1000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleLogosDone = useCallback(() => setPhase("leaving"), []);

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
    if (phase === "booting") return "idle";
    return verified[i] ? "done" : "active";
  }

  const panelsVisible = phase === "booting" || phase === "scanning";

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper-50">
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div className="animate-blob absolute -left-40 top-[-12%] h-[46rem] w-[46rem] rounded-full bg-sky-400/20 blur-2xl" />
      <div className="animate-drift absolute -right-48 bottom-[-18%] h-[42rem] w-[42rem] rounded-full bg-orange-500/15 blur-2xl" />
      <div className="noise-veil" />
      <BrandBorder className="absolute inset-x-0 top-0 z-20 h-[5px] sm:h-[7px]" />

      <motion.div
        animate={{ opacity: panelsVisible ? 1 : 0 }}
        transition={{ duration: CLEAR_FADE_S, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 z-10">
          {VIPS.map((vip, i) => (
            <VipBox
              key={vip.id}
              vip={vip}
              stage={stageFor(i)}
              rect={rectFor(i)}
              stream={cams[i].stream}
              cameraError={cams[i].error}
              onRetryCamera={cams[i].retry}
              onVerified={() => handleVerified(i)}
            />
          ))}

          {VIPS.map((vip, i) => {
            const slot = metrics.slots[i];
            const color = phase === "booting" ? "var(--color-slate-500)" : vip.color;
            return (
              <div
                key={`label-${vip.id}`}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: slot.x, top: slot.y - metrics.slotHeight / 2 + 28 }}
              >
                <p className="font-display text-base font-semibold text-ink drop-shadow sm:text-lg">{vip.name}</p>
                <p
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 sm:text-xs"
                  style={{ color }}
                >
                  {vip.title}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>{phase === "booting" && <RadialLoader onDone={handleBooted} />}</AnimatePresence>
      <AnimatePresence>{phase === "logos" && <LogoFusion onDone={handleLogosDone} />}</AnimatePresence>

      {phase === "leaving" && (
        <motion.div
          className="fixed inset-0 z-50 bg-paper-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.85, ease: "easeInOut" }}
          onAnimationComplete={onFinished}
        />
      )}
    </div>
  );
}
