import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { APP_UPDATES, appUpdateId } from '../siteContent';
import { UserProfile } from '../types';
import { useCommunityContentVotes } from '../hooks/useCommunityContentVotes';
import ContentVoteButtons from './ContentVoteButtons';
import PublicCard from './public/PublicCard';

interface UpdatesListProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
}

function formatUpdateDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UpdatesList({ userProfile, onRequireSignIn }: UpdatesListProps) {
  const updateIds = useMemo(() => APP_UPDATES.map((update) => appUpdateId(update)), []);
  const { getVoteState, handleVote } = useCommunityContentVotes('update', updateIds, userProfile);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const signedIn = Boolean(userProfile);

  return (
    <ul className="space-y-3">
      {APP_UPDATES.map((update) => {
        const id = appUpdateId(update);
        const expanded = expandedId === id;
        const fullText = update.detail ?? update.body;

        return (
          <li key={id}>
            <PublicCard>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : id)}
                className="w-full text-left"
                aria-expanded={expanded}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <time dateTime={update.date} className="text-xs font-bold text-accent uppercase tracking-wider">
                      {formatUpdateDate(update.date)}
                    </time>
                    <h2 className="mt-1 text-base font-black text-app">{update.title}</h2>
                    <p className={`mt-2 text-sm text-muted font-semibold leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                      {expanded ? fullText : update.body}
                    </p>
                  </div>
                  <span className="shrink-0 p-1 text-muted" aria-hidden>
                    {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-accent">
                  {expanded ? 'Tap to collapse' : 'Tap to read more'}
                </p>
              </button>

              <ContentVoteButtons
                voteState={getVoteState(id)}
                onVote={(dir) => handleVote(id, dir)}
                onRequireSignIn={onRequireSignIn}
                signedIn={signedIn}
                feedbackNote="Votes are shared with your director."
                compact
              />
            </PublicCard>
          </li>
        );
      })}
    </ul>
  );
}
