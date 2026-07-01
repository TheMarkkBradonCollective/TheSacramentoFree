import { supabase, createSupabaseMessage } from '../supabase';
import type { Chat, ItemPost } from '../types';
import { formatRouteDistance, formatRouteDuration } from './mapRoute';
import { notifyPosterOnTheWay } from './pushEvents';

async function findListingChat(
  itemId: string,
  travelerUserId: string,
  posterUserId: string,
): Promise<Chat | null> {
  try {
    const { data, error } = await supabase.from('chats').select('*').eq('itemId', itemId);
    if (error || !data?.length) return null;

    for (const row of data) {
      const chat = row as Chat;
      const ids = Array.isArray(chat.participantIds) ? chat.participantIds : [];
      if (ids.includes(travelerUserId) && ids.includes(posterUserId)) {
        return chat;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function buildOnTheWayMessage(itemTitle: string, distanceLabel: string, durationLabel: string): string {
  return `🚗 On my way for "${itemTitle}" — about ${distanceLabel} away (${durationLabel}).`;
}

/** Notify listing poster that a neighbor is en route (ETA + distance only — never live GPS). */
export async function notifyPosterEnRoute(params: {
  item: ItemPost;
  travelerUserId: string;
  travelerName: string;
  distanceMeters: number;
  durationSeconds: number;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { item, travelerUserId, travelerName, distanceMeters, durationSeconds } = params;

  if (item.userId === travelerUserId) {
    return { ok: true };
  }

  const distanceLabel = formatRouteDistance(distanceMeters);
  const durationLabel = formatRouteDuration(durationSeconds);

  try {
    const chat = await findListingChat(item.id, travelerUserId, item.userId);
    if (chat) {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const text = buildOnTheWayMessage(item.title, distanceLabel, durationLabel);
      const sent = await createSupabaseMessage(chat.id, text, travelerUserId, messageId, { skipPush: true });
      if (!sent) {
        console.warn('[navigation] on-the-way chat message failed');
      }
    }

    await notifyPosterOnTheWay({
      item,
      travelerUserId,
      travelerName,
      distanceLabel,
      durationLabel,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not notify the poster.';
    return { ok: false, errorMessage: message };
  }
}
