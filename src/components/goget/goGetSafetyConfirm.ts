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
      title: 'Go to curb alert?',
      message:
        `Head straight to ${posterName}'s curb alert for ${itemTitle}. The poster won't be notified — ` +
        `you can optionally let them know after you arrive.`,
      confirmLabel: 'Go to',
      cancelLabel: 'Not now',
    });
  }

  return confirm({
    title: 'Start Go Get?',
    message:
      `This will notify ${posterName} that you want to pick up "${itemTitle}".\n\n` +
      `While you're on your way, your live location will be shared with them until pickup is cancelled or completed.`,
    confirmLabel: 'Yes, start Go Get',
    cancelLabel: 'Not now',
  });
}

/** Responder offers to drop off for a Looking / ISO post — navigates to the requester's area. */
export async function confirmDropOffAsFulfiller(
  confirm: ConfirmFn,
  requesterName: string,
  itemTitle: string,
): Promise<boolean> {
  return confirm({
    title: 'Start drop off?',
    message:
      `This will notify ${requesterName} that you're heading over with "${itemTitle}". ` +
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
    title: 'Head over now?',
    message:
      `Your live location will be shared with ${posterName} so they can follow your progress until pickup is cancelled or completed.`,
    confirmLabel: 'Go Get it',
    cancelLabel: 'Not yet',
  });
}

/** Responder starts drop-off from chat (Looking / ISO) — navigates to the requester's area. */
export async function confirmGoGetAsFulfiller(
  confirm: ConfirmFn,
  requesterName: string,
  itemTitle: string,
  itemType: 'looking' | 'trade' = 'looking',
): Promise<boolean> {
  if (itemType === 'trade') {
    return confirmMeetUp(confirm, requesterName, itemTitle);
  }
  return confirmDropOffAsFulfiller(confirm, requesterName, itemTitle);
}
