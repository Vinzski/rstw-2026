import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Lenis from "lenis";
import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import ProgressRail from "./components/ProgressRail";
import AutoPlayButton from "./components/AutoPlayButton";
import EmberField from "./components/EmberField";
import FireworksBurst from "./components/FireworksBurst";
import CustomCursor from "./components/CustomCursor";
import CinematicTrack from "./components/CinematicTrack";
import FinaleAlchemy from "./components/FinaleAlchemy";
import Footer from "./components/Footer";
import { LenisProvider } from "./lib/lenisContext";
import { VelocityProvider } from "./lib/velocityContext";
import { AppReadyProvider } from "./lib/appReadyContext";
import { HeroChromeRevealProvider } from "./lib/heroChromeContext";
import useAutoPlay from "./hooks/useAutoPlay";
import { chapters, cinematicRanges } from "./data/content";
import { diveHandoffs } from "./lib/glyphDive";
import { getTrackGeometry, progressToScrollY } from "./lib/navigate";
import { playLoop } from "./lib/audio";
import { useSpeaking } from "./lib/speech";

// The stop the pre-reveal preview tour starts from (see STOPS in
// useAutoPlay): index 0 is Intro's own stop, which the preview skips —
// index 1 is About's theme statement, its actual opening view now.
const PREVIEW_START_STOP = 1;

// Bed music for the preview tour only — the one stretch of the visit
// where the narrator is actually talking (see tourNarration/useAutoPlay).
// Ducks under the voice while a line is playing (see the isNarrating
// effect below, driven by lib/speech.js's useSpeaking) and comes back
// up between lines/during scroll hops, rather than sitting at one fixed
// volume the whole time — narration already plays at full gain
// (HTMLMediaElement's own default) with no further headroom to "turn
// the voice up", and a mastered music track reads far louder than
// spoken word even at the same nominal volume, so a flat compromise
// volume either buried the narration or left the music inaudible
// between lines.
const PREVIEW_MUSIC_SRC = "/audio/background%20music/sunsides-exciting-event-151499.mp3";
const PREVIEW_MUSIC_VOLUME_IDLE = 0.35;
const PREVIEW_MUSIC_VOLUME_DUCKED = 0.12;
const PREVIEW_MUSIC_DUCK_FADE_MS = 400;
// Long enough to read as the music hushing to silence rather than being
// cut: this fade is what plays as the screen dims into the finale scene
// (see FinaleAlchemy), which then runs over real quiet.
const PREVIEW_MUSIC_FADE_OUT_MS = 900;

// How far into the master scroll track counts as "the preview has
// reached the real end" — a little short of 1 so a manual scroll (not
// just the driven tour) reaching roughly the same place still triggers
// the handoff to the boot sequence, without waiting on the exact last
// pixel of a chapter that, by design, settles and holds rather than
// diving into anything further.
const FINALE_PROGRESS = 0.985;

export default function App() {
  // The visit's own boot arc, as one phase instead of two loosely-linked
  // booleans:
  //   "preview"     — no Loader on screen yet. The track lands straight
  //                   on About (Intro stays unmounted — see
  //                   CinematicTrack's excludeIntro) and runs the same
  //                   stop list the Play button uses, skipping Intro's
  //                   own stop, through to Highlights — automatically,
  //                   no button.
  //   "finale"      — FinaleAlchemy: the last card dims away entirely,
  //                   a beat of darkness, then the narrator's tease over
  //                   a lit chemistry scene, ending in the burst of
  //                   light that hands off to the countdown.
  //   "booting"     — the Loader/countdown + RstwAssembly ring: exactly
  //                   the sequence that used to fire right after the
  //                   kiosk handoff, just triggered here instead, once
  //                   the finale's own burst has cleared.
  //   "celebrating" — FireworksBurst, unchanged.
  //   "site"        — normal interactive site, Intro revealed at the top.
  const [phase, setPhase] = useState("preview");
  const lenisRef = useRef(null);
  // Guards handlePreviewFinale against firing twice — the driven tour's
  // own finale stop and the manual-scroll fallback watcher below can
  // both cross the finish line within a tick of each other.
  const finaleFiredRef = useRef(false);

  const handleLoaded = useCallback(() => setPhase("celebrating"), []);
  const handleCelebrated = useCallback(() => setPhase("site"), []);

  // The persistent chrome (nav logo, autoplay button, progress rail
  // corners) stays hidden until the hero's own boot sequence reveals it —
  // see IntroChapter, which calls the reveal function this provides down
  // via context the moment it reveals its own supporting text. Since
  // Intro never mounts during "preview", this simply never flips true
  // until the real reveal — no extra wiring needed to keep the chrome
  // hidden through the preview tour.
  const [heroChromeVisible, setHeroChromeVisible] = useState(false);
  const revealHeroChrome = useCallback(() => setHeroChromeVisible(true), []);

  // The narrative chapters all live inside one pinned track with no
  // sections of their own, so CinematicTrack reports which of them is
  // active from its own scroll progress — that's the only source of
  // truth now that every chapter is part of that track.
  const [cinematicActive, setCinematicActive] = useState("about");

  const {
    isPlaying,
    isRewinding,
    controlsVisible,
    activeOverride,
    stepInfo,
    start: startAutoPlay,
    stop: stopAutoPlay,
    releaseOverride: releaseAutoPlayOverride,
  } = useAutoPlay(lenisRef);

  // Ends the tour and hands to the finale scene rather than cutting
  // straight from the last narrated card to the countdown. Leaving
  // "preview" is itself what hushes the bed music — the music effect's
  // own cleanup fades it out (see PREVIEW_MUSIC_FADE_OUT_MS) as the
  // screen dims. Idempotent: both the driven tour's own finale stop and
  // the manual-scroll fallback below call this, and only the first
  // should count.
  const handlePreviewFinale = useCallback(() => {
    if (finaleFiredRef.current) return;
    finaleFiredRef.current = true;
    stopAutoPlay();
    releaseAutoPlayOverride();
    setPhase("finale");
  }, [stopAutoPlay, releaseAutoPlayOverride]);

  // Once the finale's burst has filled the screen: reset the track to
  // the real top and start the boot sequence (Loader/RstwAssembly
  // countdown, then fireworks, then Intro's own reveal) — the same
  // handoff FaceRecognitionPage used to trigger directly.
  const handleFinaleDone = useCallback(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    // Intro hasn't dove through anything in this run — clear the handoff
    // CinematicLayers forced open for About so Intro's own dive starts
    // from a real, un-forced 0 once it mounts fresh at the top.
    diveHandoffs.intro.full.set(0);
    setPhase("booting");
  }, []);

  // Kicks off the pre-reveal tour the instant the track is up: lands
  // straight on About's theme statement and free-runs the same stop list
  // the Play button uses, but hands off to the boot sequence at the end
  // instead of rewinding back to a hero that isn't showing yet. The
  // cleanup covers React StrictMode's dev-only double-invoke — without
  // it, the tour would start twice with an orphaned first timer chain
  // still running underneath the second.
  useEffect(() => {
    if (phase !== "preview") return;
    startAutoPlay({ fromIndex: PREVIEW_START_STOP, instantFirst: true, onFinale: handlePreviewFinale });
    return () => stopAutoPlay();
  }, [phase, startAutoPlay, stopAutoPlay, handlePreviewFinale]);

  // Safety net for a canceled preview (a manual scroll stops the driven
  // tour, same as it does for the Play button's own tour): keeps the
  // track from ever showing the blank stretch Intro would otherwise
  // occupy (it's deliberately unmounted this phase), and still reaches
  // the boot handoff if the visitor scrolls all the way to the real end
  // on their own instead of leaving the tour running.
  useEffect(() => {
    if (phase !== "preview") return;
    const aboutStart = cinematicRanges.find((r) => r.id === "about")?.start ?? 0;

    function onScroll() {
      // handlePreviewFinale's own reset-to-0 fires a native scroll event
      // that would otherwise land right back here while this effect is
      // still attached (phase hasn't flipped away from "preview" yet) —
      // and the floor clamp below would immediately snap that reset back
      // up to About's start, undoing it a few lines before setPhase ever
      // runs. Bailing out on the same guard handlePreviewFinale sets as
      // its very first line closes that race.
      if (finaleFiredRef.current) return;
      const geometry = getTrackGeometry();
      if (!geometry) return;
      const floorY = progressToScrollY(aboutStart, geometry);
      if (floorY != null && window.scrollY < floorY) {
        if (lenisRef.current) lenisRef.current.scrollTo(floorY, { immediate: true, force: true });
        else window.scrollTo(0, floorY);
        return;
      }
      // Only a fallback for a canceled tour scrolling there on its own —
      // while the driven tour is still playing, its own last stop has a
      // narration line (see useAutoPlay/tourNarration) that needs to
      // finish before the boot handoff fires; the glide toward that stop
      // crosses FINALE_PROGRESS well before it lands and speaks, so
      // triggering from here too would cut that line off before it ever
      // starts.
      if (isPlaying) return;
      const p = geometry.scrollable > 0 ? (window.scrollY - geometry.docTop) / geometry.scrollable : 0;
      if (p >= FINALE_PROGRESS) handlePreviewFinale();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase, isPlaying, handlePreviewFinale]);

  // Bed music for exactly the "preview" phase — the tour narrator is
  // only ever talking during this stretch (see tourNarration/
  // useAutoPlay), and the finale scene that follows deliberately plays
  // over silence. Starts the instant preview does (this phase is the
  // initial state, so that's on mount); leaving the phase runs this
  // cleanup, whose stop() fade is the hush heard as the screen dims
  // into the finale. Kept in a ref (not just the effect's own closure)
  // so the ducking effect below can reach the same controls to adjust
  // volume mid-playback without restarting the track.
  const musicRef = useRef(null);
  useEffect(() => {
    if (phase !== "preview") return undefined;
    const music = playLoop(PREVIEW_MUSIC_SRC, { volume: PREVIEW_MUSIC_VOLUME_IDLE, fadeOutMs: PREVIEW_MUSIC_FADE_OUT_MS });
    musicRef.current = music;
    return () => {
      musicRef.current = null;
      music.stop();
    };
  }, [phase]);

  // Ducks the bed music under the narrator and lets it back up between
  // lines — isNarrating (lib/speech.js's useSpeaking) flips for both
  // the tour narration and the pre-generated-clip/speechSynthesis
  // fallback alike, so this doesn't need to know which is talking, just
  // that something is. A no-op whenever music isn't currently playing
  // (outside "preview", musicRef stays null).
  const isNarrating = useSpeaking();
  useEffect(() => {
    musicRef.current?.setVolume(
      isNarrating ? PREVIEW_MUSIC_VOLUME_DUCKED : PREVIEW_MUSIC_VOLUME_IDLE,
      PREVIEW_MUSIC_DUCK_FADE_MS,
    );
  }, [isNarrating]);

  // While the auto-tour is driving (and for a beat after it stops), trust
  // its own step index over cinematicActive — belt-and-suspenders should
  // the master-progress "change" event ever lag behind a fast
  // successive-jump sequence the way organic scrolling never produces.
  const active = activeOverride ?? cinematicActive;

  const rawVelocity = useMotionValue(0);
  const velocity = useSpring(rawVelocity, { damping: 32, stiffness: 220, mass: 0.4 });

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ({ velocity: v }) => {
      rawVelocity.set(Math.min(Math.abs(v), 60));
    });

    let frameId;
    function raf(time) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [rawVelocity]);

  // Locked for "finale" and "booting": both play over a full-screen
  // layer with nothing to scroll, and the countdown in particular needs
  // the page to hold still under it so nothing accumulated from a stray
  // wheel/touch suddenly releases once the Loader clears. Started
  // everywhere else, including "preview" — the preview tour's own jumps
  // and glides need scrollTo to actually move the page, and a manual
  // scroll is allowed to cancel it.
  useEffect(() => {
    if (phase === "finale" || phase === "booting") lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, [phase]);

  // Nothing on this site is meant to be dragged — but images and selected
  // text are natively draggable by default in every browser, and a
  // click-drag gesture during scroll (easy to trigger on a trackpad, or a
  // mouse without a wheel) is enough to kick off the browser's own
  // drag-and-drop, complete with its ghost-image/text preview trailing
  // the cursor. That preview isn't part of this app's rendering (it's
  // painted by the browser engine itself), so it can pop up over any
  // image or heading — most noticeably the hero's assembled letters and
  // the "0" of the year — as a stray artifact with no relation to
  // anything scroll-position-driven. Blocking `dragstart` outright is the
  // one place that heads off every variant of it at once, instead of
  // hunting down which specific element got grabbed.
  useEffect(() => {
    function preventDrag(e) {
      e.preventDefault();
    }
    window.addEventListener("dragstart", preventDrag);
    return () => window.removeEventListener("dragstart", preventDrag);
  }, []);

  return (
    <LenisProvider value={lenisRef}>
      <VelocityProvider value={velocity}>
        <AppReadyProvider value={phase !== "booting"}>
          <HeroChromeRevealProvider value={revealHeroChrome}>
            {phase === "finale" && <FinaleAlchemy onDone={handleFinaleDone} />}
            <AnimatePresence>
              {phase === "booting" && <Loader onDone={handleLoaded} />}
            </AnimatePresence>
            {phase === "celebrating" && <FireworksBurst onDone={handleCelebrated} />}

            {phase !== "booting" && phase !== "finale" && <EmberField />}
            <CustomCursor />

            <div className="relative bg-paper-50">
              {/* `.bg-motif-texture` itself carries no opacity — every
                  other caller pairs it with its own overlay + opacity
                  utility (see IntroChapter, AboutChapter, etc.); applying
                  the class straight to this wrapper would otherwise wash
                  out real content (Navbar/main/Footer) along with it. */}
              <div className="bg-motif-texture pointer-events-none absolute inset-0 opacity-30" />
              <Navbar hidden={(isPlaying && !controlsVisible) || !heroChromeVisible} />
              {phase !== "booting" && (
                <ProgressRail chapters={chapters} active={active} stepOverride={stepInfo} hidden={!heroChromeVisible} />
              )}
              {phase !== "booting" && (
                <AutoPlayButton
                  isPlaying={isPlaying}
                  controlsVisible={controlsVisible}
                  onStart={startAutoPlay}
                  onStop={stopAutoPlay}
                  hidden={!heroChromeVisible}
                />
              )}
              <main>
                <CinematicTrack
                  onActiveChange={setCinematicActive}
                  isAutoPlaying={isPlaying}
                  forceMountAll={isRewinding}
                  excludeIntro={phase === "preview" || phase === "finale"}
                />
              </main>
              <Footer />
            </div>
          </HeroChromeRevealProvider>
        </AppReadyProvider>
      </VelocityProvider>
    </LenisProvider>
  );
}
