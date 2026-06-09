import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MessageSquare, Trash2 } from 'lucide-react';
import { AppReview, ContentVoteState, UserProfile } from '../types';
import { useAppReviews } from '../hooks/useAppReviews';
import { useCommunityContentVotes, EMPTY_VOTE } from '../hooks/useCommunityContentVotes';
import StarRating from './StarRating';
import ContentVoteButtons from './ContentVoteButtons';
import HorizontalSnapRow, { SnapSlide } from './HorizontalSnapRow';

interface CommunityReviewsProps {
  userProfile?: UserProfile | null;
  blockedUserIds?: Set<string>;
  compact?: boolean;
  preview?: boolean;
  showVotes?: boolean;
  onRequireSignIn?: () => void;
  onSeeAll?: () => void;
}

function ReviewCard({
  review,
  voteState,
  onVote,
  onRequireSignIn,
  signedIn,
  isOwnReview,
  showVotes = true,
}: {
  review: AppReview;
  voteState: ContentVoteState;
  onVote: (direction: 'up' | 'down') => void;
  onRequireSignIn?: () => void;
  signedIn: boolean;
  isOwnReview: boolean;
  showVotes?: boolean;
}) {
  return (
    <div className="bg-inset rounded-xl p-3 border border-app h-full">
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
            <p className="text-sm text-muted mt-2 leading-relaxed flex items-start gap-1.5 line-clamp-4">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" aria-hidden />
              <span>{review.text}</span>
            </p>
          )}
          {showVotes && (
            <ContentVoteButtons
              voteState={voteState}
              onVote={onVote}
              onRequireSignIn={onRequireSignIn}
              signedIn={signedIn}
              disabled={isOwnReview}
              disabledReason="You can't vote on your own review"
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunityReviews({
  userProfile,
  blockedUserIds = new Set(),
  compact = false,
  preview = false,
  showVotes = true,
  onRequireSignIn,
  onSeeAll,
}: CommunityReviewsProps) {
  const { reviews, loading, averageRating, myReview, submitReview, removeMyReview } = useAppReviews(
    userProfile,
    blockedUserIds,
  );
  const reviewIds = useMemo(() => reviews.map((r) => r.id), [reviews]);
  const withVotes = showVotes && !preview;
  const { getVoteState, handleVote } = useCommunityContentVotes(
    'review',
    withVotes ? reviewIds : [],
    userProfile,
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

  const previewReviews = reviews.slice(0, 12);
  const signedIn = Boolean(userProfile);

  const renderReviewCard = (review: AppReview, withVotes: boolean) => (
    <ReviewCard
      review={review}
      voteState={withVotes ? getVoteState(review.id) : EMPTY_VOTE}
      onVote={(dir) => handleVote(review.id, dir, { blockSelfId: review.userId })}
      onRequireSignIn={onRequireSignIn}
      signedIn={signedIn}
      isOwnReview={userProfile?.uid === review.userId}
      showVotes={withVotes}
    />
  );

  return (
    <section
      className={`${preview ? '' : 'sbn-card border-l-4 border-l-accent/70 overflow-hidden'} ${
        preview ? '' : compact ? 'p-4' : 'p-5 md:p-6'
      }`}
      aria-labelledby="community_reviews_heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent/90">Neighbor voices</p>
          <h2 id="community_reviews_heading" className="font-display font-bold text-app text-lg mt-0.5">
            Community reviews
          </h2>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {!loading && reviews.length > 0 && (
            <div className="text-right">
              <StarRating value={averageRating} size="sm" label={`Average ${averageRating} stars`} />
              <p className="text-[11px] text-muted mt-1">
                {averageRating.toFixed(1)} avg · {reviews.length} review{reviews.length === 1 ? '' : 's'}
              </p>
            </div>
          )}
          {preview && onSeeAll && (
            <button type="button" onClick={onSeeAll} className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0">
              See all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted italic">No reviews yet — be the first to share your experience.</p>
      ) : preview ? (
        <div className="mt-4">
          <HorizontalSnapRow label="Community reviews">
            {previewReviews.map((review) => (
              <SnapSlide key={review.id} className="w-[min(100%,18rem)]">
                {renderReviewCard(review, false)}
              </SnapSlide>
            ))}
          </HorizontalSnapRow>
        </div>
      ) : (
        <ul className={`mt-4 space-y-3 ${compact ? 'max-h-56 overflow-y-auto' : ''}`}>
          {reviews.map((review) => (
            <li key={review.id}>{renderReviewCard(review, withVotes)}</li>
          ))}
        </ul>
      )}

      {!preview && (
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
      )}
    </section>
  );
}
