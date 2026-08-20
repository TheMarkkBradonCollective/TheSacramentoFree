import { runPushSend } from './runPushSend';
import { getSupabaseAdmin } from './supabaseAdmin';
import { shouldThrottleFeedVoteNotify } from './voteNotifyCooldown';

type FeedPostRow = {
  id?: string;
  userId?: string;
  text?: string;
  userDisplayName?: string;
  neighborhood?: string;
};

function feedPostUrl(postId: string): string {
  return `/feed/post/${postId}`;
}

function postPreview(text: string, max = 60): string {
  const trimmed = text.trim();
  if (!trimmed) return 'your post';
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

async function getFeedPost(postId: string): Promise<FeedPostRow | null> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('feed_posts')
    .select('id, userId, text, userDisplayName, neighborhood')
    .eq('id', postId)
    .eq('status', 'active')
    .maybeSingle();
  return (data as FeedPostRow | null) ?? null;
}

async function sendFeedPush(
  callerId: string,
  payload: Parameters<typeof runPushSend>[1],
): Promise<{ status: number; body: Record<string, unknown> }> {
  return runPushSend(callerId, payload);
}

export async function runFeedPostNotify(
  callerId: string,
  post: {
    id?: string;
    userId?: string;
    userDisplayName?: string;
    text?: string;
    neighborhood?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const postId = String(post.id || '');
  const authorId = String(post.userId || callerId);
  if (!postId) {
    return { status: 200, body: { ok: true, skipped: 'missing post id' } };
  }

  const displayName = String(post.userDisplayName || 'A neighbor').trim() || 'A neighbor';
  const preview = postPreview(String(post.text || ''), 80);
  const neighborhood = String(post.neighborhood || 'Sacramento area').trim() || 'Sacramento area';

  return sendFeedPush(authorId, {
    eventType: 'feed_post',
    title: 'New community feed post',
    body: `${displayName} in ${neighborhood}: ${preview}`,
    url: feedPostUrl(postId),
    neighborhood,
    excludeUserIds: [authorId],
    tag: `feed-post-${postId}`,
    data: {
      feedPostId: postId,
      actorName: displayName,
      actorUserId: authorId,
    },
  });
}

export async function runFeedCommentNotify(
  callerId: string,
  comment: {
    id?: string;
    postId?: string;
    parentCommentId?: string | null;
    userId?: string;
    userName?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const commenterId = String(comment.userId || callerId);
  const postId = String(comment.postId || '');
  const commentId = String(comment.id || `fcomment_${Date.now()}`);
  if (!postId) {
    return { status: 200, body: { ok: true, skipped: 'missing post id' } };
  }

  const post = await getFeedPost(postId);
  if (!post) {
    return { status: 200, body: { ok: true, skipped: 'post not found' } };
  }

  const ownerId = String(post.userId || '');
  const commenterName = String(comment.userName || 'A neighbor');
  const preview = String(comment.text || '').trim().slice(0, 120);
  if (!preview) {
    return { status: 200, body: { ok: true, skipped: 'empty comment' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const parentCommentId = comment.parentCommentId ? String(comment.parentCommentId) : '';
  let parentAuthorId = '';
  if (parentCommentId) {
    const { data: parent } = await supabaseAdmin
      .from('feed_post_comments')
      .select('userId')
      .eq('id', parentCommentId)
      .maybeSingle();
    parentAuthorId = String((parent as { userId?: string } | null)?.userId || '');
  }

  const alerts: Array<{
    recipientId: string;
    title: string;
    tag: string;
  }> = [];

  if (ownerId && ownerId !== commenterId) {
    alerts.push({
      recipientId: ownerId,
      title: 'New comment on your feed post',
      tag: `feed-comment-${commentId}-owner`,
    });
  }

  if (parentAuthorId && parentAuthorId !== commenterId && parentAuthorId !== ownerId) {
    alerts.push({
      recipientId: parentAuthorId,
      title: 'New reply to your comment',
      tag: `feed-comment-${commentId}-reply`,
    });
  }

  if (!alerts.length) {
    return { status: 200, body: { ok: true, skipped: 'no comment alert needed' } };
  }

  const results = await Promise.all(
    alerts.map((alert) =>
      sendFeedPush(commenterId, {
        eventType: 'feed_comment',
        title: alert.title,
        body: `${commenterName}: ${preview}`,
        url: feedPostUrl(postId),
        recipientUserIds: [alert.recipientId],
        tag: alert.tag,
        data: {
          feedPostId: postId,
          actorName: commenterName,
          actorUserId: commenterId,
        },
      }),
    ),
  );

  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  return {
    status: 200,
    body: {
      ok: true,
      sent,
      handlers: results.map((r) => r.body),
    },
  };
}

export async function runFeedReactionNotify(
  callerId: string,
  reaction: {
    postId?: string;
    userId?: string;
    emoji?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const reactorId = String(reaction.userId || callerId);
  const postId = String(reaction.postId || '');
  const emoji = String(reaction.emoji || '').trim();
  if (!postId || !emoji) {
    return { status: 200, body: { ok: true, skipped: 'missing reaction fields' } };
  }

  const post = await getFeedPost(postId);
  if (!post) {
    return { status: 200, body: { ok: true, skipped: 'post not found' } };
  }

  const ownerId = String(post.userId || '');
  if (!ownerId || ownerId === reactorId) {
    return { status: 200, body: { ok: true, skipped: 'no reaction alert needed' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: reactor } = await supabaseAdmin
    .from('users')
    .select('displayName')
    .eq('uid', reactorId)
    .maybeSingle();
  const reactorName = String((reactor as { displayName?: string } | null)?.displayName || 'A neighbor');
  const preview = postPreview(String(post.text || ''));

  return sendFeedPush(reactorId, {
    eventType: 'feed_reaction',
    title: 'New reaction on your feed post',
    body: `${reactorName} reacted ${emoji} to "${preview}"`,
    url: feedPostUrl(postId),
    recipientUserIds: [ownerId],
    tag: `feed-react-${postId}-${reactorId}-${emoji}`,
    data: {
      feedPostId: postId,
      actorName: reactorName,
      actorUserId: reactorId,
      emoji,
    },
  });
}

export async function runFeedVoteNotify(
  callerId: string,
  vote: {
    postId?: string;
    userId?: string;
    voteType?: 'up' | 'down';
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const voterUserId = String(vote.userId || callerId);
  const postId = String(vote.postId || '');
  const voteType = vote.voteType;
  if (!postId || (voteType !== 'up' && voteType !== 'down')) {
    return { status: 200, body: { ok: true, skipped: 'missing vote fields' } };
  }

  const post = await getFeedPost(postId);
  if (!post) {
    return { status: 200, body: { ok: true, skipped: 'post not found' } };
  }

  const ownerId = String(post.userId || '');
  if (!ownerId || ownerId === voterUserId) {
    return { status: 200, body: { ok: true, skipped: 'no vote alert needed' } };
  }

  if (await shouldThrottleFeedVoteNotify(voterUserId)) {
    return { status: 200, body: { ok: true, skipped: 'vote notify cooldown' } };
  }

  const preview = postPreview(String(post.text || ''));
  const isUp = voteType === 'up';

  return sendFeedPush(voterUserId, {
    eventType: isUp ? 'feed_upvote' : 'feed_downvote',
    title: isUp ? 'New upvote on your feed post' : 'Feedback on your feed post',
    body: `Someone ${isUp ? 'upvoted' : 'downvoted'} "${preview}"`,
    url: feedPostUrl(postId),
    recipientUserIds: [ownerId],
    tag: `feed-vote-${voteType}-${postId}-${voterUserId}`,
    data: { feedPostId: postId },
  });
}
