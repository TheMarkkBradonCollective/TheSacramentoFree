import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type InstallKind = 'browser' | 'pwa' | 'ios-pwa' | 'android-apk';

export const INSTALLED_WEB_VERSION_KEY = 'sbn_installed_web_version_v1';
export const INSTALLED_APK_VERSION_CODE_KEY = 'sbn_installed_apk_version_code_v1';
export const INSTALLED_APK_VERSION_NAME_KEY = 'sbn_installed_apk_version_name_v1';

export function detectInstallKind(): InstallKind {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'android-apk';
  }

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios-pwa';
    return 'pwa';
  }

  return 'browser';
}

export function installKindLabel(kind: InstallKind): string {
  switch (kind) {
    case 'android-apk':
      return 'Android app (APK)';
    case 'pwa':
      return 'Home screen app (Android)';
    case 'ios-pwa':
      return 'Home screen app (iPhone)';
    default:
      return 'Browser tab';
  }
}

export async function recordInstalledApkVersion(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const info = await App.getInfo();
    localStorage.setItem(INSTALLED_APK_VERSION_CODE_KEY, String(info.build));
    localStorage.setItem(INSTALLED_APK_VERSION_NAME_KEY, info.version);
  } catch {
    // ignore
  }
}

export async function recordInstalledWebVersion(): Promise<void> {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { v?: string };
    if (data.v) localStorage.setItem(INSTALLED_WEB_VERSION_KEY, data.v);
  } catch {
    // ignore
  }
}

export function readStoredWebVersion(): string | null {
  try {
    return localStorage.getItem(INSTALLED_WEB_VERSION_KEY);
  } catch {
    return null;
  }
}

export function readStoredApkVersion(): { versionName: string | null; versionCode: number | null } {
  try {
    const versionName = localStorage.getItem(INSTALLED_APK_VERSION_NAME_KEY);
    const rawCode = localStorage.getItem(INSTALLED_APK_VERSION_CODE_KEY);
    const versionCode = rawCode ? Number.parseInt(rawCode, 10) : null;
    return {
      versionName,
      versionCode: Number.isFinite(versionCode) ? versionCode : null,
    };
  } catch {
    return { versionName: null, versionCode: null };
  }
}

export async function readCurrentApkVersion(): Promise<{ versionName: string | null; versionCode: number | null }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      return { versionName: info.version, versionCode: Number.parseInt(String(info.build), 10) || null };
    } catch {
      return readStoredApkVersion();
    }
  }
  return readStoredApkVersion();
}
