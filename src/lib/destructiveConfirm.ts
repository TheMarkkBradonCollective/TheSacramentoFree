import type { ConfirmOptions } from '../contexts/ConfirmContext';

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export async function confirmRemoveComment(confirm: ConfirmFn): Promise<boolean> {
  return confirm({
    title: 'Remove comment?',
    message: 'This comment will be deleted for everyone. This cannot be undone.',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep comment',
    variant: 'danger',
  });
}

export async function confirmRemoveFeedComment(confirm: ConfirmFn, isStaff: boolean): Promise<boolean> {
  return confirm({
    title: 'Remove comment?',
    message: isStaff ? 'Delete this comment for everyone?' : 'Remove your comment?',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep comment',
    variant: 'danger',
  });
}

export async function confirmDeleteFeedPost(
  confirm: ConfirmFn,
  isStaffModeration: boolean,
): Promise<boolean> {
  return confirm({
    title: 'Delete post?',
    message: isStaffModeration
      ? 'Remove this neighbor post for everyone?'
      : 'Delete your post for everyone? This cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep post',
    variant: 'danger',
  });
}

export async function confirmDeleteListing(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Delete listing?',
    message: `Permanently delete "${title}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Keep listing',
    variant: 'danger',
  });
}

export async function confirmWithdrawListing(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Withdraw listing?',
    message: `"${title}" will be hidden from the community feed. You can repost it later from your profile.`,
    confirmLabel: 'Withdraw',
    cancelLabel: 'Keep active',
    variant: 'danger',
  });
}

export async function confirmMarkListingCompleted(
  confirm: ConfirmFn,
  title: string,
  actionLabel: string,
): Promise<boolean> {
  return confirm({
    title: `${actionLabel}?`,
    message: `Mark "${title}" as ${actionLabel.toLowerCase()}? Neighbors will no longer see it as available.`,
    confirmLabel: actionLabel,
    cancelLabel: 'Cancel',
  });
}

export async function confirmStaffWithdrawListing(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Withdraw listing?',
    message: `Withdraw "${title}" as staff? The poster will see it as withdrawn.`,
    confirmLabel: 'Withdraw',
    cancelLabel: 'Cancel',
    variant: 'danger',
  });
}

export async function confirmStaffDeleteListing(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Delete listing?',
    message: `Permanently delete "${title}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'danger',
  });
}

export async function confirmStaffCancelEvent(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Cancel event?',
    message: `Cancel "${title}" for everyone? Neighbors will see it as cancelled.`,
    confirmLabel: 'Cancel event',
    cancelLabel: 'Keep event',
    variant: 'danger',
  });
}

export async function confirmStaffDeleteEvent(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Delete event?',
    message: `Permanently delete "${title}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'danger',
  });
}

export async function confirmDeleteOwnEvent(confirm: ConfirmFn, title: string): Promise<boolean> {
  return confirm({
    title: 'Delete event?',
    message: `Permanently delete "${title}"? This cannot be undone.`,
    confirmLabel: 'Delete event',
    cancelLabel: 'Keep event',
    variant: 'danger',
  });
}

export async function confirmUnsendMessage(confirm: ConfirmFn): Promise<boolean> {
  return confirm({
    title: 'Unsend message?',
    message: 'Remove this message from the conversation? You can edit and send it again.',
    confirmLabel: 'Unsend',
    cancelLabel: 'Keep message',
    variant: 'danger',
  });
}

export async function confirmRemoveCommunityMessage(confirm: ConfirmFn): Promise<boolean> {
  return confirm({
    title: 'Remove message?',
    message: 'Remove this message from community chat for everyone?',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep message',
    variant: 'danger',
  });
}

export async function confirmDeleteConversation(confirm: ConfirmFn, isPostChat: boolean): Promise<boolean> {
  return confirm({
    title: 'Delete conversation?',
    message: isPostChat
      ? 'Delete this coordination chat for both neighbors? The thread will be removed from Messages.'
      : 'Delete this conversation for both neighbors? You will need a new message request to chat again.',
    confirmLabel: 'Delete conversation',
    cancelLabel: 'Keep conversation',
    variant: 'danger',
  });
}

export async function confirmDeleteAnnouncement(confirm: ConfirmFn): Promise<boolean> {
  return confirm({
    title: 'Delete announcement?',
    message: 'Delete this announcement for everyone? This cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep announcement',
    variant: 'danger',
  });
}

export async function confirmDeleteAppUpdate(confirm: ConfirmFn): Promise<boolean> {
  return confirm({
    title: 'Delete update?',
    message: 'Delete this app update for everyone? This cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep update',
    variant: 'danger',
  });
}

export async function confirmRemoveReview(confirm: ConfirmFn): Promise<boolean> {
  return confirm({
    title: 'Remove review?',
    message: 'Remove your review from the community list?',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep review',
    variant: 'danger',
  });
}
