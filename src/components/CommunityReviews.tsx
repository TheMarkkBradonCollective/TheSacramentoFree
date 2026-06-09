import { useEffect, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { UserProfile } from '../types';
import { useAppReviews } from '../hooks/useAppReviews';
import StarRating from './StarRating';

interface CommunityReviewsProps {
  userProfile?: UserProfile | null;
  blockedUserIds?: Set<string>;
  compact?: boolean;
  onRequireSignIn?: () => void;
}

export default function CommunityReviews({
  userProfile,
  blockedUserIds = new Set(),
  compact = false,
  onRequireSignIn,
}: CommunityReviewsProps) {
  const { reviews, loading, averageRating, myReview, submitReview, removeMyReview } = useAppReviews(
    userProfile,
    blockedUserIds,
  );
  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [text, setText] = useState(myReview?.text || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setText(myReview.text || '');
    }
  }, [myReview?.id, myReview?.rating, myReview?.text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      onRequireSignIn?.();
      return;
    }

    setSubmitting(true);
    setError('');
    const result = await submitReview(rating, text);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errorMessage || 'Could not post review.');
    }
  };

  return (
    <section
      className={`sbn-card border-l-4 border-l-accent/70 overflow-hidden ${compact ? 'p-4' : 'p-5 md:p-6'}`}
      aria-labelledby="community_reviews_heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent/90">Neighbor voices</p>
          <h2 id="community_reviews_heading" className="font-display font-bold text-app text-lg mt-0.5">
            Community reviews
          </h2>
        </div>
        {!loading && reviews.length > 0 && (
          <div className="text-right shrink-0">
            <StarRating value={averageRating} size="sm" label={`Average ${averageRating} stars`} />
            <p className="text-[11px] text-muted mt-1">
              {averageRating.toFixed(1)} avg · {reviews.length} review{reviews.length === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted italic">No reviews yet — be the first to share your experience.</p>
      ) : (
        <ul className={`mt-4 space-y-3 ${compact ? 'max-h-56' : 'max-h-72'} overflow-y-auto`}>
          {reviews.map((review) => (
            <li key={review.id} className="bg-inset rounded-xl p-3 border border-app">
              <div className="flex items-start gap-2">
                <img
                  src={
                    review.userPhoto ||
                    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(review.userName)}`
                  }
                  alt=""
                  className="w-7 h-7 rounded-full border border-app shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs font-bold text-app">{review.userName}</p>
                      <p className="text-[10px] text-accent">{review.userNeighborhood}</p>
                    </div>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  {review.text && (
                    <p className="text-sm text-muted mt-2 leading-relaxed flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" aria-hidden />
                      <span>{review.text}</span>
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 pt-4 border-t border-app">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          {myReview ? 'Update your review' : 'Share your review'}
        </p>

        {userProfile ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div>
              <p className="text-xs text-muted mb-1.5">Your rating (tap for half stars)</p>
              <StarRating value={rating} interactive onChange={setRating} />
            </div>
            <textarea
              className="sbn-input w-full min-h-[72px] text-sm"
              placeholder="Optional — what do you think of the app?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="sbn-btn sbn-btn-primary sbn-btn-sm">
                {submitting ? 'Posting…' : myReview ? 'Update review' : 'Post review'}
              </button>
              {myReview && (
                <button
                  type="button"
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm text-red-400"
                  onClick={async () => {
                    if (!confirm('Remove your review?')) return;
                    await removeMyReview();
                    setText('');
                    setRating(5);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </form>
        ) : (
          <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            Sign in to leave a review
          </button>
        )}
      </div>
    </section>
  );
}
