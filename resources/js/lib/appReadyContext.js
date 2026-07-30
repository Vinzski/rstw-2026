import { createContext, useContext } from "react";

// Whether the boot Loader has fully cleared (its exit wipe finished, not
// just `loading` flipping false at the start of it) — App is the only
// writer. RstwAssembly's circling ring runs the whole time regardless
// (it's meant to be visible on top of the loader while its countdown is
// up), but the *reveal* that follows — the flat wordmark springing into
// place, the year landing, everything else fading in — waits on this so
// it plays out once the user can actually see the hero, instead of
// finishing unseen behind the loader.
const AppReadyContext = createContext(true);

export const AppReadyProvider = AppReadyContext.Provider;

export function useAppReady() {
  return useContext(AppReadyContext);
}
