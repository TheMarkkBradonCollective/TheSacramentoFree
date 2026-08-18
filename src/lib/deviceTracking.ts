import { apiUrl } from './appOrigin';
import { detectInstallKind, readCurrentApkVersion } from './installContext';

const DEVICE_ID_KEY = 'sbn_device_id_v1';
const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && DEVICE_ID_RE.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function detectDownloadFileType(href: string): 'apk' | 'aab' | null {
  const lower = href.toLowerCase();
  if (lower.includes('.aab')) return 'aab';
  if (lower.includes('.apk')) return 'apk';
  return null;
}

export async function trackAppDownload(fileType: 'apk' | 'aab'): Promise<void> {
  try {
    await fetch(apiUrl('/api/app/track-download'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getOrCreateDeviceId(), fileType }),
      keepalive: true,
    });
  } catch {
    // non-fatal analytics
  }
}

export async function trackAppDownloadFromHref(href: string): Promise<void> {
  const fileType = detectDownloadFileType(href);
  if (!fileType) return;
  await trackAppDownload(fileType);
}

export async function reportAppInstall(userId?: string | null): Promise<void> {
  const installKind = detectInstallKind();
  if (installKind === 'browser') return;

  let apkVersionCode: number | null = null;
  let apkVersionName: string | null = null;
  if (installKind === 'android-apk') {
    const apk = await readCurrentApkVersion();
    apkVersionCode = apk.versionCode;
    apkVersionName = apk.versionName;
  }

  try {
    await fetch(apiUrl('/api/app/track-install'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        installKind,
        apkVersionCode,
        apkVersionName,
        userId: userId ?? null,
      }),
      keepalive: true,
    });
  } catch {
    // non-fatal analytics
  }
}
