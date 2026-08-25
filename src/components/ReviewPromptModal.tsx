import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import StarRating from './StarRating';
import type { ReviewPromptKind } from '../lib/reviewPromptState';

interface ReviewPromptModalProps {
  kind: ReviewPromptKind;
  initialRating?: number;
  initialText?: string;
  submitting?: boolean;
  error?: string;
  onSubmit: (rating: number, text: string) => void | Promise<void>;
  onDismiss: () => void;
}

export default function ReviewPromptModal({
  kind,
  initialRating = 5,
  initialText = '',
  submitting = false,
  error = '',
  onSubmit,
  onDismiss,
}: ReviewPromptModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setRating(initialRating);
    setText(initialText);
  }, [initialRating, initialText, kind]);

  const title =
    kind === 'first'
      ? 'How is Sacramento Buy Nothing treating you?'
      : 'Want to refresh your review?';

  const body =
    kind === 'first'
      ? 'If you have a moment, a quick star rating helps neighbors discover the app. Totally optional — no pressure.'
      : 'You shared a review a while back. If anything changed, you can update your stars or note. Skip anytime.';

  return (
    <div
      className="fixed inset-0 z-[125] bg-black/60 flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div
        className="sbn-card w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review_prompt_title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-app">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h4 id="review_prompt_title" className="font-display font-bold text-app leading-snug">
                {title}
              </h4>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{body}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors shrink-0"
            aria-label="Close review prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(rating, text);
          }}
        >
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div>
            <p className="text-xs text-muted mb-2">Your rating</p>
            <StarRating value={rating} interactive onChange={setRating} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted">A short note (optional)</span>
            <textarea
              className="sbn-input w-full min-h-[5rem] text-sm"
              placeholder="What do you like? What could be better?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onDismiss}
              disabled={submitting}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            >
              Maybe later
            </button>
            <button type="submit" disabled={submitting} className="sbn-btn sbn-btn-primary sbn-btn-sm">
              {submitting ? 'Saving…' : kind === 'first' ? 'Share review' : 'Update review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
