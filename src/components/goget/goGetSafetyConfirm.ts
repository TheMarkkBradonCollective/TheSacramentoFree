import type { ConfirmOptions } from '../../contexts/ConfirmContext';

import { isInstantClaimCategory } from '../../lib/goGetSessions';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

function instantCategoryLabel(category: string): string {
  return category.trim().toLowerCase() || 'pickup';
}

/** Requester taps Go Get on a giveaway listing — notifies the poster and begins the pickup flow. */
export async function confirmGoGetAsRequester(
  confirm: ConfirmFn,
  posterName: string,
  itemTitle: string,
  category: string,
): Promise<boolean> {
  if (isInstantClaimCategory(category)) {
    return confirm({
      title: 'Start Go Get?',
      message:
        `Head to ${posterName}'s ${instantCategoryLabel(category)} for ${itemTitle}. The poster won't be notified — ` +
        `just follow the pickup instructions when you arrive.`,
      confirmLabel: 'Yes, go get it',
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

/** Fulfiller starts Go Get from chat (Looking / Trade) — shares pickup location with the requester. */
export async function confirmGoGetAsFulfiller(
  confirm: ConfirmFn,
  requesterName: string,
  itemTitle: string,
): Promise<boolean> {
  return confirm({
    title: 'Start Go Get?',
    message:
      `This will notify ${requesterName} that you're ready for pickup on "${itemTitle}" and share your location so they can navigate to you.\n\n` +
      `While they're on their way, their live location will be shared with you until pickup is cancelled or completed.`,
    confirmLabel: 'Yes, start Go Get',
    cancelLabel: 'Not now',
  });
}
