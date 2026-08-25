/** The Sacramento Free newspaper look. Original orange remains at ?skin=original. Live product copy stays in siteContent.ts. */
import { COMMUNITY_SLOGAN } from '../siteContent';

export const NEWSPAPER = {
  name: 'TheSacramentoFree',
  the: 'The',
  title: 'Sacramento Free',
  tagline: COMMUNITY_SLOGAN,
  city: 'Sacramento, California',
  cityLine: 'Sacramento • California',
  edition: 'Community Edition',
  motto: COMMUNITY_SLOGAN,
  volume: 'Vol. I · No. 1',
  standfirst: 'Sacramento’s Community Exchange',
  price: 'Gratis',
  previewLabel: 'Design preview',
  previewNote:
    'Same app — same pages, features, and flows. The Sacramento Free is the look; this is a visual reskin only. Add ?skin=original to see the previous site.',
  originalCta: 'View original site',
  newspaperCta: 'View TheSacramentoFree',
  footerByline: 'Printed for neighbors, not for profit.',
} as const;

export function formatNewspaperDate(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function withNewspaperName(text: string): string {
  return text
    .replaceAll('Sacramento Buy Nothing', NEWSPAPER.name)
    .replaceAll('SacramentoBuyNothing', NEWSPAPER.name);
}

export function isNewspaperProductionHost(hostname = typeof window === 'undefined' ? '' : window.location.hostname): boolean {
  return hostname.replace(/^www\./, '') === 'sacramentobuynothing.com';
}
