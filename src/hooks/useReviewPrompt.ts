import { useEffect, useRef, useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { useAppReviews } from './useAppReviews';
import {
  dismissReviewPrompt,
  getReviewPromptKind,
  markReviewPromptCompleted,
  recordSignedInSession,
  type ReviewPromptKind,
} from '../lib/reviewPromptState';

interface UseReviewPromptOptions {
  userProfile: UserProfile | null;
  enabled: boolean;
}

export function useReviewPrompt({ userProfile, enabled }: UseReviewPromptOptions) {
  const { myReview, submitReview, loading } = useAppReviews(userProfile);
  const [promptKind, setPromptKind] = useState<ReviewPromptKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const shownThisSessionRef = useRef(false);

  useEffect(() => {
    if (!userProfile?.uid) {
      shownThisSessionRef.current = false;
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!enabled || !userProfile?.uid || loading || shownThisSessionRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      const kind = (() => {
        if (!userProfile?.uid) return null;
        recordSignedInSession(userProfile.uid);
        return getReviewPromptKind(userProfile.uid, Boolean(myReview));
      })();

      if (kind) {
        shownThisSessionRef.current = true;
        setPromptKind(kind);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [enabled, loading, myReview?.id, userProfile?.uid]);

  const dismissPrompt = useCallback(() => {
    if (!userProfile?.uid || !promptKind) return;
    dismissReviewPrompt(userProfile.uid, promptKind);
    setPromptKind(null);
    setError('');
  }, [promptKind, userProfile?.uid]);

  const submitPromptReview = useCallback(
    async (rating: number, text: string) => {
      if (!userProfile?.uid || !promptKind) return;

      setSubmitting(true);
      setError('');
      const result = await submitReview(rating, text);
      setSubmitting(false);

      if (!result.ok) {
        setError(result.errorMessage || 'Could not save your review.');
        return;
      }

      markReviewPromptCompleted(userProfile.uid, promptKind);
      setPromptKind(null);
    },
    [promptKind, submitReview, userProfile?.uid],
  );

  return {
    promptKind,
    myReview,
    submitting,
    error,
    dismissPrompt,
    submitPromptReview,
  };
}
