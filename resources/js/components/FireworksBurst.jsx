import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// Same brand palette as the hero's own ambient sparks (see
// RstwAssembly's FIREWORK_COLORS) so this reads as the same system, just
// a bigger one-off celebration instead of a standing background presence.
const FIREWORK_COLORS = [
  "var(--color-orange-500)",
  "var(--color-sky-500)",
  "var(--color-red-600)",
  "var(--color-gold-500)",
  "var(--color-navy-600)",
];

const SOUND_SRC = "/audio/firework.mp3";
const SHOW_DURATION_MS = 5000; // bursts keep firing for this long
const FADE_DURATION_S = 0.8; // then the whole display fades and is gone

const BURST_PARTICLES = 20;
const BURST_RADIUS = 130;
const BURST_DURATION_S = 1.3;
const EMITTERS = 6; // simultaneous burst points, each re-firing at its own random spot/interval
const MIN_INTERVAL_S = 0.5;
const MAX_INTERVAL_S = 1.1;

function randomPoint() {
  return {
    x: window.innerWidth * (0.12 + Math.random() * 0.76),
    y: window.innerHeight * (0.12 + Math.random() * 0.5),
  };
}

// One burst: a bright flash core plus a ring of colored particles thrown
// outward and gone — the same "little firework going off" read as the
// hero's own AmbientSpark, just bigger and brighter for this one-off
// finale rather than a dim standing presence.
function Burst({ x, y }) {
  const particles = useMemo(
    () =>
      Array.from({ length: BURST_PARTICLES }, (_, i) => {
        const angle = (i / BURST_PARTICLES) * Math.PI * 2 + Math.random() * 0.4;
        const dist = BURST_RADIUS * (0.7 + Math.random() * 0.5);
        return { angle, dist, color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)] };
      }),
    [],
  );

  return (
    <div className="absolute left-0 top-0" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <motion.span
        className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 3.4, 4.6] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full"
          style={{ background: p.color, boxShadow: `0 0 9px 3px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
          animate={{
            x: [0, Math.cos(p.angle) * p.dist],
            // A little extra downward drift on top of the outward throw —
            // reads as gravity pulling the embers down, not a perfectly
            // circular ring frozen in place.
            y: [0, Math.sin(p.angle) * p.dist + p.dist * 0.25],
            opacity: [0, 0.9, 0],
            scale: [0.6, 1.15, 0.3],
          }}
          transition={{ duration: BURST_DURATION_S, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// One emitter: fires a burst at a random point, waits a randomized beat,
// fires again — for as long as `active` stays true. Existing bursts are
// left to finish their own trajectory once `active` flips false; only
// the *next* spawn is what stops.
function Emitter({ seedDelay, active }) {
  const [bursts, setBursts] = useState([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    let timer;
    function spawn() {
      const id = nextIdRef.current++;
      setBursts((prev) => [...prev, { id, ...randomPoint() }]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, BURST_DURATION_S * 1000 + 50);
      const next = MIN_INTERVAL_S + Math.random() * (MAX_INTERVAL_S - MIN_INTERVAL_S);
      timer = setTimeout(spawn, next * 1000);
    }
    timer = setTimeout(spawn, seedDelay * 1000);
    return () => clearTimeout(timer);
  }, [active, seedDelay]);

  return bursts.map((b) => <Burst key={b.id} x={b.x} y={b.y} />);
}

// The one-off "grand finale" celebration once the boot countdown hits 0
// — several burst points firing across the screen for SHOW_DURATION_MS,
// then the whole thing fades and calls `onDone` so the parent can unmount
// it. firework.mp3 (a 1s–7s slice of the source clip) already tapers its
// own volume down right around the 5s mark, so its natural decay lines
// up with this visual fade without needing to duck it in code.
export default function FireworksBurst({ onDone }) {
  const [active, setActive] = useState(true);

  const seedDelays = useMemo(
    () => Array.from({ length: EMITTERS }, (_, i) => (i / EMITTERS) * MAX_INTERVAL_S + Math.random() * 0.3),
    [],
  );

  useEffect(() => {
    const sound = new Audio(SOUND_SRC);
    sound.play().catch(() => {});
    return () => sound.pause();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setActive(false), SHOW_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (active) return;
    const t = setTimeout(onDone, FADE_DURATION_S * 1000);
    return () => clearTimeout(t);
  }, [active, onDone]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: FADE_DURATION_S, ease: "easeInOut" }}
    >
      {seedDelays.map((seedDelay, i) => (
        <Emitter key={i} seedDelay={seedDelay} active={active} />
      ))}
    </motion.div>
  );
}
