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
import Footer from "./components/Footer";
import { LenisProvider } from "./lib/lenisContext";
import { VelocityProvider } from "./lib/velocityContext";
import { AppReadyProvider } from "./lib/appReadyContext";
import { HeroChromeRevealProvider } from "./lib/heroChromeContext";
import useAutoPlay from "./hooks/useAutoPlay";
import { chapters } from "./data/content";

export default function App() {
  const [loading, setLoading] = useState(true);
  // Fires once, right as the boot countdown hands off — see
  // FireworksBurst, which clears this itself once its own show is done.
  const [celebrating, setCelebrating] = useState(false);
  const lenisRef = useRef(null);

  const handleLoaded = useCallback(() => {
    setLoading(false);
    setCelebrating(true);
  }, []);

  // The persistent chrome (nav logo, autoplay button, progress rail
  // corners) stays hidden until the hero's own boot sequence reveals it —
  // see IntroChapter, which calls the reveal function this provides down
  // via context the moment it reveals its own supporting text.
  const [heroChromeVisible, setHeroChromeVisible] = useState(false);
  const revealHeroChrome = useCallback(() => setHeroChromeVisible(true), []);

  // The narrative chapters all live inside one pinned track with no
  // sections of their own, so CinematicTrack reports which of them is
  // active from its own scroll progress — that's the only source of
  // truth now that every chapter is part of that track.
  const [cinematicActive, setCinematicActive] = useState("intro");

  const {
    isPlaying,
    isRewinding,
    controlsVisible,
    activeOverride,
    stepInfo,
    start: startAutoPlay,
    stop: stopAutoPlay,
  } = useAutoPlay(lenisRef);

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
    lenis.stop();
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

  useEffect(() => {
    if (!loading) lenisRef.current?.start();
  }, [loading]);

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
        <AppReadyProvider value={!loading}>
          <HeroChromeRevealProvider value={revealHeroChrome}>
            <AnimatePresence>
              {loading && <Loader onDone={handleLoaded} />}
            </AnimatePresence>
            {celebrating && <FireworksBurst onDone={() => setCelebrating(false)} />}

            {!loading && <EmberField />}
            <CustomCursor />

            <div className="bg-motif-texture relative bg-paper-50">
              <Navbar hidden={(isPlaying && !controlsVisible) || !heroChromeVisible} />
              {!loading && (
                <ProgressRail chapters={chapters} active={active} stepOverride={stepInfo} hidden={!heroChromeVisible} />
              )}
              {!loading && (
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
