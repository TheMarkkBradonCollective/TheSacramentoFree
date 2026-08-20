import type { VercelRequest, VercelResponse } from '@vercel/node';

type TrackInstallBody = {
  deviceId?: string;
  installKind?: string;
  apkVersionCode?: number | null;
  apkVersionName?: string | null;
  userId?: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { parseJsonBody } = await import('../push/_server/parseBody');
    const { normalizeDeviceId, normalizeInstallKind, trackDeviceInstall } = await import('./_server/deviceStats');

    const body = parseJsonBody(req) as TrackInstallBody;
    const deviceId = normalizeDeviceId(body.deviceId);
    const installKind = normalizeInstallKind(body.installKind);

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (!installKind) {
      return res.status(400).json({ error: 'installKind must be pwa, ios-pwa, or android-apk' });
    }

    const apkVersionCode =
      typeof body.apkVersionCode === 'number' && Number.isFinite(body.apkVersionCode)
        ? Math.floor(body.apkVersionCode)
        : null;
    const apkVersionName =
      typeof body.apkVersionName === 'string' && body.apkVersionName.trim()
        ? body.apkVersionName.trim().slice(0, 64)
        : null;
    const userId =
      typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim().slice(0, 128) : null;

    await trackDeviceInstall({
      deviceId,
      installKind,
      apkVersionCode,
      apkVersionName,
      userId,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/app/track-install]', err);
    const message = err instanceof Error ? err.message : 'Could not track install';
    const status = message.includes('missing') ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}
