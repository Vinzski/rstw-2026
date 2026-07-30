import { useCallback, useEffect, useRef, useState } from "react";

// Requests the webcam and hands back the live MediaStream. Each caller
// gets its own independent request/stream — FaceRecognitionPage calls
// this once per VIP now that both scan side by side at once, rather than
// sharing a single stream handed off between them one at a time. On a
// machine with only one physical camera, both calls simply resolve to
// the same device (the browser's own default), which is expected and
// fine for local testing ahead of the real two-laptop, two-camera setup.
//
// `active` (default true) lets the caller release the camera the instant
// it's no longer needed — e.g. once scanning is done and the page has
// moved on to the logo/loading beats — rather than leaving the hardware
// light on for the rest of the flow. Flipping back to true re-requests
// fresh (no resume-from-stopped-track support; getUserMedia doesn't
// offer one).
export function useCameraStream(active = true) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const request = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(new Error("Camera isn't supported in this browser."));
      return;
    }
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        if (!mountedRef.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
      })
      .catch((err) => {
        if (mountedRef.current) setError(err);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (active) request();
    return () => {
      mountedRef.current = false;
    };
  }, [request, active]);

  // Releasing (not just hiding) the moment `active` goes false — the
  // hardware light actually turns off, not just the on-screen feed.
  useEffect(() => {
    if (active) return;
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return s ? null : s;
    });
  }, [active]);

  // Stops the camera's own hardware light/tracks on unmount too — merely
  // clearing the React state doesn't release the device.
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return { stream, error, retry: request };
}
