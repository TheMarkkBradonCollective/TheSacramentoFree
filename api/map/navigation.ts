import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOsrmNavigationRoute, parseTravelMode } from '../_lib/osrmNavigation';
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
    const route = await fetchOsrmNavigationRoute(parsed.from, parsed.to, travelMode);

    if (!route) {
      return res.status(502).json({ error: 'Could not calculate navigation route' });
    }

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.status(200).json(route);
  } catch (err) {
    console.error('[api/map/navigation]', err);
    return res.status(500).json({ error: 'Navigation service error' });
  }
}
