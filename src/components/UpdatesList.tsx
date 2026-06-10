import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { AppUpdateInput, AppUpdateRecord, UserProfile } from '../types';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { useCommunityContentVotes } from '../hooks/useCommunityContentVotes';
import ContentVoteButtons from './ContentVoteButtons';
import PublicCard from './public/PublicCard';
import AppUpdateEditModal from './AppUpdateEditModal';

interface UpdatesListProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
  showVotes?: boolean;
}

function formatUpdateDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function UpdatesList({
  userProfile,
  onRequireSignIn,
  showVotes = true,
}: UpdatesListProps) {
  const { updates, loading, createUpdate, saveUpdate, removeUpdate, canManage } = useAppUpdates(userProfile);
  const updateIds = useMemo(
    () => (showVotes ? updates.map((update) => update.id) : []),
    [showVotes, updates],
  );
  const { getVoteState, handleVote } = useCommunityContentVotes('update', updateIds, userProfile);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<AppUpdateRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const signedIn = Boolean(userProfile);

  const emptyDraft = (): AppUpdateInput => ({
    date: todayIsoDate(),
    title: '',
    body: '',
    detail: null,
  });

  if (loading) {
    return <p className="text-sm text-muted">Loading updates…</p>;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Post update
        </button>
      )}

      {updates.length === 0 ? (
        <p className="text-sm text-muted italic">
          {canManage ? 'No updates yet — post your first one above.' : 'No updates posted yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {updates.map((update) => {
            const expanded = expandedId === update.id;
            const fullText = update.detail?.trim() || update.body;

            return (
              <li key={update.id}>
                <PublicCard>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : update.id)}
                      className="flex-1 text-left min-w-0"
                      aria-expanded={expanded}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <time dateTime={update.date} className="text-xs font-bold text-accent uppercase tracking-wider">
                            {formatUpdateDate(update.date)}
                          </time>
                          <h2 className="mt-1 text-base font-black text-app">{update.title}</h2>
                          <p className="mt-1 text-[11px] text-muted">
                            Posted by {update.directorName} · {update.directorTitle}
                          </p>
                          <p
                            className={`mt-2 text-sm text-muted leading-relaxed ${
                              expanded ? 'whitespace-pre-wrap font-normal' : 'font-semibold line-clamp-2'
                            }`}
                          >
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

                    {canManage && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingUpdate(update)}
                          className="p-2 rounded-full text-muted hover:text-app hover:bg-inset"
                          title="Edit update"
                          aria-label="Edit update"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Delete this update?')) return;
                            await removeUpdate(update.id);
                          }}
                          className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-inset"
                          title="Delete update"
                          aria-label="Delete update"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {showVotes && (
                    <ContentVoteButtons
                      voteState={getVoteState(update.id)}
                      onVote={(dir) => handleVote(update.id, dir)}
                      onRequireSignIn={onRequireSignIn}
                      signedIn={signedIn}
                      feedbackNote="Votes are shared with your director."
                      compact
                    />
                  )}
                </PublicCard>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <AppUpdateEditModal
          editTitle="Post update"
          values={emptyDraft()}
          onClose={() => setCreating(false)}
          onSave={createUpdate}
        />
      )}

      {editingUpdate && (
        <AppUpdateEditModal
          editTitle="Edit update"
          values={{
            date: editingUpdate.date,
            title: editingUpdate.title,
            body: editingUpdate.body,
            detail: editingUpdate.detail,
          }}
          onClose={() => setEditingUpdate(null)}
          onSave={async (next) => {
            const result = await saveUpdate(editingUpdate.id, next);
            if (result.ok) setEditingUpdate(null);
            return result;
          }}
        />
      )}
    </div>
  );
}
