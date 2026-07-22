import ChapterTrack from "./ChapterTrack";
import CinematicLayers from "./CinematicLayers";
import { cinematicTotalVh } from "../data/content";

// The entire narrative — Intro through When & Where — as one pinned
// scroll track. It's a single document section on purpose: every chapter
// transition happens inside the same sticky viewport instead of at a
// section boundary, which is what makes the whole thing read as one
// continuous space instead of several stacked pages.
export default function CinematicTrack({ onActiveChange }) {
  return (
    <ChapterTrack id="story" vh={cinematicTotalVh}>
      {(progress) => <CinematicLayers progress={progress} onActiveChange={onActiveChange} />}
    </ChapterTrack>
  );
}
