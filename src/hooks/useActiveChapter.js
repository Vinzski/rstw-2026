import { useEffect, useState } from "react";

// Tracks which of the given sections currently owns the vertical center of
// the viewport, for the wayfinding rail and the nav's active-link state.
// Returns null — not a stale previous value — when none of them are in
// view, so a caller combining this with another source of truth (e.g. the
// cinematic track's own progress-driven active id) can tell "nothing here"
// apart from "still here" when scrolling back out of this id set.
export default function useActiveChapter(ids) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) {
          setActive((prev) => (prev === null ? prev : null));
          return;
        }
        // Prefer the entry whose bounding box center is nearest viewport center.
        const mid = window.innerHeight / 2;
        let best = visible[0];
        let bestDist = Infinity;
        for (const entry of visible) {
          const rect = entry.boundingClientRect;
          const dist = Math.abs(rect.top + rect.height / 2 - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = entry;
          }
        }
        setActive(best.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
