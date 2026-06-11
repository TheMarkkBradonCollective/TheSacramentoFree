import { ChevronDown, ChevronUp } from 'lucide-react';
import { ContentVoteState } from '../types';

export const OWN_CONTENT_VOTE_DISABLED_REASON = "You can't vote on your own content";

interface ContentVoteButtonsProps {
  voteState: ContentVoteState;
  disabled?: boolean;
  disabledReason?: string;
  onVote: (direction: 'up' | 'down') => void;
  onRequireSignIn?: () => void;
  signedIn?: boolean;
  /** Shown under buttons for update votes */
  feedbackNote?: string;
  compact?: boolean;
}

export default function ContentVoteButtons({
  voteState,
  disabled = false,
  disabledReason,
  onVote,
  onRequireSignIn,
  signedIn = true,
  feedbackNote,
  compact = false,
}: ContentVoteButtonsProps) {
  const { userVote, upvotes, downvotes } = voteState;
  const netScore = upvotes - downvotes;

  const vote = (direction: 'up' | 'down') => {
    if (!signedIn) {
      onRequireSignIn?.();
      return;
    }
    if (disabled) return;
    onVote(direction);
  };

  const voteBtnClass = (active: boolean) =>
    `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
      disabled
        ? 'opacity-50 cursor-not-allowed border-app text-muted'
        : active
          ? 'bg-accent-soft border-accent text-accent'
          : 'border-app text-muted hover:border-accent'
    }`;

  return (
    <div className={compact ? 'mt-3' : 'mt-4 pt-3 border-t border-app'}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          disabled={disabled}
          onClick={() => vote('up')}
          className={voteBtnClass(userVote === 'up')}
          title={disabled ? disabledReason : 'Upvote'}
        >
          <ChevronUp className="w-4 h-4" />
          {upvotes}
        </button>
        <span className="text-xs font-bold text-app min-w-[1.5rem] text-center">
          {netScore > 0 ? `+${netScore}` : netScore}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => vote('down')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-app text-muted'
              : userVote === 'down'
                ? 'bg-inset border-app text-app'
                : 'border-app text-muted hover:border-app'
          }`}
          title={disabled ? disabledReason : 'Downvote'}
        >
          <ChevronDown className="w-4 h-4" />
          {downvotes}
        </button>
      </div>
      {feedbackNote && <p className="text-[10px] text-subtle mt-1.5">{feedbackNote}</p>}
    </div>
  );
}
