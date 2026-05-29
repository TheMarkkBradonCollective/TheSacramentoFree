/** In-chat copy when a poster marks an item claimed (identity stays off the public listing). */
export function formatItemClaimedChatMessage(itemTitle: string): string {
  return (
    `✓ "${itemTitle}" was marked as claimed.\n` +
    `The public listing shows it as claimed only — who picked it up is never shown on the feed or map.`
  );
}

export function formatItemFulfilledChatMessage(itemTitle: string, helperDisplayName: string): string {
  return (
    `✓ "${itemTitle}" was marked as fulfilled.\n` +
    `Received from ${helperDisplayName}. This request is now closed.`
  );
}
