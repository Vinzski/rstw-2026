import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FusionFlash from "./FusionFlash";

const ENTER_S = 0.7;
const HOLD_MS = 900;
const MERGE_S = 0.9;
const FLASH_HOLD_MS = 700;

// How far in from its own resting half each mark travels to meet the
// other, in pixels — a fraction of the viewport width rather than a
// fixed number, so the two marks always end up close together side by
// side regardless of screen size.
const MERGE_OFFSET_FRACTION = 0.18;

// Once both VIPs have verified, their two panels fade away (see
// FaceRecognitionPage) and this plays: DOST's own mark and the province
// seal arrive where each VIP's panel just was — left and right — hold
// for a beat, then slide together and settle side by side at a smaller,
// shared size, with a bloom marking the moment they meet. Reads as "the
// two check-ins combining into one result," not a generic transition,
// before the white hand-off to the real landing page (App), which plays
// its own boot Loader on mount.
export default function LogoFusion({ onDone }) {
  const [merging, setMerging] = useState(false);
  const [flashed, setFlashed] = useState(false);
  const [offset] = useState(() => window.innerWidth * MERGE_OFFSET_FRACTION);

  useEffect(() => {
    const t = setTimeout(() => setMerging(true), ENTER_S * 1000 + HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!merging) return;
    const t = setTimeout(() => setFlashed(true), MERGE_S * 1000);
    return () => clearTimeout(t);
  }, [merging]);

  useEffect(() => {
    if (!flashed) return;
    const t = setTimeout(onDone, FLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, [flashed, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-50"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="bg-grid absolute inset-0 opacity-70" />
      <div className="noise-veil" />

      <motion.img
        src="/images/VIP LOGOs/dost-logo.png"
        alt="DOST"
        aria-hidden="true"
        className="absolute left-1/4 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-xl sm:h-56 sm:w-56"
        initial={{ opacity: 0, scale: 0.7, x: 0 }}
        animate={{ opacity: 1, scale: merging ? 0.65 : 1, x: merging ? offset : 0 }}
        transition={{ duration: merging ? MERGE_S : ENTER_S, ease: "easeInOut" }}
      />
      <motion.img
        src="/images/VIP LOGOs/Ph_seal_zamboanga_del_norte.png"
        alt="Province of Zamboanga del Norte"
        aria-hidden="true"
        className="absolute left-3/4 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-xl sm:h-56 sm:w-56"
        initial={{ opacity: 0, scale: 0.7, x: 0 }}
        animate={{ opacity: 1, scale: merging ? 0.65 : 1, x: merging ? -offset : 0 }}
        transition={{ duration: merging ? MERGE_S : ENTER_S, ease: "easeInOut" }}
      />

      {/* The instant the two marks meet: the same bloom FusionFlash used
          to mark the old convergence, reused here for a pair of static
          marks instead of four color orbs. */}
      {flashed && <FusionFlash />}
    </motion.div>
  );
}
