import { PushNotifications } from '@capacitor/push-notifications';
import { getNativePushPermissionState } from './nativePush';
import { getPushPermissionState, refreshNativePushPermissionState } from './pushNotifications';
import { isNativeApp } from './nativePlatform';
import { Capacitor } from '@capacitor/core';

export type SystemPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

const ANDROID_PACKAGE = 'org.sacramentobuynothing.app';

function mapNotificationState(state: string): SystemPermissionState {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  if (state === 'default' || state === 'prompt') return 'prompt';
  return 'unsupported';
}

export async function checkNotificationPermission(): Promise<SystemPermissionState> {
  if (isNativeApp()) {
    const state = await getNativePushPermissionState();
    return mapNotificationState(state);
  }

  const state = getPushPermissionState();
  if (state === 'unsupported') return 'unsupported';
  return mapNotificationState(state);
}

export async function requestNotificationPermission(): Promise<SystemPermissionState> {
  if (isNativeApp()) {
    const result = await PushNotifications.requestPermissions();
    await refreshNativePushPermissionState();
    return mapNotificationState(result.receive);
  }

  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  return mapNotificationState(result);
}

export async function checkLocationPermission(): Promise<SystemPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';

  if ('permissions' in navigator) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return mapNotificationState(status.state);
    } catch {
      // Permissions API unavailable for geolocation on this browser — probe below.
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve('denied');
        else resolve('prompt');
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  });
}

export async function requestLocationPermission(): Promise<SystemPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) resolve('denied');
        else resolve('prompt');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  });
}

/** Open the OS screen where neighbors can allow or revoke app permissions. */
export async function openAppPermissionSettings(): Promise<boolean> {
  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    try {
      window.location.href = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;scheme=package;package=${ANDROID_PACKAGE};end`;
      return true;
    } catch {
      return false;
    }
  }

  if (platform === 'ios') {
    try {
      window.location.href = 'app-settings:';
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function permissionStatusLabel(state: SystemPermissionState): string {
  if (state === 'granted') return 'Allowed';
  if (state === 'denied') return 'Blocked';
  if (state === 'prompt') return 'Not set';
  return 'Unavailable';
}
