import type { ConfirmOptions } from '../../contexts/ConfirmContext';

import { isInstantClaimCategory } from '../../lib/goGetSessions';
import { meetCopyForMode } from '../../lib/meetCopy';
import type { CoordinationMode } from '../../types';

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
        `Navigate to ${posterName}'s ${itemTitle}. Your live trip is shared with them while you're on the way. ` +
        `After you pick up, choose what you took (if there are multiple items) — they'll confirm in chat.`,
      confirmLabel: 'Pick Up & share trip',
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
  startedBy: 'neighbor' | 'poster' = 'neighbor',
): Promise<boolean> {
  if (startedBy === 'poster') {
    return confirm({
      title: 'Start this Meet?',
      message:
        `This invites ${otherName} to meet for "${itemTitle}". You'll both navigate to the meetup pin. Live location is shared only while this Meet is active.`,
      confirmLabel: 'Start Meet',
      cancelLabel: 'Not now',
    });
  }
  return confirm({
    title: 'Meet up?',
    message:
      `This notifies ${otherName} that you want to meet for "${itemTitle}". You'll both navigate to the meetup pin once they accept.\n\n` +
      `Live location is shared only while this Meet is active.`,
    confirmLabel: 'Meet up',
    cancelLabel: 'Not now',
  });
}

/** Traveler starts live navigation after the other neighbor is ready. */
export async function confirmGoGetTripStart(
  confirm: ConfirmFn,
  otherName: string,
  mode: CoordinationMode = 'go_get',
): Promise<boolean> {
  const copy = meetCopyForMode(mode);
  const isMeet = mode === 'meet_up';
  return confirm({
    title: 'Before you go',
    message: isMeet
      ? `Confirm the meet location, keep communication in Sacramento Free, and don't enter unsafe or private areas. If something feels wrong, cancel and report it.\n\n` +
        `Your live location will be shared with ${otherName} until this Meet ends.`
      : `Confirm the pickup location, keep communication in Sacramento Free, and don't enter unsafe or private areas. If something feels wrong, cancel and report it.\n\n` +
        `Your live location will be shared with ${otherName} until this pickup ends.`,
    confirmLabel: copy.startTrip,
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
