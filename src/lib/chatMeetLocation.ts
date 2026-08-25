import { supabase } from '../supabase';
import type { ChatMeetLocation } from '../types';

export type { ChatMeetLocation };

function normalizeChatMeetLocation(row: Record<string, unknown>): ChatMeetLocation {
  return {
    chatId: String(row.chatId),
    itemId: String(row.itemId),
    setByUserId: String(row.setByUserId),
    lat: Number(row.lat),
    lng: Number(row.lng),
    label: row.label != null && String(row.label).length > 0 ? String(row.label) : null,
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  };
}

function isMissingChatMeetTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ''} ${error.message ?? ''}`;
  return /chat_meet_locations|42P01|PGRST204|schema cache/i.test(text);
}

export async function getChatMeetLocation(chatId: string): Promise<ChatMeetLocation | null> {
  try {
    const { data, error } = await supabase
      .from('chat_meet_locations')
      .select('*')
      .eq('chatId', chatId)
      .maybeSingle();
    if (error) {
      if (isMissingChatMeetTable(error)) return null;
      console.warn('getChatMeetLocation:', error.message);
      return null;
    }
    return data ? normalizeChatMeetLocation(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Meet pins this user can see via listing chats (RLS filters to their threads). */
export async function getChatMeetLocationsForUser(): Promise<ChatMeetLocation[]> {
  try {
    const { data, error } = await supabase.from('chat_meet_locations').select('*');
    if (error) {
      if (isMissingChatMeetTable(error)) return [];
      console.warn('getChatMeetLocationsForUser:', error.message);
      return [];
    }
    return (data ?? []).map((row) => normalizeChatMeetLocation(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function upsertChatMeetLocation(params: {
  chatId: string;
  itemId: string;
  setByUserId: string;
  lat: number;
  lng: number;
  label?: string;
}): Promise<{ ok: boolean; location?: ChatMeetLocation; errorMessage?: string }> {
  const now = new Date().toISOString();
  const payload = {
    chatId: params.chatId,
    itemId: params.itemId,
    setByUserId: params.setByUserId,
    lat: params.lat,
    lng: params.lng,
    label: params.label?.trim() || null,
    updatedAt: now,
    createdAt: now,
  };
  const { data, error } = await supabase
    .from('chat_meet_locations')
    .upsert(payload, { onConflict: 'chatId' })
    .select('*')
    .maybeSingle();
  if (error) {
    if (isMissingChatMeetTable(error)) {
      return {
        ok: false,
        errorMessage: 'Run the chat meet location SQL in complete-schema.sql in Supabase.',
      };
    }
    return { ok: false, errorMessage: error.message };
  }
  if (!data) return { ok: false, errorMessage: 'Could not save the meet spot.' };
  return { ok: true, location: normalizeChatMeetLocation(data as Record<string, unknown>) };
}
