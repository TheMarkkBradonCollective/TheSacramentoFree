import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isNativeApp } from '../lib/nativePlatform';
import { NEWSPAPER, isNewspaperProductionHost } from './newspaperBrand';
import { isPlayStoreDemo } from './playStoreDemo';

const STORAGE_KEY = 'sbn_newspaper_look_v2';
export const NEWSPAPER_CLASS = 'newspaper-preview';
const ORIGINAL_DOCUMENT_TITLE = 'SacramentoBuyNothing — Local Gifting';

interface NewspaperSkinContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const NewspaperSkinContext = createContext<NewspaperSkinContextValue | null>(null);

function readSkinFromLocation(): boolean | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.includes('?')
    ? new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?') + 1))
    : null;
  const skin = search.get('skin') || hashQuery?.get('skin');
  if (skin === 'original') return false;
  if (skin === 'newspaper') return true;
  return null;
}

function defaultNewspaperEnabled(): boolean {
  // Original Sacramento Buy Nothing layout is the default again.
  // Escape hatch: ?skin=newspaper (handled in readEnabled).
  return false;
}

function readEnabled(): boolean {
  const fromUrl = readSkinFromLocation();
  if (fromUrl !== null) return fromUrl;
  if (typeof window === 'undefined') return false;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === '0') return false;
  if (stored === '1') return true;
  return defaultNewspaperEnabled();
}

export function newspaperThemeColor(theme: 'light' | 'dark', newspaper = true): string {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('capacitor-native')) {
    return '#000000';
  }
  if (!newspaper) return theme === 'light' ? '#ffffff' : '#0b0b0c';
  return theme === 'light' ? '#e6e5e0' : '#0c0c0b';
}

function applyNewspaperClass(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(NEWSPAPER_CLASS, enabled);
  document.title = enabled
    ? `${NEWSPAPER.name} — ${NEWSPAPER.tagline.replace(/\.$/, '')}`
    : ORIGINAL_DOCUMENT_TITLE;
  const theme: 'light' | 'dark' = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', newspaperThemeColor(theme, enabled));
}

function writeSkinParam(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('skin', enabled ? 'newspaper' : 'original');
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* ignore */
  }
}

export function NewspaperSkinProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(readEnabled);

  useEffect(() => {
    applyNewspaperClass(enabled);
    sessionStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  }, [enabled]);

  useEffect(() => {
    const sync = () => setEnabledState(readEnabled());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove(NEWSPAPER_CLASS);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    writeSkinParam(next);
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return <NewspaperSkinContext.Provider value={value}>{children}</NewspaperSkinContext.Provider>;
}

export function useNewspaperSkin() {
  const ctx = useContext(NewspaperSkinContext);
  return ctx ?? { enabled: false, setEnabled: () => {} };
}

/** Skin check for plain modules that run outside the React tree. */
export function isNewspaperSkinActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains(NEWSPAPER_CLASS);
}

export function shouldShowNewspaperPreviewBanner(_enabled: boolean): boolean {
  if (typeof window === 'undefined') return false;
  // No preview chrome on the live domain (this is the look), in native, or in Play Store captures.
  if (isNewspaperProductionHost() || isNativeApp() || isPlayStoreDemo()) return false;
  return true;
}
