/** Preview-only brand for The Sacramento Free newspaper skin. Live production copy stays in siteContent.ts. */
export const NEWSPAPER = {
  name: 'The Sacramento Free',
  the: 'The',
  title: 'Sacramento Free',
  tagline: 'All the news that’s fit to give.',
  city: 'Sacramento, California',
  previewLabel: 'Design preview',
  previewNote:
    'Same app — same pages, features, and flows. This grey newspaper look is a visual reskin only. Production at sacramentobuynothing.com is unchanged.',
  originalCta: 'View original site',
  newspaperCta: 'View newspaper preview',
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
