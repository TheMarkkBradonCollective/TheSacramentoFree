import type { SupportTicketMessage } from '../types';

export type SupportTicketLastMessage = Pick<
  SupportTicketMessage,
  'text' | 'createdAt' | 'senderUserId' | 'imageUrl'
>;

export function formatSupportTime(value: unknown): string {
  if (!value) return '';
  try {
    const date = new Date(value as string | number);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function supportMessagePreview(message?: SupportTicketLastMessage | null): string {
  if (!message) return 'Start the conversation';
  if (message.imageUrl && (!message.text || message.text === '📷 Photo')) {
    return '📷 Photo';
  }
  const text = message.text?.trim();
  return text || 'Start the conversation';
}
