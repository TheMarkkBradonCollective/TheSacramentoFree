import type { VercelRequest, VercelResponse } from '@vercel/node';

type TrackDownloadBody = {
  deviceId?: string;
  fileType?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { parseJsonBody } = await import('../push/_server/parseBody');
    const { normalizeDeviceId, normalizeFileType, trackDeviceDownload } = await import('./_server/deviceStats');

    const body = parseJsonBody(req) as TrackDownloadBody;
    const deviceId = normalizeDeviceId(body.deviceId);
    const fileType = normalizeFileType(body.fileType);

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (!fileType) {
      return res.status(400).json({ error: 'fileType must be apk or aab' });
    }

    await trackDeviceDownload(deviceId, fileType);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/app/track-download]', err);
    const message = err instanceof Error ? err.message : 'Could not track download';
    const status = message.includes('missing') ? 503 : 500;
    return res.status(status).json({ error: message });
  }
}
