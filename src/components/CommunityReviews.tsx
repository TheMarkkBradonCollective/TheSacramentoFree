import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowRight, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { AppReview, ContentVoteState, UserProfile } from '../types';
import { useAppReviews } from '../hooks/useAppReviews';
import { useCommunityContentVotes, EMPTY_VOTE } from '../hooks/useCommunityContentVotes';
import StarRating from './StarRating';
import ContentVoteButtons, { OWN_CONTENT_VOTE_DISABLED_REASON } from './ContentVoteButtons';
import HorizontalSnapRow, { SnapSlide } from './HorizontalSnapRow';
import { useConfirm } from '../contexts/ConfirmContext';
import { useUserDisplayInfo } from '../hooks/useUserDisplayInfo';
import { PresenceUserAvatar } from './UserAvatar';
import { confirmRemoveReview } from '../lib/destructiveConfirm';

interface CommunityReviewsProps {
  userProfile?: UserProfile | null;
  blockedUserIds?: Set<string>;
  compact?: boolean;
  preview?: boolean;
  showVotes?: boolean;
  onRequireSignIn?: () => void;
  onSeeAll?: () => void;
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ReviewCard({
  review,
  livePhoto,
  voteState,
  onVote,
  onRequireSignIn,
  signedIn,
  isOwnReview,
  showVotes = true,
}: {
  review: AppReview;
  livePhoto?: string;
  voteState: ContentVoteState;
  onVote: (direction: 'up' | 'down') => void;
  onRequireSignIn?: () => void;
  signedIn: boolean;
  isOwnReview: boolean;
  showVotes?: boolean;
}) {
  return (
    <div className="bg-inset rounded-xl p-3 border border-app">
      <div className="flex items-start gap-3">
        <PresenceUserAvatar
          uid={review.userId}
          src={livePhoto ?? review.userPhoto}
          name={review.userName}
          size="sm"
          showStatus={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app truncate">{review.userName}</p>
              <p className="text-[10px] text-muted truncate">{review.userNeighborhood}</p>
            </div>
            <div className="text-right shrink-0">
              <StarRating value={review.rating} size="sm" />
              <p className="text-[10px] text-subtle mt-0.5">{formatReviewDate(review.updatedAt)}</p>
            </div>
          </div>
          {review.text ? (
            <p className="text-sm text-muted mt-2 leading-relaxed">{review.text}</p>
          ) : (
            <p className="text-sm text-subtle mt-2 italic">Rated without a written review.</p>
          )}
          {showVotes && (
            <ContentVoteButtons
              voteState={voteState}
              onVote={onVote}
              onRequireSignIn={onRequireSignIn}
              signedIn={signedIn}
              disabled={isOwnReview}
              disabledReason={OWN_CONTENT_VOTE_DISABLED_REASON}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

function YourReviewSection({
  userProfile,
  myReview,
  rating,
  text,
  submitting,
  error,
  onRatingChange,
  onTextChange,
  onSubmit,
  onRemove,
  onCancelEdit,
  onRequireSignIn,
}: {
  userProfile?: UserProfile | null;
  myReview?: AppReview;
  rating: number;
  text: string;
  submitting: boolean;
  error: string;
  onRatingChange: (value: number) => void;
  onTextChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRemove: () => void;
  onCancelEdit?: () => void;
  onRequireSignIn?: () => void;
}) {
  const [editing, setEditing] = useState(!myReview);

  useEffect(() => {
    setEditing(!myReview);
  }, [myReview?.id]);

  if (!userProfile) {
    return (
      <div className="sbn-help-card space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-app">Your review</h3>
          <p className="text-xs text-muted mt-1">Share a star rating and optional note about the app.</p>
        </div>
        <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary sbn-btn-sm">
          Sign in to leave a review
        </button>
      </div>
    );
  }

  if (myReview && !editing) {
    return (
      <div className="sbn-help-card space-y-3 border-accent/25 bg-accent-soft/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-app">Your review</h3>
            <p className="text-xs text-muted mt-1">Neighbors see this in the list below.</p>
          </div>
          <StarRating value={myReview.rating} size="sm" />
        </div>
        {myReview.text ? (
          <p className="text-sm text-app leading-relaxed">{myReview.text}</p>
        ) : (
          <p className="text-sm text-muted italic">You left a star rating without a written note.</p>
        )}
        <p className="text-[10px] text-subtle">Updated {formatReviewDate(myReview.updatedAt)}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm inline-flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit review
          </button>
          <button
            type="button"
            onClick={() => void onRemove()}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm text-red-400 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sbn-help-card space-y-3 border-accent/25">
      <div>
        <h3 className="text-sm font-semibold text-app">
          {myReview ? 'Edit your review' : 'Your review'}
        </h3>
        <p className="text-xs text-muted mt-1">
          {myReview
            ? 'Update your rating or note anytime.'
            : 'Post once — you can edit or remove it later.'}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <p className="text-xs text-muted mb-1.5">Your rating</p>
          <StarRating value={rating} interactive onChange={onRatingChange} />
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted">Your note (optional)</span>
          <textarea
            className="sbn-input w-full min-h-[5rem] text-sm"
            placeholder="What do you like about Sacramento Buy Nothing? What could be better?"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            maxLength={500}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={submitting} className="sbn-btn sbn-btn-primary sbn-btn-sm">
            {submitting ? 'Saving…' : myReview ? 'Save changes' : 'Post review'}
          </button>
          {myReview ? (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                onCancelEdit?.();
              }}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
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
  const { otherReviews, loading, averageRating, myReview, submitReview, removeMyReview, reviews } =
    useAppReviews(userProfile, blockedUserIds);
  const reviewIds = useMemo(() => otherReviews.map((r) => r.id), [otherReviews]);
  const reviewerInfo = useUserDisplayInfo(otherReviews.map((review) => review.userId));
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
  const { confirm } = useConfirm();

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

  const handleRemove = async () => {
    const confirmed = await confirmRemoveReview(confirm);
    if (!confirmed) return;
    await removeMyReview();
    setText('');
    setRating(5);
  };

  const previewReviews = otherReviews.slice(0, 12);
  const signedIn = Boolean(userProfile);
  const reviewCount = reviews.length;

  const renderReviewCard = (review: AppReview, votesEnabled: boolean) => (
    <ReviewCard
      review={review}
      livePhoto={reviewerInfo[review.userId]?.photoURL}
      voteState={votesEnabled ? getVoteState(review.id) : EMPTY_VOTE}
      onVote={(dir) => handleVote(review.id, dir, { blockSelfId: review.userId })}
      onRequireSignIn={onRequireSignIn}
      signedIn={signedIn}
      isOwnReview={false}
      showVotes={votesEnabled}
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
          {!loading && reviewCount > 0 && (
            <div className="text-right">
              <StarRating value={averageRating} size="sm" label={`Average ${averageRating} stars`} />
              <p className="text-[11px] text-muted mt-1">
                {averageRating.toFixed(1)} avg · {reviewCount} review{reviewCount === 1 ? '' : 's'}
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

      {preview ? (
        loading ? (
          <p className="mt-4 text-sm text-muted">Loading reviews…</p>
        ) : otherReviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted italic">
            {myReview
              ? 'You posted the first review — more neighbors may add theirs soon.'
              : 'No neighbor reviews yet — be the first to share your experience.'}
          </p>
        ) : (
          <div className="mt-4">
            <HorizontalSnapRow label="Neighbor reviews">
              {previewReviews.map((review) => (
                <Fragment key={review.id}>
                  <SnapSlide className="w-[min(100%,18rem)]">
                    {renderReviewCard(review, false)}
                  </SnapSlide>
                </Fragment>
              ))}
            </HorizontalSnapRow>
          </div>
        )
      ) : (
        <div className="mt-4 space-y-5">
          <YourReviewSection
            userProfile={userProfile}
            myReview={myReview}
            rating={rating}
            text={text}
            submitting={submitting}
            error={error}
            onRatingChange={setRating}
            onTextChange={setText}
            onSubmit={(e) => void handleSubmit(e)}
            onRemove={() => void handleRemove()}
            onCancelEdit={() => {
              if (myReview) {
                setRating(myReview.rating);
                setText(myReview.text || '');
              }
            }}
            onRequireSignIn={onRequireSignIn}
          />

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-app">From neighbors</h3>
              {!loading && (
                <span className="text-[11px] text-muted">
                  {otherReviews.length} review{otherReviews.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-muted">Loading reviews…</p>
            ) : otherReviews.length === 0 ? (
              <div className="sbn-help-empty">
                <MessageSquare className="w-8 h-8 text-muted mx-auto mb-2 opacity-60" />
                <p className="text-sm text-muted">
                  {myReview
                    ? 'No other reviews yet. Yours is the only one so far.'
                    : 'No neighbor reviews yet. Post yours above to get started.'}
                </p>
              </div>
            ) : (
              <ul className={`space-y-3 ${compact ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
                {otherReviews.map((review) => (
                  <li key={review.id}>{renderReviewCard(review, withVotes)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
