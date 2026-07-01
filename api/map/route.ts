import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOsrmDrivingRoute } from '../../server/osrmRoute';

function parseCoord(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fromLat = parseCoord(req.query.fromLat);
  const fromLng = parseCoord(req.query.fromLng);
  const toLat = parseCoord(req.query.toLat);
  const toLng = parseCoord(req.query.toLng);

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return res.status(400).json({ error: 'fromLat, fromLng, toLat, and toLng are required' });
  }

  const route = await fetchOsrmDrivingRoute(
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
  );

  if (!route) {
    return res.status(502).json({ error: 'Could not calculate driving route' });
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  return res.status(200).json(route);
}
