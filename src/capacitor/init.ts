import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp } from '../lib/nativePlatform';
import { initNativePushHandlers } from '../lib/nativePush';
import { recordInstalledApkVersion } from '../lib/installContext';

export async function initCapacitorApp(): Promise<void> {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('capacitor-native');

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b0b0c' });
  } catch {
    // Status bar APIs are Android-only.
  }

  void SplashScreen.hide();
  void recordInstalledApkVersion();

  await initNativePushHandlers((url) => {
    window.dispatchEvent(new CustomEvent('sbn-native-notification-click', { detail: url }));
  });
}
