import { isAndroidApp, isNativeApp } from './nativePlatform';

/** Typical Android status bar height when Capacitor inset injection is missing or zero. */
const ANDROID_FALLBACK_TOP_PX = 28;
/** Typical Android 3-button / gesture nav bar height when inset injection fails. */
const ANDROID_FALLBACK_BOTTOM_PX = 48;

function parseInsetPx(raw: string): number {
  const value = raw.trim();
  if (!value || value === '0' || value === '0px') return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalize safe-area insets for native shells. Capacitor injects
 * --safe-area-inset-* on Android, but WebView/version edge cases can leave
 * them at 0px — which breaks edge-to-edge layout.
 */
export function syncNativeSafeAreaInsets(): void {
  if (!isNativeApp()) return;

  const root = document.documentElement;
  const computed = getComputedStyle(root);

  let top = parseInsetPx(computed.getPropertyValue('--safe-area-inset-top'));
  let bottom = parseInsetPx(computed.getPropertyValue('--safe-area-inset-bottom'));
  let left = parseInsetPx(computed.getPropertyValue('--safe-area-inset-left'));
  let right = parseInsetPx(computed.getPropertyValue('--safe-area-inset-right'));

  if (isAndroidApp()) {
    if (top <= 0) top = ANDROID_FALLBACK_TOP_PX;
    if (bottom <= 0) bottom = ANDROID_FALLBACK_BOTTOM_PX;
  }

  root.style.setProperty('--sbn-inset-top', `${top}px`);
  root.style.setProperty('--sbn-inset-bottom', `${bottom}px`);
  root.style.setProperty('--sbn-inset-left', `${left}px`);
  root.style.setProperty('--sbn-inset-right', `${right}px`);
}

export function startSafeAreaInsetWatcher(): void {
  if (!isNativeApp()) return;

  syncNativeSafeAreaInsets();

  const root = document.documentElement;
  const observer = new MutationObserver(() => syncNativeSafeAreaInsets());
  observer.observe(root, { attributes: true, attributeFilter: ['style'] });

  window.addEventListener('resize', syncNativeSafeAreaInsets);
  window.visualViewport?.addEventListener('resize', syncNativeSafeAreaInsets);

  requestAnimationFrame(syncNativeSafeAreaInsets);
  window.setTimeout(syncNativeSafeAreaInsets, 100);
  window.setTimeout(syncNativeSafeAreaInsets, 500);
}
