import { SplashScreen } from '@capacitor/splash-screen';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { isAndroidApp, isNativeApp } from '../lib/nativePlatform';
import { initNativePushHandlers } from '../lib/nativePush';
import { recordInstalledApkVersion } from '../lib/installContext';
import { startSafeAreaInsetWatcher } from '../lib/safeAreaInsets';

export async function initCapacitorApp(): Promise<void> {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('capacitor-native');
  if (isAndroidApp()) {
    document.documentElement.classList.add('capacitor-android');
  }

  startSafeAreaInsetWatcher();

  try {
    const barColor = '#000000';
    if (isAndroidApp()) {
      // Edge-to-edge Android uses Capacitor SystemBars + --safe-area-inset-* CSS vars.
      await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', barColor);
    } else {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: barColor });
    }
  } catch {
    // Status bar APIs are platform-specific.
  }

  void SplashScreen.hide();
  void recordInstalledApkVersion();

  await initNativePushHandlers((url) => {
    window.dispatchEvent(new CustomEvent('sbn-native-notification-click', { detail: url }));
  });
}
