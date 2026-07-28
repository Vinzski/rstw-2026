// Deliberately plain functions (not useTransform's array syntax) passed into
// framer's useTransform. Framer can offload simple array-based transforms onto
// a native browser ViewTimeline for performance, which tracks the *element's
// own* visibility rather than a wrapper-relative scroll range — silently
// producing the wrong progress for pinned, multi-beat chapters. Function
// transforms can't be translated to a native timeline, so they stay
// JS-driven and track scrollYProgress exactly as computed here.
export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}

// Smoothstep easing for a softer arrival at each end of a mapped range.
export function mapRangeSmooth(value, inMin, inMax, outMin, outMax) {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  const eased = t * t * (3 - 2 * t);
  return outMin + eased * (outMax - outMin);
}
