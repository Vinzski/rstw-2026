// Diagonal wipe clip-paths for chapter-to-chapter transitions — a slanted
// line sweeping across the viewport, echoing the diagonal-cut compositions
// in the official RSTW brand art (the collage sheets, the angled poster
// crops), instead of every single transition being the same uniform
// center scale/zoom.
//
// Both reveal and hide sweep in the same left-to-right direction, so a
// chapter's entrance and the next chapter's eventual entrance always read
// as the same consistent "camera" direction moving through the story
// rather than each boundary picking its own.
const SLANT = 16;

// p: 0 (fully hidden) -> 1 (fully visible). The visible region grows from
// nothing at the left edge to the full box.
export function revealClip(p) {
  const x = -SLANT + p * (100 + SLANT);
  return `polygon(0% 0%, ${x}% 0%, ${x - SLANT}% 100%, 0% 100%)`;
}

// p: 0 (fully visible) -> 1 (fully hidden). The visible region shrinks
// away toward the right edge.
export function hideClip(p) {
  const x = -SLANT + p * (100 + SLANT);
  return `polygon(${x}% 0%, 100% 0%, 100% 100%, ${x - SLANT}% 100%)`;
}
