import { useCallback, useEffect, useState } from 'react';
import {
  detectInstallKind,
  installKindLabel,
  readCurrentApkVersion,
  readStoredWebVersion,
  type InstallKind,
} from '../lib/installContext';

export type VersionStatus = 'up-to-date' | 'update-available' | 'unknown' | 'not-installed';

export interface AndroidVersionManifest {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  releaseTag: string;
  publishedAt: string;
  fileName: string;
}

export interface InstallVersionsState {
  installKind: InstallKind;
  installLabel: string;
  loading: boolean;
  error: string;
  latestWebVersion: string | null;
  currentWebVersion: string | null;
  webStatus: VersionStatus;
  latestApk: AndroidVersionManifest | null;
  currentApkVersionName: string | null;
  currentApkVersionCode: number | null;
  apkStatus: VersionStatus;
  refresh: () => Promise<void>;
}

function compareWebVersions(current: string | null, latest: string | null): VersionStatus {
  if (!latest) return 'unknown';
  if (!current) return 'unknown';
  if (current === latest) return 'up-to-date';
  return 'update-available';
}

function compareApkVersions(currentCode: number | null, latestCode: number | null): VersionStatus {
  if (!latestCode) return 'unknown';
  if (currentCode == null) return 'not-installed';
  if (currentCode >= latestCode) return 'up-to-date';
  return 'update-available';
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${path}?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export function useInstallVersions(): InstallVersionsState {
  const [installKind, setInstallKind] = useState<InstallKind>(() =>
    typeof window !== 'undefined' ? detectInstallKind() : 'browser',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestWebVersion, setLatestWebVersion] = useState<string | null>(null);
  const [currentWebVersion, setCurrentWebVersion] = useState<string | null>(null);
  const [latestApk, setLatestApk] = useState<AndroidVersionManifest | null>(null);
  const [currentApkVersionName, setCurrentApkVersionName] = useState<string | null>(null);
  const [currentApkVersionCode, setCurrentApkVersionCode] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    const kind = detectInstallKind();
    setInstallKind(kind);

    try {
      const [webLatest, apkLatest, apkCurrent] = await Promise.all([
        fetchJson<{ v?: string }>('/version.json'),
        fetchJson<AndroidVersionManifest>('/android-version.json'),
        readCurrentApkVersion(),
      ]);

      const latestWeb = webLatest?.v ?? null;
      const storedWeb = readStoredWebVersion();
      setLatestWebVersion(latestWeb);
      setCurrentWebVersion(storedWeb);
      setLatestApk(apkLatest);
      setCurrentApkVersionName(apkCurrent.versionName);
      setCurrentApkVersionCode(apkCurrent.versionCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check versions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const webStatus = compareWebVersions(currentWebVersion, latestWebVersion);
  const apkStatus = compareApkVersions(currentApkVersionCode, latestApk?.versionCode ?? null);

  return {
    installKind,
    installLabel: installKindLabel(installKind),
    loading,
    error,
    latestWebVersion,
    currentWebVersion,
    webStatus,
    latestApk,
    currentApkVersionName,
    currentApkVersionCode,
    apkStatus,
    refresh,
  };
}
