import type { ConfirmOptions } from '../../contexts/ConfirmContext';

import { isInstantClaimCategory } from '../../lib/goGetSessions';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/** Requester taps Go Get on a giveaway listing — notifies the poster and begins the pickup flow. */
export async function confirmGoGetAsRequester(
  confirm: ConfirmFn,
  posterName: string,
  itemTitle: string,
  category: string,
): Promise<boolean> {
  if (isInstantClaimCategory(category)) {
    return confirm({
      title: 'Pick up this item?',
      message:
        `Navigate straight to ${posterName}'s ${itemTitle}. The poster won't be notified you're coming — ` +
        `you can optionally let them know once you arrive or after you've picked up.`,
      confirmLabel: 'Pick Up',
      cancelLabel: 'Not now',
    });
  }

  return confirm({
    title: 'Start this pickup?',
    message:
      `This notifies ${posterName} that you want "${itemTitle}". The app coordinates the pickup — you stay in control of the exchange.\n\n` +
      `Your live location is shared only while this pickup is active.`,
    confirmLabel: 'Request pickup',
    cancelLabel: 'Not now',
  });
}

/**
 * Responder offers to drop off for a Looking / ISO post.
 * Session roles: looking poster = fulfiller (waits); responder = requester (navigates).
 * `posterName` is the looking poster who will be notified.
 */
export async function confirmDropOffAsFulfiller(
  confirm: ConfirmFn,
  posterName: string,
  itemTitle: string,
): Promise<boolean> {
  return confirm({
    title: 'Start drop off?',
    message:
      `This will notify ${posterName} that you're heading over with "${itemTitle}". ` +
      `You'll navigate to their area and can share your live location while en route.`,
    confirmLabel: 'Start drop off',
    cancelLabel: 'Not now',
  });
}

/** Either party starts a trade meetup at the listing pin. */
export async function confirmMeetUp(
  confirm: ConfirmFn,
  otherName: string,
  itemTitle: string,
): Promise<boolean> {
  return confirm({
    title: 'Meet up?',
    message:
      `This will notify ${otherName} that you're heading to the meetup spot for "${itemTitle}". ` +
      `You can share live location while en route.`,
    confirmLabel: 'Meet up',
    cancelLabel: 'Not now',
  });
}

/** Requester taps Go Get it after the poster confirms they're ready — starts live navigation. */
export async function confirmGoGetTripStart(confirm: ConfirmFn, posterName: string): Promise<boolean> {
  return confirm({
    title: 'Before you go',
    message:
      `Confirm the pickup location, keep communication in Sacramento Free, and don't enter unsafe or private areas. If something feels wrong, cancel and report it.\n\n` +
      `Your live location will be shared with ${posterName} until this pickup ends.`,
    confirmLabel: 'Start trip',
    cancelLabel: 'Not yet',
  });
}

/** Chat entry for Looking drop-off or Trade meet-up — caller becomes the navigator (requester). */
export async function confirmGoGetAsFulfiller(
  confirm: ConfirmFn,
  otherName: string,
  itemTitle: string,
  itemType: 'looking' | 'trade' = 'looking',
): Promise<boolean> {
  if (itemType === 'trade') {
    return confirmMeetUp(confirm, otherName, itemTitle);
  }
  return confirmDropOffAsFulfiller(confirm, otherName, itemTitle);
}
