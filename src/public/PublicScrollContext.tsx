import { createContext, useContext, type RefObject } from 'react';

/** Scroll container for the public marketing site (`<main>` in PublicSite). */
export const PublicScrollContainerContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function usePublicScrollContainer() {
  return useContext(PublicScrollContainerContext);
}
