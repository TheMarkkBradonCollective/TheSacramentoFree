import { supabase } from '../supabase';
import {
  notifyFeedComment,
  notifyFeedDownvote,
  notifyFeedPost,
  notifyFeedReaction,
  notifyFeedUpvote,
} from './pushEvents';
import { isVoteNotifyBurst, VOTE_NOTIFY_BURST_WINDOW_MS } from '../../shared/voteNotifyCooldown';

async function getFeedPostAuthorId(postId: string): Promise<string | null> {
  const { data } = await supabase.from('feed_posts').select('userId').eq('id', postId).maybeSingle();
  return data?.userId ? String(data.userId) : null;
}

export async function pushAfterFeedPost(post: {
  id: string;
  userId: string;
  userDisplayName: string;
  text: string;
  neighborhood: string;
}) {
  const preview = post.text.trim().slice(0, 80) || 'New community post';
  await notifyFeedPost({
    postId: post.id,
    authorUserId: post.userId,
    authorName: post.userDisplayName || 'A neighbor',
    preview,
    neighborhood: post.neighborhood || 'Sacramento area',
  });
}

export async function pushAfterFeedComment(comment: {
  id?: string;
  postId: string;
  parentCommentId?: string | null;
  userId: string;
  userName: string;
  text: string;
}) {
  const authorId = await getFeedPostAuthorId(comment.postId);
  const preview = comment.text.trim();
  if (!preview) return;

  const recipients: Array<{ userId: string; title: string; tagSuffix: string; eventType: 'feed_comment' | 'feed_reply' }> = [];

  if (comment.parentCommentId) {
    const { data: parent } = await supabase
      .from('feed_post_comments')
      .select('userId')
      .eq('id', comment.parentCommentId)
      .maybeSingle();
    const parentAuthorId = parent?.userId ? String(parent.userId) : '';
    if (parentAuthorId && parentAuthorId !== comment.userId) {
      recipients.push({
        userId: parentAuthorId,
        title: 'New reply to your comment',
        tagSuffix: 'reply',
        eventType: 'feed_reply',
      });
    }
  }

  if (authorId && authorId !== comment.userId && !recipients.some((r) => r.userId === authorId)) {
    recipients.push({
      userId: authorId,
      title: 'New comment on your feed post',
      tagSuffix: 'owner',
      eventType: 'feed_comment',
    });
  }

  for (const recipient of recipients) {
    await notifyFeedComment({
      postId: comment.postId,
      authorUserId: recipient.userId,
      commenterName: comment.userName || 'A neighbor',
      preview,
      commentId: comment.id ? `${comment.id}-${recipient.tagSuffix}` : undefined,
      title: recipient.title,
      parentCommentId: comment.parentCommentId ?? undefined,
      eventType: recipient.eventType,
    });
  }
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
