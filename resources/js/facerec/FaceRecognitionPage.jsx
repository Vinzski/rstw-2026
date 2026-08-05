import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrandBorder from "../components/decor/BrandBorder";
import { useStageMetrics } from "./useStageMetrics";
import VipBox from "./VipBox";
import RadialLoader from "./RadialLoader";
import LogoFusion from "./LogoFusion";
import { configBroadcast } from "../echo";
import { VIPS, BACKUP_VIPS } from "./data";
import { playSound } from "../lib/audio";

const HOLD_BEFORE_REVEAL_MS = 800; // once both verify, how long their own border-fill/flash gets before settling into "reveal"
const REVEAL_HOLD_MS = 3000; // how long the verified photo + logo sit together before the panels clear
// The panels' own fade out, once both are done — opacity only, no scale:
// the logo already sits in place directly behind each photo at the exact
// same size (see LogoFusion), so a plain fade dissolves straight into it.
// Scaling the photo layer without scaling the (separate) logo layer to
// match made the photo shrink faster than the logo could "catch up",
// reading as the photo popping behind an oversized logo instead of
// smoothly dissolving into it.
const CLEAR_FADE_S = 0.6;
const LOGO_HOLD_MS = 1500; // once standing alone, how long the two logos wait before sliding together
const SUCCESS_SOUND_SRC = "/audio/success.mp3";
const HUD_SOUND_SRC = "/audio/HUD Activation Sound Effect.mp3";
const INITIALIZING_MS = 5150; // matches HUD_SOUND_SRC's own length exactly

// booting | waiting | reveal | clearing | settled | merging | leaving —
// see the phase-by-phase rundown above each transition's own effect
// below.
const INITIAL_PHASE = "booting";

// Face recognition itself happens on a separate device/app entirely —
// this page never touches a camera. It just sits and waits on the "vip"
// broadcast channel (see echo.js/configBroadcast) for a "VipEvent" per
// person, matches it to one of the two slots below by `designation`, and
// reacts. The whole run is one straight line:
//
// 1. "booting" — RadialLoader's boot ring.
// 2. "waiting" — both panels sit locked (gray, lock icon — see VipBox's
//    "idle" stage) until their own broadcast arrives. The Secretary is
//    expected first, then the Governor, but nothing here enforces that
//    order — each slot just lights up independently the moment *its own*
//    VipEvent lands, same as the other panel.
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
  // null until that slot's own VipEvent arrives, then
  // { name, image, affiliation, designation }.
  const [verifiedData, setVerifiedData] = useState(() => VIPS.map(() => null));

  // Warm the browser's cache for every VIP's logo the instant this page
  // mounts — their actual photo only exists once they verify (it comes
  // in on the broadcast itself, not known ahead of time), but the logo is
  // fixed per slot and can start loading right away.
  useEffect(() => {
    VIPS.forEach((slot) => {
      new Image().src = slot.logo;
    });
  }, []);

  const metrics = useStageMetrics();
  const bothVerified = verifiedData.every(Boolean);

  // Marks the system actually coming online — both panels get a visible
  // "activating" beat (see VipBox) timed to run exactly as long as the
  // HUD sound below, rather than per-scan (there's no more per-scan
  // trigger to hang either on).
  const [initializing, setInitializing] = useState(false);

  const handleBooted = useCallback(() => {
    setPhase("waiting");
    setInitializing(true);
    playSound(HUD_SOUND_SRC);
  }, []);

  useEffect(() => {
    if (!initializing) return;
    const t = setTimeout(() => setInitializing(false), INITIALIZING_MS);
    return () => clearTimeout(t);
  }, [initializing]);

  // Shared by both the real broadcast and the Space-bar fallback below —
  // same matching/reveal path either way, so a backup check-in looks and
  // behaves identically to a real one once it lands.
  const applyVipData = useCallback((data) => {
    if (!data?.designation) return;
    const i = VIPS.findIndex((slot) => slot.designation.toLowerCase() === data.designation.toLowerCase());
    if (i === -1) return;

    setVerifiedData((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = data;
      return next;
    });
  }, []);

  // Each VIP gets their own success cue, independent of the other — two
  // real people checking in at two different real moments, not a
  // synchronized pair like the old local-scan flow was. Watches
  // `verifiedData` itself (rather than playing inline inside
  // `applyVipData`) so it fires exactly once per slot that actually
  // transitions from unverified to verified, regardless of whether that
  // came from the real broadcast or the Space-bar fallback.
  const prevVerifiedRef = useRef(verifiedData);
  useEffect(() => {
    verifiedData.forEach((data, i) => {
      if (data && !prevVerifiedRef.current[i]) {
        playSound(SUCCESS_SOUND_SRC);
      }
    });
    prevVerifiedRef.current = verifiedData;
  }, [verifiedData]);

  useEffect(() => {
    configBroadcast("VipEvent", "vip", (e) => applyVipData(e?.vip));
  }, [applyVipData]);

  // Manual fallback for a live event: if the real scanner has a technical
  // issue and never broadcasts, an operator watching this screen can
  // press Space to fill both slots from BACKUP_VIPS instead of it sitting
  // stuck on "Awaiting check-in." Only live while genuinely waiting on
  // verification — not during "booting" (nothing to skip yet) and not
  // once already underway (an accidental press shouldn't re-trigger
  // anything past that point).
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code !== "Space" || phase !== "waiting" || bothVerified) return;
      e.preventDefault();
      BACKUP_VIPS.forEach(applyVipData);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, bothVerified, applyVipData]);

  useEffect(() => {
    if (phase !== "waiting" || !bothVerified) return;
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
    return verifiedData[i] ? "done" : "idle";
  }

  const panelsVisible = phase === "booting" || phase === "waiting" || phase === "reveal";
  // Mounted from "waiting" onward (not held back for the "reveal" phase)
  // so each VIP's own logo is already in the DOM, directly behind their
  // panel, the instant their photo starts its wipe-reveal — see the
  // `verified` prop passed to LogoFusion below, which gates each logo
  // individually so it never lags behind its own photo the way waiting
  // for the shared "reveal" phase used to.
  const logosVisible = phase === "waiting" || phase === "reveal" || phase === "clearing" || phase === "settled" || phase === "merging";
  // Clipped to a circle only while the (circular) photo is still opaque
  // and sitting in front of it — matching that shape so nothing pokes
  // out past its edges. Dropped the instant "clearing" starts (the photo
  // begins fading), not once it finishes: LogoFusion animates the clip's
  // release over `CLEAR_FADE_S` (passed down as `uncoverS`), the same
  // duration as the photo's own fade, so the two finish together instead
  // of the logo's true (square, for a mark like DOST's) shape popping in
  // afterward.
  const logosCovered = phase === "waiting" || phase === "reveal";

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
          {/* Each VIP's own half of the screen — gray by default,
              switching to that VIP's own assigned color (both kept
              subtle, not a solid fill) the instant *they* verify.
              Rendered first so it sits behind the circle/label, not as
              part of the circle itself. */}
          {VIPS.map((slot, i) => (
            <div
              key={`half-bg-${slot.id}`}
              className="absolute inset-y-0 transition-colors duration-700 ease-out"
              style={{
                left: i * metrics.slotWidth,
                width: metrics.slotWidth,
                backgroundColor: stageFor(i) === "done" ? `${slot.color}4D` : "rgba(12,26,51,0.1)",
              }}
            />
          ))}

          {/* The literal split between the two halves — a thin vertical
              line down the center, so the two background tints read as
              two distinct sides rather than one wash bleeding together. */}
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-navy-900/10" />

          {VIPS.map((slot, i) => {
            const data = verifiedData[i];
            return (
              <VipBox
                key={slot.id}
                vip={{ ...slot, ...data }}
                stage={stageFor(i)}
                rect={rectFor(i)}
                initializing={initializing}
                flip
              />
            );
          })}

          {VIPS.map((slot, i) => {
            const data = verifiedData[i];
            const slotPos = metrics.slots[i];
            const color = phase === "booting" ? "var(--color-slate-500)" : slot.color;
            return (
              <div
                key={`label-${slot.id}`}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: slotPos.x, top: slotPos.y + metrics.circleSize / 2 + 20 }}
              >
                <p className="font-display text-base font-semibold text-ink drop-shadow sm:text-lg">
                  {data ? data.name : slot.designation}
                </p>
                <p
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 sm:text-xs"
                  style={{ color }}
                >
                  {data ? data.designation : "Awaiting check-in"}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>{phase === "booting" && <RadialLoader onDone={handleBooted} />}</AnimatePresence>
      <AnimatePresence>
        {logosVisible && (
          <LogoFusion
            vips={VIPS}
            metrics={metrics}
            verified={verifiedData.map(Boolean)}
            merging={phase === "merging"}
            covered={logosCovered}
            uncoverS={CLEAR_FADE_S}
            onDone={handleMergeDone}
          />
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
