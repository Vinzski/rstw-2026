import { useEffect, useRef } from "react";
import { useScrollVelocity } from "../lib/velocityContext";

// Drifting brand-color motes rather than glowing embers — on the light
// paper background, an additive "lighter" blend (right for embers on a
// dark scene) would just wash out toward white, so these are richer,
// deeper brand tones composited normally instead. Warm orange/red/gold
// dominate, with an occasional cool sky-blue spark for the same warm/cool
// duality as the brand mark, without blending the two into one gradient.
const COLORS = [
  [238, 139, 59],
  [193, 67, 44],
  [209, 143, 52],
  [61, 151, 214],
];

function makeParticle(width, height, spawnAtBottom) {
  const colorIndex = Math.floor(Math.random() * COLORS.length);
  return {
    x: Math.random() * width,
    y: spawnAtBottom ? height + Math.random() * 80 : Math.random() * height,
    r: 0.6 + Math.random() * 2.2,
    baseSpeed: 6 + Math.random() * 14,
    swayAmp: 8 + Math.random() * 22,
    swayFreq: 0.2 + Math.random() * 0.5,
    swayPhase: Math.random() * Math.PI * 2,
    alpha: 0.16 + Math.random() * 0.32,
    colorIndex,
  };
}

// One pre-rendered glow sprite per color, built once, reused every frame
// via drawImage instead of calling ctx.createRadialGradient per particle
// per frame — allocating a fresh gradient ~40 times a frame at 60fps was
// real, avoidable GC and paint pressure.
const SPRITE_SIZE = 64;
function buildSprites() {
  return COLORS.map(([r, g, b]) => {
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const sctx = sprite.getContext("2d");
    const center = SPRITE_SIZE / 2;
    const grad = sctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return sprite;
  });
}

// A field of drifting embers behind (well, in front of) everything — the
// one thing on the page that's always quietly moving, so the scene never
// goes fully static between scroll beats. Speed and drift react to scroll
// velocity and the cursor so it reads as air the user is actually moving
// through, not a looping background video.
export default function EmberField() {
  const canvasRef = useRef(null);
  const velocity = useScrollVelocity();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isSmall = window.innerWidth < 640;
    const COUNT = isSmall ? 22 : 42;
    const sprites = buildSprites();

    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles = Array.from({ length: COUNT }, () => makeParticle(width, height, false));
    const mouse = { x: width / 2, y: height / 2, active: false };

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function onPointerMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf;
    let running = true;
    let t = 0;

    function onVisibility() {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", onVisibility);

    function tick() {
      if (!running) return;
      t += 1;
      const speedBoost = Math.min((velocity?.get?.() ?? 0) * 0.6, 26);

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y -= (p.baseSpeed + speedBoost) / 60;
        p.x += (Math.sin(t * 0.016 * p.swayFreq + p.swayPhase) * p.swayAmp) / 60;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 14400) {
            const dist = Math.sqrt(dist2) || 1;
            const force = (1 - dist / 120) * 0.6;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        if (p.y < -20) {
          Object.assign(p, makeParticle(width, height, true));
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        const streak = Math.min(1 + speedBoost * 0.15, 4);
        const dw = p.r * 5;
        const dh = p.r * 5 * streak;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprites[p.colorIndex], p.x - dw / 2, p.y - dh / 2, dw, dh);
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [velocity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30 opacity-80"
      aria-hidden="true"
    />
  );
}
