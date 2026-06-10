import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer } from './_server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getUserFromBearer(req.headers.authorization);
  return res.status(200).json({ ok: true, authenticated: Boolean(user) });
}
