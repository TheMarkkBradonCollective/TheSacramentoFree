export interface MessageGroupMeta {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
}

export function getMessageGroupMeta(
  messages: { senderId: string }[],
  index: number,
  currentUserId: string,
  options: { showNames?: boolean } = {},
): MessageGroupMeta {
  const msg = messages[index];
  const isUser = msg.senderId === currentUserId;
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const sameSenderAsPrev = !!prev && prev.senderId === msg.senderId;
  const sameSenderAsNext = !!next && next.senderId === msg.senderId;

  return {
    isFirstInGroup: !sameSenderAsPrev,
    isLastInGroup: !sameSenderAsNext,
    showAvatar: !isUser && !sameSenderAsNext,
    showSenderName: !!options.showNames && !isUser && !sameSenderAsPrev,
  };
}

export function messageGroupSpacing(meta: MessageGroupMeta): string {
  return meta.isFirstInGroup ? 'mt-4 first:mt-0' : 'mt-1';
}

export function messageBubbleClass(isUser: boolean, meta: MessageGroupMeta): string {
  const base =
    'max-w-[min(85%,20rem)] sm:max-w-[min(75%,24rem)] px-3.5 text-sm leading-relaxed';

  const padding = meta.isLastInGroup ? 'py-2.5' : 'py-1.5';

  const colors = isUser ? 'chat-bubble-out text-on-accent' : 'chat-bubble-in text-app';

  let radius: string;
  if (isUser) {
    if (meta.isFirstInGroup && meta.isLastInGroup) {
      radius = 'rounded-[1.25rem] rounded-br-md';
    } else if (meta.isFirstInGroup) {
      radius = 'rounded-[1.25rem] rounded-br-[0.35rem]';
    } else if (meta.isLastInGroup) {
      radius = 'rounded-[1.25rem] rounded-tr-[0.35rem] rounded-br-md';
    } else {
      radius = 'rounded-[1.25rem] rounded-r-[0.35rem]';
    }
  } else if (meta.isFirstInGroup && meta.isLastInGroup) {
    radius = 'rounded-[1.25rem] rounded-bl-md';
  } else if (meta.isFirstInGroup) {
    radius = 'rounded-[1.25rem] rounded-bl-[0.35rem]';
  } else if (meta.isLastInGroup) {
    radius = 'rounded-[1.25rem] rounded-tl-[0.35rem] rounded-bl-md';
  } else {
    radius = 'rounded-[1.25rem] rounded-l-[0.35rem]';
  }

  return [base, padding, colors, radius].join(' ');
}
