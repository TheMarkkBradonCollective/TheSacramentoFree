import { supabase, handleSupabaseError, setSupabaseConfigurationState } from '../supabase';
import type { FeedPost, FeedPostComment, FeedPostCommentNode, FeedPostReaction, UserProfile } from '../types';
import { compressImageIfNeeded, guessImageContentType } from './imageUrl';
import { commentPostedAsNeighbor } from './staffInteractionMode';
import { FEED_REACTION_EMOJI, type FeedReactionEmoji } from './feedReactions';

function sanitizeStorageKey(value: string, maxLen = 120): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen) || 'upload';
}

async function requireAuthUserId(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user?.id ?? null;
}

function normalizeFeedPost(row: Record<string, unknown>): FeedPost {
  const rawImages = row.imageUrls ?? row.image_urls;
  let imageUrls: string[] = [];
  if (Array.isArray(rawImages)) {
    imageUrls = rawImages.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  }

  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id),
    userDisplayName: String(row.userDisplayName ?? row.user_display_name ?? 'Neighbor'),
    userPhotoURL:
      typeof (row.userPhotoURL ?? row.user_photo_url) === 'string'
        ? String(row.userPhotoURL ?? row.user_photo_url)
        : undefined,
    neighborhood: String(row.neighborhood ?? 'Sacramento'),
    text: String(row.text ?? ''),
    imageUrls,
    status: (row.status === 'hidden' || row.status === 'removed' ? row.status : 'active') as FeedPost['status'],
    postedAsNeighbor: row.postedAsNeighbor === true || row.posted_as_neighbor === true,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeFeedComment(row: Record<string, unknown>): FeedPostComment {
  return {
    id: String(row.id),
    postId: String(row.postId ?? row.post_id),
    parentCommentId:
      row.parentCommentId != null || row.parent_comment_id != null
        ? String(row.parentCommentId ?? row.parent_comment_id)
        : null,
    userId: String(row.userId ?? row.user_id),
    userName: String(row.userName ?? row.user_name ?? 'Neighbor'),
    userPhoto: typeof (row.userPhoto ?? row.user_photo) === 'string' ? String(row.userPhoto ?? row.user_photo) : undefined,
    userNeighborhood: String(row.userNeighborhood ?? row.user_neighborhood ?? 'Sacramento'),
    text: String(row.text ?? ''),
    postedAsNeighbor: row.postedAsNeighbor === true || row.posted_as_neighbor === true,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
  };
}

export function buildFeedCommentTree(flat: FeedPostComment[]): FeedPostCommentNode[] {
  const byId = new Map<string, FeedPostCommentNode>();
  const roots: FeedPostCommentNode[] = [];

  for (const comment of flat) {
    byId.set(comment.id, { ...comment, replies: [], depth: 0 });
  }

  for (const node of byId.values()) {
    const parentId = node.parentCommentId;
    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId)!;
      node.depth = parent.depth + 1;
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: FeedPostCommentNode[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const node of nodes) sortRecursive(node.replies);
  };
  sortRecursive(roots);
  return roots;
}

export async function getFeedPosts(limit = 50): Promise<FeedPost[]> {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('status', 'active')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      handleSupabaseError(error, 'feed_posts');
      return [];
    }
    setSupabaseConfigurationState(true);
    return (data ?? []).map((row) => normalizeFeedPost(row as Record<string, unknown>));
  } catch (err) {
    handleSupabaseError(err, 'feed_posts');
    return [];
  }
}

export async function getFeedPostById(postId: string): Promise<FeedPost | null> {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('id', postId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, 'feed_posts');
      return null;
    }
    if (!data) return null;
    setSupabaseConfigurationState(true);
    return normalizeFeedPost(data as Record<string, unknown>);
  } catch (err) {
    handleSupabaseError(err, 'feed_posts');
    return null;
  }
}

export async function createFeedPost(
  profile: UserProfile,
  input: { text: string; imageFiles: File[] },
): Promise<{ ok: boolean; post?: FeedPost; errorMessage?: string }> {
  const text = input.text.trim();
  if (!text && input.imageFiles.length === 0) {
    return { ok: false, errorMessage: 'Add words, a photo, or both.' };
  }

  const postId = `feed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const imageUrls: string[] = [];

  for (let i = 0; i < input.imageFiles.length; i++) {
    const url = await uploadFeedPostImage(input.imageFiles[i], postId, i);
    if (url) imageUrls.push(url);
  }

  const now = new Date().toISOString();
  const payload = {
    id: postId,
    userId: profile.uid,
    userDisplayName: profile.displayName.trim(),
    userPhotoURL: profile.photoURL ?? null,
    neighborhood: profile.neighborhood,
    text,
    imageUrls,
    status: 'active',
    postedAsNeighbor: commentPostedAsNeighbor(profile),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { data, error } = await supabase.from('feed_posts').insert(payload).select('*').single();
    if (error) {
      handleSupabaseError(error, 'feed_posts');
      return { ok: false, errorMessage: error.message };
    }
    setSupabaseConfigurationState(true);
    const post = normalizeFeedPost(data as Record<string, unknown>);
    try {
      const push = await import('./pushFeedIntegration');
      await push.pushAfterFeedPost({
        id: post.id,
        userId: post.userId,
        userDisplayName: post.userDisplayName,
        text: post.text,
        neighborhood: post.neighborhood,
      });
    } catch (err) {
      console.warn('[push] feed post notify failed:', err);
    }
    return { ok: true, post };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not create post.' };
  }
}

export async function deleteFeedPost(
  postId: string,
  userId: string,
  isStaff: boolean,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    let query = supabase.from('feed_posts').delete({ count: 'exact' }).eq('id', postId);
    if (!isStaff) query = query.eq('userId', userId);
    const { error, count } = await query;
    if (error) return { ok: false, errorMessage: error.message };
    if ((count ?? 0) === 0) return { ok: false, errorMessage: 'Post not found or already removed.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete post.' };
  }
}

export async function uploadFeedPostImage(file: File, postId: string, index: number): Promise<string | null> {
  try {
    const uid = await requireAuthUserId();
    const compressed = await compressImageIfNeeded(file);
    const ext = compressed.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${sanitizeStorageKey(uid)}/feed/${sanitizeStorageKey(postId)}_${index}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('items').upload(path, compressed, {
      contentType: guessImageContentType(compressed),
      upsert: true,
    });
    if (error) {
      console.warn('Feed image upload failed:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('items').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('Feed image upload error:', err);
    return null;
  }
}

export async function getFeedPostComments(postIds: string[]): Promise<FeedPostComment[]> {
  if (postIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('feed_post_comments')
      .select('*')
      .in('postId', postIds)
      .order('createdAt', { ascending: true });

    if (error) {
      handleSupabaseError(error, 'feed_post_comments');
      return [];
    }
    return (data ?? []).map((row) => normalizeFeedComment(row as Record<string, unknown>));
  } catch (err) {
    handleSupabaseError(err, 'feed_post_comments');
    return [];
  }
}

export async function createFeedPostComment(
  profile: UserProfile,
  postId: string,
  text: string,
  parentCommentId?: string | null,
): Promise<{ ok: boolean; comment?: FeedPostComment; errorMessage?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, errorMessage: 'Comment cannot be empty.' };

  const comment: FeedPostComment = {
    id: `fcomment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    postId,
    parentCommentId: parentCommentId ?? null,
    userId: profile.uid,
    userName: profile.displayName.trim(),
    userPhoto: profile.photoURL,
    userNeighborhood: profile.neighborhood,
    text: trimmed,
    postedAsNeighbor: commentPostedAsNeighbor(profile),
    createdAt: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('feed_post_comments').insert({
      ...comment,
      createdAt: comment.createdAt,
    });
    if (error) return { ok: false, errorMessage: error.message };
    try {
      const push = await import('./pushFeedIntegration');
      await push.pushAfterFeedComment({
        id: comment.id,
        postId: comment.postId,
        parentCommentId: comment.parentCommentId,
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text,
      });
    } catch (err) {
      console.warn('[push] feed comment notify failed:', err);
    }
    return { ok: true, comment };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not post comment.' };
  }
}

export async function deleteFeedPostComment(
  commentId: string,
  userId: string,
  isStaff: boolean,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    let query = supabase.from('feed_post_comments').delete({ count: 'exact' }).eq('id', commentId);
    if (!isStaff) query = query.eq('userId', userId);
    const { error, count } = await query;
    if (error) return { ok: false, errorMessage: error.message };
    if ((count ?? 0) === 0) return { ok: false, errorMessage: 'Comment not found or already removed.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete comment.' };
  }
}

export async function getFeedPostReactions(postIds: string[]): Promise<FeedPostReaction[]> {
  if (postIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('feed_post_reactions')
      .select('*')
      .in('postId', postIds);

    if (error) {
      handleSupabaseError(error, 'feed_post_reactions');
      return [];
    }
    return (data ?? []).map((row) => ({
      postId: String((row as Record<string, unknown>).postId ?? (row as Record<string, unknown>).post_id),
      userId: String((row as Record<string, unknown>).userId ?? (row as Record<string, unknown>).user_id),
      emoji: String((row as Record<string, unknown>).emoji),
      createdAt: String((row as Record<string, unknown>).createdAt ?? (row as Record<string, unknown>).created_at),
    }));
  } catch {
    return [];
  }
}

export async function toggleFeedPostReaction(
  postId: string,
  userId: string,
  emoji: FeedReactionEmoji,
): Promise<boolean> {
  if (!FEED_REACTION_EMOJI.includes(emoji)) return false;

  try {
    const { data: existingRows } = await supabase
      .from('feed_post_reactions')
      .select('emoji')
      .eq('postId', postId)
      .eq('userId', userId);

    const existing = existingRows ?? [];
    const hasSame = existing.some((row) => String(row.emoji) === emoji);

    if (hasSame) {
      const { error } = await supabase
        .from('feed_post_reactions')
        .delete()
        .eq('postId', postId)
        .eq('userId', userId)
        .eq('emoji', emoji);
      return !error;
    }

    if (existing.length > 0) {
      const { error: clearError } = await supabase
        .from('feed_post_reactions')
        .delete()
        .eq('postId', postId)
        .eq('userId', userId);
      if (clearError) return false;
    }

    const { error } = await supabase.from('feed_post_reactions').insert({
      postId,
      userId,
      emoji,
      createdAt: new Date().toISOString(),
    });
    if (!error) {
      void import('./pushFeedIntegration').then((m) =>
        m.pushAfterFeedReaction({ postId, reactorUserId: userId, emoji, added: true }),
      );
    }
    return !error;
  } catch {
    return false;
  }
}

export function aggregateFeedReactions(
  rows: FeedPostReaction[],
  postId: string,
  userId?: string,
): { counts: Record<string, number>; mine: Set<string> } {
  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const row of rows) {
    if (row.postId !== postId) continue;
    counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
    if (userId && row.userId === userId) mine.add(row.emoji);
  }
  return { counts, mine };
}

export async function submitFeedContentReport(params: {
  reporter: UserProfile;
  reportedUserId: string;
  reportedUserName: string;
  subject: string;
  body: string;
  feedPostId?: string;
  feedCommentId?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  try {
    const payload: Record<string, unknown> = {
      id: reportId,
      reporterUserId: params.reporter.uid,
      reporterName: params.reporter.displayName,
      subject: params.subject.trim(),
      body: params.body.trim(),
      reportedUserId: params.reportedUserId,
      reportedUserName: params.reportedUserName,
      source: 'manual',
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    if (params.feedPostId) payload.feedPostId = params.feedPostId;
    if (params.feedCommentId) payload.feedCommentId = params.feedCommentId;

    const { error } = await supabase.from('user_reports').insert(payload);
    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not send report.' };
  }
}
