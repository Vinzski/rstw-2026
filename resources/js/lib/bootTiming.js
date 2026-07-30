// Shared by the boot Loader (the countdown ring + number) and
// RstwAssembly (the wordmark pieces circling around it while that
// countdown runs) so the two halves of the boot sequence always finish
// at the same instant — the last piece's dive lands exactly as the
// number hits 0 — no matter which file's own animation constants get
// retuned later.
export const BOOT_DURATION_MS = 11000; // matches countdown.mp3's own ~11s length
