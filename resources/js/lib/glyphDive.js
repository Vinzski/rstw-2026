import { useLayoutEffect } from "react";
import {
  motionValue,
  useMotionValue,
  useMotionValueEvent,
  useMotionTemplate,
  useTransform,
} from "framer-motion";
import { mapRangeSmooth } from "./scroll";

// The site's one transition verb: the camera dives through a round glyph
// (the "0" of 2026, the "o" of Technology, …) and the next scene is
// revealed through the letter's counter. This module is the shared
// machinery every dive uses — glyph measurement, the geometric zoom, the
// growing reveal circle — so each chapter only declares *which* glyph it
// exits through.

// Fallback geometry, used only when pixel analysis (below) finds no
// enclosed counter in the glyph — e.g. open letters like "c".
//
// Radius of the reveal circle at rest, as a fraction of the glyph's
// width — just inside the glyph's outer edge, so the circle's rim stays
// hidden behind the letter's opaque ring for the entire zoom.
export const HOLE_FRAC = 0.44;

// Conservative half-width of a glyph's counter (the actual see-through
// hole) as a fraction of glyph width. The end-of-dive scale is derived
// from this, so the zoom only settles once the counter itself — not just
// the clip circle — has swallowed the farthest viewport corner.
export const COUNTER_FRAC = 0.18;

// How much of a dive's own (start to end) range its reveal hole spends
// easing in from invisible, instead of popping to its base size the
// instant progress crosses `start`.
const HOLE_FADE_IN_FRAC = 0.35;

// ---------------------------------------------------------------------------
// Counter detection. A bounding-box center is only a valid dive target for
// letters whose hole IS their middle (o, 0). For glyphs like "&" the box
// center lands on solid ink — the camera would dive into a wall of navy.
// So each dive glyph is rasterized once to an offscreen canvas, the
// outside is flood-filled away, and the largest enclosed empty region —
// the actual white of the letter — becomes the anchor and radius.

const GLYPH_SAMPLE_PX = 256;
const glyphCache = new Map();

function analyzeGlyph(ch, fontStyle, fontWeight, fontFamily) {
  const key = `${fontStyle}|${fontWeight}|${fontFamily}|${ch}`;
  // Only cache once webfonts have settled — earlier rasterizations may
  // have used a fallback face with a differently-shaped glyph.
  const cacheable = document.fonts?.status === "loaded";
  if (cacheable && glyphCache.has(key)) return glyphCache.get(key);

  const font = `${fontStyle} ${fontWeight} ${GLYPH_SAMPLE_PX}px ${fontFamily}`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.font = font;
  const m = ctx.measureText(ch);
  const pad = 8;
  const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2;
  const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2;
  if (w <= pad * 2 || h <= pad * 2) return null;
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  const ox = pad + m.actualBoundingBoxLeft;
  const oy = pad + m.actualBoundingBoxAscent;
  ctx.fillText(ch, ox, oy);

  const alpha = ctx.getImageData(0, 0, w, h).data;
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = alpha[i * 4 + 3] > 40 ? 1 : 0;

  // Everything reachable from the canvas border is "outside" the glyph.
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || ink[i]) continue;
    outside[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }

  // Whatever empty space is left is enclosed — the glyph's counters.
  // Keep the largest, tracking its bounding box: counters are ovals, not
  // circles, so the reveal needs both semi-axes to fill the hole.
  const seen = new Uint8Array(w * h);
  let best = null;
  for (let i = 0; i < w * h; i++) {
    if (ink[i] || outside[i] || seen[i]) continue;
    let area = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    const q = [i];
    seen[i] = 1;
    while (q.length) {
      const j = q.pop();
      area++;
      const x = j % w;
      const y = (j / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !ink[j - 1] && !outside[j - 1] && !seen[j - 1]) { seen[j - 1] = 1; q.push(j - 1); }
      if (x < w - 1 && !ink[j + 1] && !outside[j + 1] && !seen[j + 1]) { seen[j + 1] = 1; q.push(j + 1); }
      if (j >= w && !ink[j - w] && !outside[j - w] && !seen[j - w]) { seen[j - w] = 1; q.push(j - w); }
      if (j < w * (h - 1) && !ink[j + w] && !outside[j + w] && !seen[j + w]) { seen[j + w] = 1; q.push(j + w); }
    }
    if (area > 60 && (!best || area > best.area)) {
      best = { area, minX, maxX, minY, maxY };
    }
  }

  const result = best
    ? {
        // Counter bbox center and semi-axes relative to the glyph's text
        // origin (advance-box left edge, baseline) — in GLYPH_SAMPLE_PX-
        // scale pixels.
        x: (best.minX + best.maxX) / 2 - ox,
        y: (best.minY + best.maxY) / 2 - oy,
        rx: (best.maxX - best.minX) / 2,
        ry: (best.maxY - best.minY) / 2,
        ascent: m.fontBoundingBoxAscent ?? GLYPH_SAMPLE_PX * 0.8,
        descent: m.fontBoundingBoxDescent ?? GLYPH_SAMPLE_PX * 0.2,
      }
    : null;
  if (cacheable) glyphCache.set(key, result);
  return result;
}

// Locates the glyph's largest enclosed counter within `el`'s own border
// box (the per-character span), or null when the letter has none.
function glyphCounterInBox(el) {
  const ch = el.textContent?.trim();
  if (!ch || ch.length !== 1) return null;
  const style = getComputedStyle(el);
  const info = analyzeGlyph(ch, style.fontStyle, style.fontWeight, style.fontFamily);
  if (!info) return null;
  const s = parseFloat(style.fontSize) / GLYPH_SAMPLE_PX;
  // Baseline position inside the span's line box, via the half-leading
  // model: leading is split evenly above and below the font's own box.
  const halfLeading = (el.offsetHeight - (info.ascent + info.descent) * s) / 2;
  const baseline = halfLeading + info.ascent * s;
  return { x: info.x * s, y: baseline + info.y * s, rx: info.rx * s, ry: info.ry * s };
}

function makeHandoff() {
  return { x: motionValue(0), y: motionValue(0), rx: motionValue(0), ry: motionValue(0) };
}

// Chapter-boundary dive state, keyed by the *outgoing* chapter's id:
// written by that chapter's last dive (via useDivePublisher), read by
// CinematicLayers to clip the incoming chapter's layer to the hole.
// Module-level motion values so the two chapters never need to know
// about each other directly.
export const diveHandoffs = {
  intro: makeHandoff(),
  about: makeHandoff(),
  pillars: makeHandoff(),
  highlights: makeHandoff(),
};

export const NO_HANDOFF = makeHandoff();

// Stand-in for "no previous dive" (a chapter's first beat): radius stays
// 0, so any clip built from it resolves to nothing and enter logic keyed
// off it never fires.
export const NULL_DIVE = {
  holeRadius: motionValue(0),
  anchorX: motionValue(0),
  anchorY: motionValue(0),
};

// One glyph dive: measures the target glyph's center within `sceneRef`
// (which must be a positioned, viewport-filling wrapper — anchor and
// transform-origin then share one coordinate space), and drives the zoom
// over local progress [start, end].
//
// Returns:
// - diveScale/diveOrigin — apply to the scene-filling element that should
//   rush past the camera (scale is 1 outside the window).
// - holeRadius/anchorX/anchorY — the reveal circle, pinned to the glyph,
//   growing at exactly the glyph's rate so its rim rides hidden inside
//   the letter's ring. Radius is 0 until the dive begins, so whatever it
//   clips stays fully hidden beforehand.
export function useGlyphDive({ progress, sceneRef, glyphRef, start, end }) {
  const anchorX = useMotionValue(0);
  const anchorY = useMotionValue(0);
  const holeBase = useMotionValue(1);
  const endScale = useMotionValue(60);
  const counterRxBase = useMotionValue(1);
  const counterRyBase = useMotionValue(1);

  useLayoutEffect(() => {
    function measure() {
      const scene = sceneRef.current;
      if (!scene) return;
      const vw = scene.clientWidth;
      const vh = scene.clientHeight;
      const g = glyphRef.current;
      if (g) {
        // offsetLeft/offsetTop are layout-based and ignore transforms, so
        // the measurement is stable no matter where mid-scroll it happens.
        let bx = g.offsetLeft;
        let by = g.offsetTop;
        let node = g.offsetParent;
        while (node && node !== scene && scene.contains(node)) {
          bx += node.offsetLeft;
          by += node.offsetTop;
          node = node.offsetParent;
        }
        // Anchor on the glyph's actual white: its largest enclosed
        // counter, found by rasterizing the letter. Falls back to the
        // box-center fractions for open glyphs (a "c" has no enclosed
        // counter to find).
        const counter = glyphCounterInBox(g);
        let x, y, r0, coverBase;
        if (counter) {
          x = bx + counter.x;
          y = by + counter.y;
          // Same-layer reveals clip to a circle generously past the
          // counter (its rim hides under the surrounding ink)…
          r0 = Math.max(Math.max(counter.rx, counter.ry) * 1.15, 1);
          // …while the boundary handoff's ellipse fills the counter's
          // actual oval nearly edge-to-edge, so no sliver of the outgoing
          // backdrop lingers inside the hole around a too-small circle.
          counterRxBase.set(Math.max(counter.rx * 0.96, 1));
          counterRyBase.set(Math.max(counter.ry * 0.96, 1));
          coverBase = Math.max(Math.min(counter.rx, counter.ry) * 0.96, 1);
        } else {
          x = bx + g.offsetWidth / 2;
          y = by + g.offsetHeight / 2;
          r0 = Math.max(g.offsetWidth * HOLE_FRAC, 1);
          coverBase = Math.max(g.offsetWidth * COUNTER_FRAC, 1);
          counterRxBase.set(coverBase);
          counterRyBase.set(coverBase);
        }
        anchorX.set(x);
        anchorY.set(y);
        holeBase.set(r0);
        const cover = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));
        endScale.set((cover / coverBase) * 1.05);
      } else {
        // Target glyph missing (copy changed without updating the dive
        // spec) — degrade to a center iris so the handoff still happens.
        anchorX.set(vw / 2);
        anchorY.set(vh / 2);
        const r0 = Math.min(vw, vh) * 0.12;
        holeBase.set(r0);
        counterRxBase.set(r0);
        counterRyBase.set(r0);
        endScale.set((Math.hypot(vw, vh) / 2 / r0) * 1.1);
      }
    }
    measure();
    // Space Grotesk swapping in changes glyph metrics.
    document.fonts?.ready?.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [sceneRef, glyphRef, anchorX, anchorY, holeBase, endScale, counterRxBase, counterRyBase]);

  // Geometric interpolation — equal scroll covers equal *ratios* of
  // scale, which is what a constant-speed camera dolly feels like.
  const diveScale = useTransform([progress, endScale], ([p, e]) =>
    Math.pow(e, mapRangeSmooth(p, start, end, 0, 1)),
  );
  const diveOrigin = useMotionTemplate`${anchorX}px ${anchorY}px`;
  // The reveal hole's own onset: easing it in over the first
  // HOLE_FADE_IN_FRAC of the dive's range, rather than the radius
  // jumping straight from 0 to its full base size the instant progress
  // crosses `start`. That instant pop is invisible when a dive *lands* on
  // an already-past-start position (a nav click, the auto-tour) — there's
  // nothing to see it jump from — but scrolling manually INTO a dive's
  // start means actually watching the incoming chapter's backdrop punch
  // a small, hard-edged hole through the outgoing glyph with no warning.
  const holeFadeIn = useTransform(progress, (p) =>
    mapRangeSmooth(p, start, start + (end - start) * HOLE_FADE_IN_FRAC, 0, 1),
  );
  const holeRadius = useTransform([progress, diveScale, holeBase, holeFadeIn], ([p, s, r0, fade]) =>
    p <= start ? 0 : s * r0 * fade,
  );
  // The counter-fitted ellipse semi-axes. Chapter boundaries need these:
  // the incoming layer paints *above* the outgoing layer, so its clip edge
  // must stay inside the see-through hole of the letter — and fill that
  // hole's actual oval shape, or a discolored ring of the outgoing
  // backdrop shows around a too-small circle.
  const counterRx = useTransform([progress, diveScale, counterRxBase, holeFadeIn], ([p, s, r, fade]) =>
    p <= start ? 0 : s * r * fade,
  );
  const counterRy = useTransform([progress, diveScale, counterRyBase, holeFadeIn], ([p, s, r, fade]) =>
    p <= start ? 0 : s * r * fade,
  );

  return { diveScale, diveOrigin, holeRadius, counterRx, counterRy, anchorX, anchorY };
}

// Mirrors a chapter's exit dive into its diveHandoffs slot, converting the
// anchor into screen coordinates (the scene wrapper rides the chapter's
// fgY parallax; the incoming layer CinematicLayers clips does not).
export function useDivePublisher(id, dive, fgY) {
  const target = diveHandoffs[id];
  const screenY = useTransform([dive.anchorY, fgY], ([a, b]) => a + b);
  useMotionValueEvent(dive.anchorX, "change", (v) => target.x.set(v));
  useMotionValueEvent(screenY, "change", (v) => target.y.set(v));
  useMotionValueEvent(dive.counterRx, "change", (v) => target.rx.set(v));
  useMotionValueEvent(dive.counterRy, "change", (v) => target.ry.set(v));
  useLayoutEffect(() => {
    target.x.set(dive.anchorX.get());
    target.y.set(screenY.get());
    target.rx.set(dive.counterRx.get());
    target.ry.set(dive.counterRy.get());
  });
}
