import { supabase } from '../supabase';
import { isNativeApp } from './nativePlatform';
import { clearLocalNativeSessionId, clearRemoteNativeAppSession } from './nativeAppSession';

/**
 * Sign out only this client. Browser/PWA uses local scope so the Android app on the
 * same phone stays signed in. Native app logout still revokes the account session
 * and releases the native_app_sessions slot.
 */
export async function signOutCurrentClient(userId?: string | null) {
  const native = isNativeApp();

  if (native && userId) {
    clearLocalNativeSessionId(userId);
    try {
      await clearRemoteNativeAppSession(userId);
    } catch (err) {
      console.warn('Could not clear native session on sign-out:', err);
    }
  }

  return supabase.auth.signOut({ scope: native ? 'global' : 'local' });
}
