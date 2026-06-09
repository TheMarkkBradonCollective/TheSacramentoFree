import { useCallback, useEffect, useState } from 'react';
import {
  ensurePushSubscription,
  getNotificationPreferences,
  getPushPermissionState,
  listenForNotificationClicks,
  saveNotificationPreferences,
  sendTestPushNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushPermissionState,
} from '../lib/pushNotifications';
import type { NotificationPreferences } from '../types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../lib/pushNotifications';

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<PushPermissionState>(() => getPushPermissionState());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const refreshPermission = useCallback(() => {
    setPermission(getPushPermissionState());
  }, []);

  const loadPreferences = useCallback(async () => {
    if (!userId) return;
    const prefs = await getNotificationPreferences(userId);
    setPreferences(prefs);
  }, [userId]);

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

  useEffect(() => {
    void loadPreferences();
    void checkSubscription();
  }, [loadPreferences, checkSubscription]);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    void ensurePushSubscription().then(() => checkSubscription());
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
      if (!sub) setError('Notification permission was not granted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [refreshPermission]);

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
      setTestMessage('Test notification sent — check your device.');
    } else {
      setError(result.errorMessage || 'Could not send test notification.');
    }
    return result.ok;
  }, []);

  const updatePreferences = useCallback(
    async (next: NotificationPreferences) => {
      if (!userId) return false;
      setPreferences(next);
      const ok = await saveNotificationPreferences(userId, next);
      if (!ok) setError('Could not save notification preferences');
      return ok;
    },
    [userId],
  );

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    preferences,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    sendTestNotification,
    isTesting,
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
