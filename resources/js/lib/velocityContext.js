import { createContext, useContext } from "react";
import { motionValue } from "framer-motion";

// A single smoothed MotionValue<number> representing current scroll speed
// (absolute, roughly px/frame), fed from Lenis's own velocity readout.
// Consumers derive their own useTransform off this rather than each
// re-deriving velocity from scrollY themselves.
//
// The default is a real (non-hook) MotionValue rather than null — consumers
// call useTransform on whatever this returns unconditionally, and a null
// fallback would mean branching around a hook call, which breaks the rules
// of hooks the moment the provider isn't mounted yet.
const VelocityContext = createContext(motionValue(0));

export const VelocityProvider = VelocityContext.Provider;

export function useScrollVelocity() {
  return useContext(VelocityContext);
}
