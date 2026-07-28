import { createContext, useContext } from "react";

// Holds a ref (not the instance directly) so consumers rendered before
// Lenis is constructed still get a stable object whose `.current` resolves
// once the instance exists.
const LenisContext = createContext({ current: null });

export const LenisProvider = LenisContext.Provider;

export function useLenisRef() {
  return useContext(LenisContext);
}
