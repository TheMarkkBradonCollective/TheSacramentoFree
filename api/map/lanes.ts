import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOsmLanesForPoint } from '../_lib/osmLanes';
import { isInSacramentoServiceArea, isValidCoord, parseCoord } from '../_lib/mapCoords';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    if (lat == null || lng == null || !isValidCoord(lat, lng)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const point = { lat, lng };
    if (!isInSacramentoServiceArea(point, point)) {
      return res.status(400).json({ error: 'Point must stay within the Sacramento service area' });
    }

    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const lanes = await fetchOsmLanesForPoint(lat, lng, name);

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).json({ lanes });
  } catch (err) {
    console.error('[api/map/lanes]', err);
    return res.status(500).json({ error: 'Lane lookup failed' });
  }
}
