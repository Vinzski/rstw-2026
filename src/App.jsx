import { useEffect, useRef, useState } from "react";
import { AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Lenis from "lenis";
import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import ProgressRail from "./components/ProgressRail";
import EmberField from "./components/EmberField";
import CustomCursor from "./components/CustomCursor";
import CinematicTrack from "./components/CinematicTrack";
import Explore from "./components/Explore";
import Hotels from "./components/Hotels";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import { LenisProvider } from "./lib/lenisContext";
import { VelocityProvider } from "./lib/velocityContext";
import { AppReadyProvider } from "./lib/appReadyContext";
import useActiveChapter from "./hooks/useActiveChapter";
import { chapters, flowChapterIds } from "./data/content";

export default function App() {
  const [loading, setLoading] = useState(true);
  const lenisRef = useRef(null);

  // Stay/Contact are real sections, so an IntersectionObserver can track
  // them directly. The five narrative chapters live inside one pinned
  // track with no sections of their own, so CinematicTrack reports which
  // of them is active from its own scroll progress instead. Whichever
  // source has an opinion right now wins — the flow observer reports null
  // the moment neither Stay nor Contact is in view.
  const flowActive = useActiveChapter(flowChapterIds);
  const [cinematicActive, setCinematicActive] = useState("intro");
  const active = flowActive ?? cinematicActive;

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

  return (
    <LenisProvider value={lenisRef}>
      <VelocityProvider value={velocity}>
        <AppReadyProvider value={!loading}>
          <AnimatePresence>
            {loading && <Loader onDone={() => setLoading(false)} />}
          </AnimatePresence>

          {!loading && <EmberField />}
          <CustomCursor />

          <div className="bg-motif-texture relative bg-paper-50">
            <Navbar active={active} />
            {!loading && <ProgressRail chapters={chapters} active={active} />}
            <main>
              <CinematicTrack onActiveChange={setCinematicActive} />
              <Explore />
              <Hotels />
              <Contact />
            </main>
            <Footer />
          </div>
        </AppReadyProvider>
      </VelocityProvider>
    </LenisProvider>
  );
}
