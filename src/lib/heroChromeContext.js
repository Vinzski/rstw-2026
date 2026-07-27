import { createContext, useContext } from "react";

// Lets the hero's own boot sequence (deep inside IntroChapter, past
// CinematicTrack/CinematicLayers) signal the persistent site chrome — the
// navbar logo, the autoplay button, the progress rail's corner readouts —
// to reveal itself. App owns the actual visibility state; this is just
// the one-way channel that distant descendant needs to reach it without
// threading a prop through every layer of the cinematic track.
const HeroChromeRevealContext = createContext(() => {});

export const HeroChromeRevealProvider = HeroChromeRevealContext.Provider;

export function useRevealHeroChrome() {
  return useContext(HeroChromeRevealContext);
}
