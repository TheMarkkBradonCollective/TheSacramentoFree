import { Heart, Pencil, Shield } from 'lucide-react';
import { ContentVoteState } from '../types';
import ContentVoteButtons from './ContentVoteButtons';

export type LeaderMessageVariant = 'director' | 'staff';

const VARIANT_STYLES: Record<
  LeaderMessageVariant,
  { border: string; badge: string; avatar: string; icon: string }
> = {
  director: {
    border: 'border-l-accent/70',
    badge: 'text-accent/90',
    avatar: 'bg-accent/10 border-accent/25 text-accent',
    icon: 'text-accent/60',
  },
  staff: {
    border: 'border-l-sky-500/70',
    badge: 'text-sky-500/90',
    avatar: 'bg-sky-500/10 border-sky-500/25 text-sky-500',
    icon: 'text-sky-500/60',
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface LeaderMessageCardProps {
  variant: LeaderMessageVariant;
  headingId: string;
  headline: string;
  name: string;
  title: string;
  goal: string;
  promises: string[];
  closing: string;
  compact?: boolean;
  loading?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  voteState?: ContentVoteState;
  onVote?: (direction: 'up' | 'down') => void;
  onRequireSignIn?: () => void;
  signedIn?: boolean;
  votesDisabled?: boolean;
  votesDisabledReason?: string;
}

export default function LeaderMessageCard({
  variant,
  headingId,
  headline,
  name,
  title,
  goal,
  promises,
  closing,
  compact = false,
  loading = false,
  canEdit = false,
  onEdit,
  voteState,
  onVote,
  onRequireSignIn,
  signedIn = false,
  votesDisabled = false,
  votesDisabledReason,
}: LeaderMessageCardProps) {
  const styles = VARIANT_STYLES[variant];

  if (loading) {
    return (
      <section className={`sbn-card ${compact ? 'p-4' : 'p-5'} text-sm text-muted`}>
        Loading message…
      </section>
    );
  }

  return (
    <section
      className={`sbn-card border-l-4 ${styles.border} overflow-hidden h-full ${
        compact ? 'p-4' : 'p-5 md:p-6'
      }`}
      aria-labelledby={headingId}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center font-display font-bold text-sm ${styles.avatar}`}
          aria-hidden
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${styles.badge}`}>{headline}</p>
          <h2 id={headingId} className="font-display font-bold text-app text-lg leading-snug mt-0.5">
            {name}
          </h2>
          <p className="text-xs text-muted font-medium">{title}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="p-2 rounded-full text-muted hover:text-app hover:bg-inset"
              title="Edit message"
              aria-label="Edit message"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <Shield className={`w-5 h-5 mt-1 ${styles.icon}`} aria-hidden />
        </div>
      </div>

      <p className={`mt-4 text-sm text-app leading-relaxed ${compact ? 'line-clamp-4' : ''}`}>{goal}</p>

      <ul className="mt-4 space-y-2">
        {(compact ? promises.slice(0, 2) : promises).map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-muted leading-relaxed">
            <Heart className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden />
            <span className={compact ? 'line-clamp-2' : ''}>{line}</span>
          </li>
        ))}
      </ul>

      {!compact && <p className="mt-4 text-sm font-semibold text-accent">{closing}</p>}

      {voteState && onVote && (
        <ContentVoteButtons
          voteState={voteState}
          onVote={onVote}
          onRequireSignIn={onRequireSignIn}
          signedIn={signedIn}
          disabled={votesDisabled}
          disabledReason={votesDisabledReason}
          compact
        />
      )}
    </section>
  );
}
