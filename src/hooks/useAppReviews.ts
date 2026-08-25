import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppReview, UserProfile } from '../types';
import {
  deleteSupabaseAppReview,
  getSupabaseAppReviews,
  snapReviewRating,
  upsertSupabaseAppReview,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { isPlayStoreDemo } from '../preview/playStoreDemo';

export function useAppReviews(userProfile?: UserProfile | null, blockedUserIds: Set<string> = new Set()) {
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [loading, setLoading] = useState(() => !isPlayStoreDemo());

  const reload = useCallback(async () => {
    if (isPlayStoreDemo()) {
      setReviews([]);
      setLoading(false);
      return;
    }
    const data = await getSupabaseAppReviews(100);
    setReviews(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    return subscribePostgresChanges<AppReview>(
      { channelName: 'live-app-reviews', table: 'app_reviews', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  const visibleReviews = useMemo(
    () => reviews.filter((review) => !blockedUserIds.has(review.userId)),
    [reviews, blockedUserIds],
  );

  const myReview = useMemo(
    () => (userProfile ? visibleReviews.find((r) => r.userId === userProfile.uid) : undefined),
    [visibleReviews, userProfile],
  );

  const otherReviews = useMemo(
    () =>
      userProfile
        ? visibleReviews.filter((review) => review.userId !== userProfile.uid)
        : visibleReviews,
    [visibleReviews, userProfile],
  );

  const averageRating = useMemo(() => {
    if (visibleReviews.length === 0) return 0;
    const sum = visibleReviews.reduce((acc, r) => acc + r.rating, 0);
    return snapReviewRating(sum / visibleReviews.length);
  }, [visibleReviews]);

  const submitReview = async (
    rating: number,
    text: string,
  ): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!userProfile) {
      return { ok: false, errorMessage: 'Sign in to leave a review.' };
    }

    const review: AppReview = {
      id: myReview?.id || `review_${userProfile.uid}`,
      userId: userProfile.uid,
      userName: userProfile.displayName,
      userPhoto: userProfile.photoURL,
      userNeighborhood: userProfile.neighborhood,
      rating: snapReviewRating(rating),
      text: text.trim() || null,
      createdAt: myReview?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await upsertSupabaseAppReview(review, userProfile);
    if (result.ok) {
      void reload();
    }
    return result;
  };

  const removeMyReview = async (): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!userProfile) {
      return { ok: false, errorMessage: 'Sign in to remove your review.' };
    }
    const result = await deleteSupabaseAppReview(userProfile.uid);
    if (result.ok) {
      void reload();
    }
    return result;
  };

  return {
    reviews: visibleReviews,
    otherReviews,
    loading,
    averageRating,
    myReview,
    submitReview,
    removeMyReview,
    reload,
  };
}
