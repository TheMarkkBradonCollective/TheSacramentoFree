/** Shared listing status copy for push notifications (client + server). */
export function listingStatusLabel(status: string, itemType?: string): string {
  switch (status) {
    case 'pending_pickup':
      return 'Pending pickup';
    case 'on_hold':
      return 'On hold';
    case 'completed':
      if (itemType === 'trade') return 'Traded';
      if (itemType === 'looking') return 'Fulfilled';
      return 'Gifted';
    case 'withdrawn':
      return 'Withdrawn';
    case 'active':
      return 'Active again';
    default:
      return 'Updated';
  }
}

export function newListingPushTitle(itemType?: string): string {
  if (itemType === 'looking') return 'New neighbor request';
  if (itemType === 'trade') return 'New trade offer';
  return 'New free item posted';
}
