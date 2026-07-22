import { createContext, useContext } from "react";

// Whether the boot Loader has fully cleared (its exit wipe finished, not
// just `loading` flipping false at the start of it) — App is the only
// writer. Chapters mounted underneath the loader (IntroChapter is, so its
// hero is already in the DOM when the ring hits 100%) read this to gate
// entrance animations that should only play once the user can actually
// see the page, instead of racing the loader and finishing unseen.
const AppReadyContext = createContext(true);

export const AppReadyProvider = AppReadyContext.Provider;

export function useAppReady() {
  return useContext(AppReadyContext);
}
