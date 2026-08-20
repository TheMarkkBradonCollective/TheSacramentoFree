import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOsrmDrivingRoute, parseTravelMode } from '../_lib/osrmRoute';
import { isInSacramentoServiceArea, parseRouteEndpoints } from '../_lib/mapCoords';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = parseRouteEndpoints(req.query);
    if ('error' in parsed) {
      return res.status(400).json({ error: parsed.error });
    }

    if (!isInSacramentoServiceArea(parsed.from, parsed.to)) {
      return res.status(400).json({ error: 'Route must stay within the Sacramento service area' });
    }

    const travelMode = parseTravelMode(req.query.mode ?? req.query.profile);
    const route = await fetchOsrmDrivingRoute(parsed.from, parsed.to, travelMode);

    if (!route) {
      return res.status(502).json({ error: 'Could not calculate route' });
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).json({ ...route, onRoads: true });
  } catch (err) {
    console.error('[api/map/route]', err);
    return res.status(500).json({ error: 'Route service error' });
  }
}
