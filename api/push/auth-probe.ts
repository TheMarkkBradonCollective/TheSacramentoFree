import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getUserFromBearer } = await import('../../push-server.bundle.cjs');
    const user = await getUserFromBearer(req.headers.authorization);
    return res.status(200).json({ ok: true, authenticated: Boolean(user) });
  } catch {
    return res.status(500).json({ error: 'Auth probe failed' });
  }
}
