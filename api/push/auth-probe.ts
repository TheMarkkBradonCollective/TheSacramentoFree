import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { getUserFromBearer } = await import('../../push-server.bundle.cjs');
    const user = await getUserFromBearer(req.headers.authorization);
    return res.status(200).json({ ok: true, authenticated: Boolean(user), bundled: true });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Bundle load failed',
    });
  }
}
