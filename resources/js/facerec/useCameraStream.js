import { useCallback, useEffect, useRef, useState } from "react";

// Requests the webcam once and hands the same live MediaStream to
// whichever VIP slot is currently scanning — asking once up front instead
// of once per person avoids re-prompting for permission four times in a
// row. `retry` re-requests it (e.g. after the user initially blocked it).
export function useCameraStream() {
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
    request();
    return () => {
      mountedRef.current = false;
    };
  }, [request]);

  // Stops the camera's own hardware light/tracks on unmount — merely
  // clearing the React state doesn't release the device.
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return { stream, error, retry: request };
}
