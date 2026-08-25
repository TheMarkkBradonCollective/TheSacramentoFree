import { supabase } from '../supabase';

let markReadRpcAvailable: boolean | null = null;
let readCountsRpcAvailable: boolean | null = null;

export async function markChatMessagesRead(chatId: string, messageIds: string[]): Promise<void> {
  if (!chatId || messageIds.length === 0 || markReadRpcAvailable === false) return;

  const { error } = await supabase.rpc('mark_chat_messages_read', {
    target_chat_id: chatId,
    target_message_ids: messageIds,
  });

  if (error) {
    const message = String(error.message || '');
    if (/mark_chat_messages_read|message_reads/i.test(message)) {
      markReadRpcAvailable = false;
    }
    return;
  }

  markReadRpcAvailable = true;
}

export async function getMessageReadCounts(messageIds: string[]): Promise<Record<string, number>> {
  if (messageIds.length === 0 || readCountsRpcAvailable === false) return {};

  const { data, error } = await supabase.rpc('get_message_read_counts', {
    target_message_ids: messageIds,
  });

  if (error) {
    const message = String(error.message || '');
    if (/get_message_read_counts|message_reads/i.test(message)) {
      readCountsRpcAvailable = false;
    }
    return {};
  }

  readCountsRpcAvailable = true;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = String((row as { message_id?: string }).message_id ?? '');
    const count = Number((row as { read_count?: number }).read_count ?? 0);
    if (id && Number.isFinite(count) && count > 0) counts[id] = count;
  }
  return counts;
}
