import { Volume2, VolumeX } from "lucide-react";
import { useMuted, toggleMuted } from "../lib/audio";

// Mounted once at the app root (see main.jsx) rather than inside Navbar, so
// it's available for the whole visit — kiosk check-in, boot countdown,
// autoplay tour, every chapter — not just once the hero chrome has
// revealed itself. z-[200] keeps it above the boot Loader (z-[100]) and
// the kiosk screen (z-50), the two full-screen layers most likely to sit
// on top of it. Invisible until hovered (or focused, for keyboard users) —
// a deliberately low-key control, there for whoever goes looking for it
// rather than competing for attention on every page load.
export default function MuteButton() {
  const muted = useMuted();

  return (
    <button
      type="button"
      onClick={toggleMuted}
      className="fixed right-6 top-5 z-[200] grid h-9 w-9 place-items-center rounded-full border border-navy-900/15 bg-paper-50/85 text-ink opacity-0 shadow-sm backdrop-blur-xl transition-opacity duration-200 hover:border-orange-500/50 focus-visible:opacity-100 hover:opacity-100 sm:top-6 lg:right-10"
      aria-label={muted ? "Unmute site sounds" : "Mute site sounds"}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
