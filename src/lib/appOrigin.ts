import { isNativeApp } from './nativePlatform';
import { SITE } from '../siteContent';

const configuredOrigin = String((import.meta as { env?: Record<string, string> }).env?.VITE_APP_URL || SITE.url)
  .trim()
  .replace(/\/$/, '');

/** Production origin for API calls. Required in the Android APK build. */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') return configuredOrigin;
  // Capacitor loads server.url in a WebView — API calls must match that origin
  // or CSP connect-src 'self' blocks cross-host fetches (www vs apex).
  if (isNativeApp()) return window.location.origin || configuredOrigin;
  return window.location.origin;
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = getAppOrigin();
  if (!origin) return normalized;
  if (typeof window !== 'undefined' && origin === window.location.origin) return normalized;
  return `${origin}${normalized}`;
}
