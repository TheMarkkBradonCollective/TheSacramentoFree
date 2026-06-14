/** In-chat copy when a poster marks an item claimed (identity stays off the public listing). */
export function formatItemClaimedChatMessage(itemTitle: string, itemLabels?: string[]): string {
  const itemsLine =
    itemLabels && itemLabels.length > 0
      ? itemLabels.map((l) => `• ${l}`).join('\n')
      : `"${itemTitle}"`;

  return (
    `✓ Confirmed pickup:\n${itemsLine}\n` +
    `The public listing shows what is still available — who picked up is never shown in Stuff or on the map.`
  );
}

export function formatSelfClaimRequestMessage(claimerName: string, itemLabels: string[]): string {
  const list =
    itemLabels.length > 0
      ? itemLabels.map((l) => `• ${l}`).join('\n')
      : '• (this listing)';

  return (
    `📦 ${claimerName} says they have claimed (contactless pickup):\n${list}\n` +
    `Please confirm in chat when you verify the pickup.`
  );
}

export function formatItemFulfilledChatMessage(itemTitle: string, helperDisplayName: string): string {
  return (
    `✓ "${itemTitle}" was marked as fulfilled.\n` +
    `Received from ${helperDisplayName}. This request is now closed.`
  );
}

export function formatTradeCompletedChatMessage(itemTitle: string, partnerName: string): string {
  return (
    `✓ Trade completed for "${itemTitle}".\n` +
    `Swapped with ${partnerName}. This trade listing is now closed.`
  );
}
