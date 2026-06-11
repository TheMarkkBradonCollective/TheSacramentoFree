import { runPushSend } from './runPushSend';
import { getSupabaseAdmin } from './supabaseAdmin';

export const GLOBAL_COMMUNITY_CHAT_ID = 'community-global';
export const STAFF_COMMUNITY_CHAT_ID = 'community-staff';

export function isCommunityChatId(chatId: string): boolean {
  return chatId === GLOBAL_COMMUNITY_CHAT_ID || chatId === STAFF_COMMUNITY_CHAT_ID;
}

async function getSenderName(senderId: string): Promise<string> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('users').select('displayName').eq('uid', senderId).maybeSingle();
  return String((data as { displayName?: string } | null)?.displayName || 'A neighbor');
}

export async function runCommunityChatMessageNotify(
  callerId: string,
  message: {
    id?: string;
    chatId?: string;
    senderId?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const chatId = String(message.chatId || '');
  const senderId = String(message.senderId || callerId);
  const text = String(message.text || '').trim();
  if (!chatId || !text) {
    return { status: 200, body: { ok: true, skipped: 'missing message fields' } };
  }
  if (!isCommunityChatId(chatId)) {
    return { status: 200, body: { ok: true, skipped: 'not a community chat' } };
  }

  const messageId = String(message.id || '');
  const senderName = await getSenderName(senderId);
  const preview = text.slice(0, 140);
  const isStaffChat = chatId === STAFF_COMMUNITY_CHAT_ID;

  return runPushSend(senderId, {
    eventType: isStaffChat ? 'staff_chat' : 'community_chat',
    title: isStaffChat ? `Staff chat — ${senderName}` : `Community chat — ${senderName}`,
    body: preview,
    url: isStaffChat ? '/messages/community-staff' : '/messages/community-global',
    conversationId: chatId,
    tag: messageId
      ? `${isStaffChat ? 'staff' : 'community'}-msg-${messageId}`
      : `${isStaffChat ? 'staff' : 'community'}-msg-${Date.now()}`,
  });
}
