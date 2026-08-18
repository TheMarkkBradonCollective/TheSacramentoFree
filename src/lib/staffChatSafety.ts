import type { ConfirmOptions } from '../contexts/ConfirmContext';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/** Staff opens (or reopens) a support thread about a neighbor listing. */
export async function confirmStaffListingOutreach(
  confirm: ConfirmFn,
  neighborName: string,
  listingTitle: string,
): Promise<boolean> {
  return confirm({
    title: 'Open staff support thread?',
    message:
      `This opens a support conversation with ${neighborName} about "${listingTitle}". ` +
      'All staff can read and reply. The neighbor sees it in their Support chats — not a private DM.',
    confirmLabel: 'Open staff thread',
    cancelLabel: 'Cancel',
  });
}

/** Staff opens a support thread about a community event. */
export async function confirmStaffEventOutreach(
  confirm: ConfirmFn,
  hostName: string,
  eventTitle: string,
): Promise<boolean> {
  return confirm({
    title: 'Open staff support thread?',
    message:
      `This opens a support conversation with ${hostName} about "${eventTitle}". ` +
      'All staff can read and reply. The host sees it in their Support chats.',
    confirmLabel: 'Open staff thread',
    cancelLabel: 'Cancel',
  });
}

/** Staff views a neighbor listing coordination chat (oversight). */
export async function confirmStaffCoordinationChatView(
  confirm: ConfirmFn,
  listingTitle?: string,
): Promise<boolean> {
  const subject = listingTitle?.trim() ? `"${listingTitle}"` : 'this listing';
  return confirm({
    title: 'View neighbor coordination chat?',
    message:
      `You are opening a private neighbor coordination chat about ${subject}. ` +
      'Only participate when needed for safety or moderation. For official staff outreach, use Staff chat on the listing.',
    confirmLabel: 'View chat',
    cancelLabel: 'Cancel',
  });
}
