import type { FeedPollOption, FeedPollState, FeedPost } from '../../types';

interface FeedPollBlockProps {
  post: FeedPost;
  pollState: FeedPollState;
  canVote: boolean;
  isOwnPost?: boolean;
  onVote: (optionId: string) => void;
  compact?: boolean;
}

export default function FeedPollBlock({
  post,
  pollState,
  canVote,
  isOwnPost = false,
  onVote,
  compact = false,
}: FeedPollBlockProps) {
  const options = post.pollOptions ?? [];
  if (post.postKind !== 'poll' || options.length === 0) return null;

  return (
    <div
      className={`space-y-2 ${compact ? 'mt-2' : 'mt-3'} pointer-events-auto`}
      onClick={(event) => event.stopPropagation()}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Poll</p>
      <div className="space-y-2">
        {options.map((option: FeedPollOption) => {
          const count = pollState.counts[option.id] ?? 0;
          const pct = pollState.total > 0 ? Math.round((count / pollState.total) * 100) : 0;
          const selected = pollState.userOptionId === option.id;
          const showResults = pollState.total > 0 && (!canVote || pollState.userOptionId != null);
          const optionLabel = compact ? option.shortLabel?.trim() || option.label : option.label;

          return (
            <button
              key={option.id}
              type="button"
              disabled={!canVote}
              onClick={() => onVote(option.id)}
              aria-label={option.label}
              className={`relative w-full overflow-hidden rounded-xl border text-left transition-colors ${
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-app bg-inset hover:border-accent/40'
              } ${!canVote ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {showResults ? (
                <div
                  className="absolute inset-y-0 left-0 bg-accent/10"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              ) : null}
              <div className={`relative flex items-center justify-between gap-2 ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
                <span className={`text-sm leading-snug ${selected ? 'font-bold text-app' : 'text-app'}`}>
                  {optionLabel}
                </span>
                {showResults ? (
                  <span className="text-[11px] font-bold tabular-nums text-muted shrink-0">
                    {pct}% ({count})
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted leading-relaxed">
        {pollState.total > 0
          ? `${pollState.total} vote${pollState.total === 1 ? '' : 's'} so far.`
          : isOwnPost
            ? 'Neighbors vote below — I will be in the comments.'
            : 'Tap one below. Say more in the comments if you want — I read them.'}
      </p>
    </div>
  );
}
