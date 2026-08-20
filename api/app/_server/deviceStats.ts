import { getSupabaseAdmin } from '../../push/_server/supabaseAdmin';

const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const INSTALL_KINDS = new Set(['pwa', 'ios-pwa', 'android-apk']);

export function normalizeDeviceId(raw: unknown): string | null {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!id || !DEVICE_ID_RE.test(id)) return null;
  return id;
}

export function normalizeFileType(raw: unknown): 'apk' | 'aab' | null {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'apk' || value === 'aab') return value;
  return null;
}

export function normalizeInstallKind(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!INSTALL_KINDS.has(value)) return null;
  return value;
}

export async function trackDeviceDownload(deviceId: string, fileType: 'apk' | 'aab'): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await supabase
    .from('app_device_downloads')
    .select('deviceId, apkDownloadedAt, aabDownloadedAt, firstSeenAt')
    .eq('deviceId', deviceId)
    .maybeSingle();

  if (readError) {
    if (readError.code === '42P01') {
      throw new Error('app_device_downloads table is missing. Run the app device stats migration.');
    }
    throw new Error(readError.message || 'Could not read download stats');
  }

  const row = {
    deviceId,
    apkDownloadedAt:
      fileType === 'apk' ? (existing?.apkDownloadedAt ?? now) : (existing?.apkDownloadedAt ?? null),
    aabDownloadedAt:
      fileType === 'aab' ? (existing?.aabDownloadedAt ?? now) : (existing?.aabDownloadedAt ?? null),
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
  };

  const { error } = await supabase.from('app_device_downloads').upsert(row, { onConflict: 'deviceId' });
  if (error) {
    if (error.code === '42P01') {
      throw new Error('app_device_downloads table is missing. Run the app device stats migration.');
    }
    throw new Error(error.message || 'Could not save download stats');
  }
}

export async function trackDeviceInstall(input: {
  deviceId: string;
  installKind: string;
  apkVersionCode?: number | null;
  apkVersionName?: string | null;
  userId?: string | null;
}): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await supabase
    .from('app_device_installs')
    .select('deviceId, installKind, firstInstalledAt')
    .eq('deviceId', input.deviceId)
    .eq('installKind', input.installKind)
    .maybeSingle();

  if (readError) {
    if (readError.code === '42P01') {
      throw new Error('app_device_installs table is missing. Run the app device stats migration.');
    }
    throw new Error(readError.message || 'Could not read install stats');
  }

  const row = {
    deviceId: input.deviceId,
    installKind: input.installKind,
    apkVersionCode: input.apkVersionCode ?? null,
    apkVersionName: input.apkVersionName ?? null,
    userId: input.userId ?? null,
    firstInstalledAt: existing?.firstInstalledAt ?? now,
    lastSeenAt: now,
  };

  const { error } = await supabase.from('app_device_installs').upsert(row, {
    onConflict: 'deviceId,installKind',
  });
  if (error) {
    if (error.code === '42P01') {
      throw new Error('app_device_installs table is missing. Run the app device stats migration.');
    }
    throw new Error(error.message || 'Could not save install stats');
  }
}
