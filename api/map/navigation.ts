import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOsrmNavigationRoute } from '../_lib/osrmNavigation';

function parseCoord(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fromLat = parseCoord(req.query.fromLat);
    const fromLng = parseCoord(req.query.fromLng);
    const toLat = parseCoord(req.query.toLat);
    const toLng = parseCoord(req.query.toLng);

    if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, and toLng are required' });
    }

    if (!isValidCoord(fromLat, fromLng) || !isValidCoord(toLat, toLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const route = await fetchOsrmNavigationRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    );

    if (!route) {
      return res.status(502).json({ error: 'Could not calculate navigation route' });
    }

    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
    return res.status(200).json(route);
  } catch (err) {
    console.error('[api/map/navigation]', err);
    return res.status(500).json({ error: 'Navigation service error' });
  }
}
