import { isNativeApp } from './nativePlatform';

const configuredOrigin = String((import.meta as { env?: Record<string, string> }).env?.VITE_APP_URL || '')
  .trim()
  .replace(/\/$/, '');

/** Production origin for API calls. Required in the Android APK build. */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') return configuredOrigin;
  if (isNativeApp()) return configuredOrigin || window.location.origin;
  return window.location.origin;
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = getAppOrigin();
  if (!origin) return normalized;
  if (typeof window !== 'undefined' && origin === window.location.origin) return normalized;
  return `${origin}${normalized}`;
}
