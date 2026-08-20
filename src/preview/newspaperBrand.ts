/** Preview-only brand for the newspaper public-site skin. Live app copy stays in siteContent.ts. */
export const NEWSPAPER = {
  name: 'The Sacramento Free',
  the: 'The',
  title: 'Sacramento Free',
  tagline: 'All the news that’s free to give.',
  volume: 'Vol. I, No. 1',
  city: 'Sacramento, California',
  price: 'Gratis',
  established: 'Est. 2026',
  kicker: 'A community gazette of free gifting',
  leadHeadline: 'Give freely. Ask kindly.',
  leadDeck:
    'Neighbors across Sacramento pass along furniture, clothes, plants, and the odd useful thing — with no selling, no bidding, and no flipping.',
  classifiedsHed: 'Classifieds',
  classifiedsDek: 'Today’s free offerings and neighbor requests. Sign in to claim, comment, or post your own.',
  editorHed: 'From the editor',
  lettersHed: 'Letters to the editor',
  noticesHed: 'Public notices',
  insideHed: 'Inside this edition',
  weatherHed: 'Edition facts',
  subscribeHed: 'Subscribe — it’s free',
  subscribeBody: 'Join the paper to post, message neighbors, and keep good things out of the landfill.',
  subscribeCta: 'Join the paper',
  learnCta: 'Read the story',
  previewLabel: 'Design preview',
  previewNote:
    'The Sacramento Free is a newspaper concept for this website. Production at sacramentobuynothing.com is unchanged.',
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
