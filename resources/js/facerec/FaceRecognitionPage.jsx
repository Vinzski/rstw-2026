import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrandBorder from "../components/decor/BrandBorder";
import { useCameraStream } from "./useCameraStream";
import { useStageMetrics } from "./useStageMetrics";
import VipBox from "./VipBox";
import RadialLoader from "./RadialLoader";
import LogoFusion from "./LogoFusion";
import { VIPS } from "./data";

const HOLD_BEFORE_REVEAL_MS = 800; // once both verify, how long their own border-fill/flash gets before settling into "reveal"
const REVEAL_HOLD_MS = 3000; // how long the verified photo + logo sit together before the panels clear
// The panels' own fade-out, once both are done — kept deliberately quick
// rather than a slow dissolve: the logo already sits in place directly
// behind each photo (see LogoFusion), so a long fade let the photo
// gradually go translucent and show the logo through it, reading as the
// photo being "moved behind" its logo instead of the photo just leaving.
const CLEAR_FADE_S = 0.12;
const LOGO_HOLD_MS = 1500; // once standing alone, how long the two logos wait before sliding together
const SUCCESS_SOUND_SRC = "/audio/success.mp3";

// booting | scanning | reveal | clearing | settled | merging | leaving —
// see the phase-by-phase rundown above each transition's own effect
// below.
const INITIAL_PHASE = "booting";

// Both VIPs scan side by side, full-screen, at the same time — there's
// no queue, no handoff, no "next panel" the way earlier versions of this
// page worked. The whole run is one straight line:
//
// 1. "booting" — RadialLoader's boot ring; the camera(s) are already
//    warming up underneath it.
// 2. "scanning" — both circular viewfinders active at once. Each VIP's
//    own panel goes "done" (photo revealed, border filled) independently
//    the moment *they* verify — the other panel keeps scanning
//    regardless.
// 3. "reveal" — once both have verified (and had a beat for their own
//    border-fill/flash to finish), their photo holds on screen with each
//    VIP's own institutional logo already sitting directly behind it,
//    dead center of their half (see LogoFusion) — a beat to actually
//    read who just checked in, not just a blip before the next thing.
// 4. "clearing" — the photo/name panels disappear quickly (not a slow
//    dissolve — see CLEAR_FADE_S), uncovering the logo that was behind
//    each one the whole time; the logos themselves are untouched by this
//    and simply remain in place.
// 5. "settled" — the two logos just stand there on their own, uncovered,
//    for a beat (LOGO_HOLD_MS) before doing anything else.
// 6. "merging" — LogoFusion slides those same two logos together into
//    one shared lockup, growing as they meet.
// 7. "leaving" — the existing white-out before handing off to the real
//    landing page (App), which already plays its own boot Loader on
//    mount — no second ring here, so the two loading screens never
//    visibly stack back to back.
export default function FaceRecognitionPage({ onFinished }) {
  const [phase, setPhase] = useState(INITIAL_PHASE);
  const [verified, setVerified] = useState(() => VIPS.map(() => false));

  // Warm the browser's cache for every VIP's photo and logo the instant
  // this page mounts — "reveal" is still a whole scan away, but the
  // province seal alone is 700+KB, and without a head start like this
  // its logo would still be fetching/decoding by the time "clearing"
  // needed to show it already in place, landing visibly later than the
  // photo it's paired with (which has been on screen, already loaded,
  // since the moment that VIP verified).
  useEffect(() => {
    VIPS.forEach((vip) => {
      new Image().src = vip.logo;
      new Image().src = vip.image;
    });
  }, []);

  const camerasWanted = phase === "booting" || phase === "scanning";
  const cam0 = useCameraStream(camerasWanted);
  const cam1 = useCameraStream(camerasWanted);
  const cams = [cam0, cam1];

  const metrics = useStageMetrics();
  const bothVerified = verified.every(Boolean);

  const handleBooted = useCallback(() => setPhase("scanning"), []);

  // Both panels run off the same fixed scan timer, so they typically
  // verify within the same tick of each other — playing this per-panel
  // would fire it twice, nearly simultaneously. One shared "verified"
  // cue for the pair instead, gated to whichever panel gets there first.
  const successSoundPlayedRef = useRef(false);

  const handleVerified = useCallback((i) => {
    setVerified((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
    if (!successSoundPlayedRef.current) {
      successSoundPlayedRef.current = true;
      const sound = new Audio(SUCCESS_SOUND_SRC);
      sound.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (phase !== "scanning" || !bothVerified) return;
    const t = setTimeout(() => setPhase("reveal"), HOLD_BEFORE_REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, bothVerified]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => setPhase("clearing"), REVEAL_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "clearing") return;
    const t = setTimeout(() => setPhase("settled"), CLEAR_FADE_S * 1000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "settled") return;
    const t = setTimeout(() => setPhase("merging"), LOGO_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const handleMergeDone = useCallback(() => setPhase("leaving"), []);

  function rectFor(i) {
    const { slots, circleSize } = metrics;
    return {
      x: slots[i].x - circleSize / 2,
      y: slots[i].y - circleSize / 2,
      width: circleSize,
      height: circleSize,
    };
  }

  function stageFor(i) {
    if (phase === "booting") return "idle";
    return verified[i] ? "done" : "active";
  }

  const panelsVisible = phase === "booting" || phase === "scanning" || phase === "reveal";
  const logosVisible = phase === "reveal" || phase === "clearing" || phase === "settled" || phase === "merging";
  // Clipped to a circle only while the (circular) photo is still there
  // in front of it, covering or fading — matching that shape so nothing
  // pokes out past its edges. Once "clearing" finishes and the photo's
  // fully gone, there's nothing left to match, so the logo drops the
  // clip and shows its own true shape from then on.
  const logosCovered = phase === "reveal" || phase === "clearing";

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper-50">
      <div className="bg-motif-texture absolute inset-0 opacity-70" />
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
                style={{ left: slot.x, top: slot.y + metrics.circleSize / 2 + 20 }}
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
      <AnimatePresence>
        {logosVisible && (
          <LogoFusion vips={VIPS} metrics={metrics} merging={phase === "merging"} covered={logosCovered} onDone={handleMergeDone} />
        )}
      </AnimatePresence>

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
