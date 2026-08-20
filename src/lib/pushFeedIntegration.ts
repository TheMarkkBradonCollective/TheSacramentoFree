import { supabase } from '../supabase';
import {
  notifyFeedComment,
  notifyFeedDownvote,
  notifyFeedReaction,
  notifyFeedUpvote,
} from './pushEvents';
import { isVoteNotifyBurst, VOTE_NOTIFY_BURST_WINDOW_MS } from '../../shared/voteNotifyCooldown';

async function getFeedPostAuthorId(postId: string): Promise<string | null> {
  const { data } = await supabase.from('feed_posts').select('userId').eq('id', postId).maybeSingle();
  return data?.userId ? String(data.userId) : null;
}

export async function pushAfterFeedComment(comment: {
  id?: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
}) {
  const authorId = await getFeedPostAuthorId(comment.postId);
  if (!authorId || authorId === comment.userId) return;

  const preview = comment.text.trim();
  if (!preview) return;

  await notifyFeedComment({
    postId: comment.postId,
    authorUserId: authorId,
    commenterName: comment.userName || 'A neighbor',
    preview,
    commentId: comment.id,
  });
}

export async function pushAfterFeedReaction(params: {
  postId: string;
  reactorUserId: string;
  emoji: string;
  added: boolean;
}) {
  if (!params.added) return;

  const authorId = await getFeedPostAuthorId(params.postId);
  if (!authorId || authorId === params.reactorUserId) return;

  const { data: post } = await supabase.from('feed_posts').select('text').eq('id', params.postId).maybeSingle();
  const preview = String((post as { text?: string } | null)?.text || 'your post').trim().slice(0, 80) || 'your post';

  await notifyFeedReaction({
    postId: params.postId,
    authorUserId: authorId,
    reactorUserId: params.reactorUserId,
    emoji: params.emoji,
    preview,
  });
}

export async function pushAfterFeedVote(params: {
  postId: string;
  voterUserId: string;
  voteType: 'up' | 'down';
}) {
  const authorId = await getFeedPostAuthorId(params.postId);
  if (!authorId || authorId === params.voterUserId) return;

  const cutoff = new Date(Date.now() - VOTE_NOTIFY_BURST_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from('community_content_votes')
    .select('targetId', { count: 'exact', head: true })
    .eq('targetType', 'feed_post')
    .eq('userId', params.voterUserId)
    .gte('createdAt', cutoff);

  if (isVoteNotifyBurst(count)) return;

  if (params.voteType === 'up') {
    await notifyFeedUpvote({
      postId: params.postId,
      authorUserId: authorId,
      voterUserId: params.voterUserId,
    });
  } else {
    await notifyFeedDownvote({
      postId: params.postId,
      authorUserId: authorId,
      voterUserId: params.voterUserId,
    });
  }
}
