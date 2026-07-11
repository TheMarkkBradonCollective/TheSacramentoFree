import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp } from '../lib/nativePlatform';
import { initNativePushHandlers } from '../lib/nativePush';

export async function initCapacitorApp(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b0b0c' });
  } catch {
    // Status bar APIs are Android-only.
  }

  void SplashScreen.hide();

  await initNativePushHandlers((url) => {
    window.dispatchEvent(new CustomEvent('sbn-native-notification-click', { detail: url }));
  });
}
