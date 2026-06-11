import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CLEARED_NOTIFICATION_PREFERENCES,
  clearNotificationDataOnLogout,
  ensurePushSubscription,
  getNotificationPreferences,
  getPushPermissionState,
  listenForNotificationClicks,
  NOTIFICATION_SESSION_CLEARED_EVENT,
  preferencesEqual,
  saveNotificationPreferences,
  sendDirectorBroadcastTest,
  sendTestPushNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushPermissionState,
} from '../lib/pushNotifications';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import type { NotificationPreferences } from '../types';

export { clearNotificationDataOnLogout, clearNotificationDataOnLogout as clearPushSessionOnLogout };

type UsePushNotificationsOptions = {
  /** Load preference toggles and subscribe to DB changes. Off for lightweight subscribe-only UI. */
  syncPreferences?: boolean;
};

export function usePushNotifications(userId?: string, options?: UsePushNotificationsOptions) {
  const syncPreferences = options?.syncPreferences !== false;
  const [permission, setPermission] = useState<PushPermissionState>(() => getPushPermissionState());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isBroadcastTesting, setIsBroadcastTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferences>(CLEARED_NOTIFICATION_PREFERENCES);
  const [savedPreferences, setSavedPreferences] = useState<NotificationPreferences>(CLEARED_NOTIFICATION_PREFERENCES);
  const userIdRef = useRef(userId);
  const hasUnsavedRef = useRef(false);
  const realtimeChannelIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `prefs-${Math.random().toString(36).slice(2)}`,
  );

  const refreshPermission = useCallback(() => {
    setPermission(getPushPermissionState());
  }, []);

  const applyLoadedPreferences = useCallback((prefs: NotificationPreferences) => {
    setSavedPreferences(prefs);
    setPreferences(prefs);
  }, []);

  const loadPreferences = useCallback(async (options?: { force?: boolean }) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) return;
    if (!options?.force && hasUnsavedRef.current) return;

    setPrefsLoading(true);
    try {
      const prefs = await getNotificationPreferences(activeUserId);
      if (userIdRef.current !== activeUserId) return;
      applyLoadedPreferences(prefs);
    } finally {
      if (userIdRef.current === activeUserId) {
        setPrefsLoading(false);
      }
    }
  }, [applyLoadedPreferences]);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setIsSubscribed(false);
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  const resetPreferencesState = useCallback(() => {
    applyLoadedPreferences(CLEARED_NOTIFICATION_PREFERENCES);
    setError('');
    setSaveMessage('');
    setTestMessage('');
    setIsSaving(false);
    setPrefsLoading(false);
    setIsSubscribed(false);
    hasUnsavedRef.current = false;
  }, [applyLoadedPreferences]);

  const hasUnsavedChanges = useMemo(
    () => !preferencesEqual(preferences, savedPreferences),
    [preferences, savedPreferences],
  );

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!userId) {
      resetPreferencesState();
      return;
    }

    if (syncPreferences) {
      void loadPreferences({ force: true });
    }
    void checkSubscription();
  }, [userId, syncPreferences, loadPreferences, checkSubscription, resetPreferencesState]);

  useEffect(() => {
    const onSessionCleared = () => {
      resetPreferencesState();
    };

    window.addEventListener(NOTIFICATION_SESSION_CLEARED_EVENT, onSessionCleared);
    return () => window.removeEventListener(NOTIFICATION_SESSION_CLEARED_EVENT, onSessionCleared);
  }, [resetPreferencesState]);

  useEffect(() => {
    if (!userId || !syncPreferences) return;

    return subscribePostgresChanges(
      {
        channelName: `live-notification-prefs-${userId}-${realtimeChannelIdRef.current}`,
        table: 'notification_preferences',
        event: '*',
        filter: `userId=eq.${userId}`,
      },
      () => {
        void loadPreferences();
      },
    );
  }, [userId, syncPreferences, loadPreferences]);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    void ensurePushSubscription()
      .then(() => checkSubscription())
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not sync push subscription');
      });
  }, [userId, permission, checkSubscription]);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;

    const refreshSubscription = () => {
      if (document.visibilityState !== 'visible') return;
      void ensurePushSubscription()
        .then(() => checkSubscription())
        .catch(() => {});
    };

    refreshSubscription();
    const interval = window.setInterval(refreshSubscription, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', refreshSubscription);
    window.addEventListener('focus', refreshSubscription);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshSubscription);
      window.removeEventListener('focus', refreshSubscription);
    };
  }, [userId, permission, checkSubscription]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshPermission();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refreshPermission]);

  const enableNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const sub = await subscribeToPushNotifications();
      setIsSubscribed(!!sub);
      refreshPermission();
      if (!sub) {
        setError('Notification permission was not granted.');
      } else {
        await loadPreferences({ force: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [refreshPermission, loadPreferences]);

  const disableNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    setIsTesting(true);
    setError('');
    setTestMessage('');
    const result = await sendTestPushNotification();
    setIsTesting(false);
    if (result.ok) {
      setTestMessage('Test notification sent from the server — check your device.');
    } else {
      setError(result.errorMessage || 'Could not send test notification.');
    }
    return result.ok;
  }, []);

  const sendBroadcastTestNotification = useCallback(async () => {
    setIsBroadcastTesting(true);
    setError('');
    setTestMessage('');
    const result = await sendDirectorBroadcastTest();
    setIsBroadcastTesting(false);
    if (result.cancelled) return false;
    if (result.ok) {
      const devices = result.sent ?? 0;
      const neighbors = result.userCount ?? 0;
      setTestMessage(
        `Broadcast test sent to ${devices} device${devices === 1 ? '' : 's'} across ${neighbors} neighbor${neighbors === 1 ? '' : 's'}.`,
      );
    } else {
      setError(result.errorMessage || 'Could not send broadcast test.');
    }
    return result.ok;
  }, []);

  const setDraftPreferences = useCallback((next: NotificationPreferences) => {
    setPreferences(next);
    setSaveMessage('');
  }, []);

  const savePreferences = useCallback(async () => {
    if (!userId) return false;
    setIsSaving(true);
    setError('');
    setSaveMessage('');
    const ok = await saveNotificationPreferences(userId, preferences);
    setIsSaving(false);
    if (!ok) {
      setError('Could not save notification preferences');
      return false;
    }
    setSavedPreferences(preferences);
    setSaveMessage('Notification settings saved.');
    return true;
  }, [userId, preferences]);

  const discardPreferenceChanges = useCallback(() => {
    setPreferences(savedPreferences);
    setSaveMessage('');
  }, [savedPreferences]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSaving,
    prefsLoading,
    error,
    saveMessage,
    preferences,
    hasUnsavedChanges,
    enableNotifications,
    disableNotifications,
    setDraftPreferences,
    savePreferences,
    discardPreferenceChanges,
    sendTestNotification,
    sendBroadcastTestNotification,
    isTesting,
    isBroadcastTesting,
    testMessage,
    refreshPermission,
    reloadPreferences: loadPreferences,
  };
}

export function usePushDeepLinkNavigation(onNavigate: (target: import('../lib/pushDeepLink').PushDeepLinkTarget) => void) {
  useEffect(() => {
    return listenForNotificationClicks((url) => {
      import('../lib/pushDeepLink').then(({ parsePushDeepLink }) => {
        const target = parsePushDeepLink(url);
        if (target) onNavigate(target);
      });
    });
  }, [onNavigate]);
}
