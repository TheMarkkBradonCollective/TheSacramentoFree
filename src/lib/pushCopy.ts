const APP = 'Sacramento Buy Nothing';

export function clip(text: string, max = 140): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/** Title names the event; body carries who said what. */
export function neighborMessage(sender: string, preview: string, fallback: string): { title: string; body: string } {
  const body = clip(preview) || fallback;
  return {
    title: sender,
    body,
  };
}

export function listingAlert(title: string, neighbor: string, detail: string): { title: string; body: string } {
  return {
    title,
    body: clip(`${neighbor}: ${detail}`) || `${neighbor} posted in ${APP}`,
  };
}

export function directorAlert(title: string, detail: string): { title: string; body: string } {
  return {
    title: clip(title, 80),
    body: clip(detail, 180) || 'Open the director overview for details.',
  };
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending_pickup':
      return 'Pending pickup';
    case 'on_hold':
      return 'On hold';
    case 'completed':
      return 'Gifted';
    case 'withdrawn':
      return 'Withdrawn';
    case 'active':
      return 'Active again';
    default:
      return 'Updated';
  }
}
