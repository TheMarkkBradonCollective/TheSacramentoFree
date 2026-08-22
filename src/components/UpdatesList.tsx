import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AppUpdateInput, AppUpdateRecord, UserProfile } from '../types';
import { neighborUpdateDetail } from '../../shared/changelogFilters';
import LinkifiedText from './LinkifiedText';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { useCommunityContentVotes } from '../hooks/useCommunityContentVotes';
import { useAppUpdateComments } from '../hooks/useAppUpdateComments';
import ContentVoteButtons, { OWN_CONTENT_VOTE_DISABLED_REASON } from './ContentVoteButtons';
import AppUpdateComments from './AppUpdateComments';
import PublicCard from './public/PublicCard';
import AppUpdateEditModal from './AppUpdateEditModal';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmDeleteAppUpdate } from '../lib/destructiveConfirm';

interface UpdatesListProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
  onViewProfile?: (userId: string) => void;
  showVotes?: boolean;
  showComments?: boolean;
  focusId?: string | null;
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
  onViewProfile,
  showVotes = true,
  showComments = true,
  focusId = null,
}: UpdatesListProps) {
  const { updates, loading, createUpdate, saveUpdate, removeUpdate, canManage } = useAppUpdates(userProfile);
  const updateIds = useMemo(() => updates.map((update) => update.id), [updates]);
  const voteTargetIds = useMemo(
    () => (showVotes ? updateIds : []),
    [showVotes, updateIds],
  );
  const commentTargetIds = useMemo(
    () => (showComments ? updateIds : []),
    [showComments, updateIds],
  );
  const { getVoteState, handleVote } = useCommunityContentVotes('update', voteTargetIds, userProfile);
  const { getCommentsForUpdate, handleAddComment, handleDeleteComment } = useAppUpdateComments(
    commentTargetIds,
    userProfile ?? null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<AppUpdateRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { confirm } = useConfirm();
  const signedIn = Boolean(userProfile);

  const filteredUpdates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return updates;

    return updates.filter((update) => {
      const haystack = [
        update.title,
        update.body,
        update.detail || '',
        update.directorName,
        update.directorTitle,
        update.date,
        formatUpdateDate(update.date),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [updates, searchQuery]);

  useEffect(() => {
    if (!focusId) return;
    setSearchQuery('');
    setExpandedId(focusId);
    const timer = window.setTimeout(() => {
      document.getElementById(`update-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusId, updates.length]);

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {canManage ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Post update
          </button>
        ) : null}
        {updates.length > 0 ? (
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search updates…"
              aria-label="Search updates"
              className="sbn-input pl-9 text-sm w-full"
            />
          </div>
        ) : null}
      </div>

      {updates.length === 0 ? (
        <p className="text-sm text-muted italic">
          {canManage ? 'No updates yet — post your first one above.' : 'No updates posted yet.'}
        </p>
      ) : filteredUpdates.length === 0 ? (
        <p className="text-sm text-muted italic">No updates match &ldquo;{searchQuery.trim()}&rdquo;.</p>
      ) : (
        <ul className="space-y-3">
          {filteredUpdates.map((update) => {
            const expanded = expandedId === update.id;
            const summary = update.body;
            const fullStory = neighborUpdateDetail(update.detail);
            const hasFullStory = Boolean(fullStory) && fullStory !== summary.trim();
            const comments = getCommentsForUpdate(update.id);
            const isOwnUpdate = signedIn && update.postedByUserId === userProfile?.uid;

            return (
              <li
                key={update.id}
                id={`update-${update.id}`}
                className={focusId === update.id ? 'scroll-mt-4 ring-2 ring-accent/60 rounded-2xl' : 'scroll-mt-4'}
              >
                <PublicCard>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 text-left min-w-0">
                      <time dateTime={update.date} className="text-xs font-bold text-accent uppercase tracking-wider">
                        {formatUpdateDate(update.date)}
                      </time>
                      <h2 className="mt-1 text-base font-black text-app">{update.title}</h2>
                      <p className="mt-1 text-[11px] text-muted">
                        Posted by {update.directorName} · {update.directorTitle}
                      </p>
                      <p className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-wrap font-semibold">
                        <LinkifiedText text={summary} />
                      </p>
                      {hasFullStory ? (
                        <>
                          {expanded ? (
                            <p className="mt-3 text-sm text-muted leading-relaxed whitespace-pre-wrap font-normal border-t border-app pt-3 break-words [overflow-wrap:anywhere]">
                              <LinkifiedText text={fullStory} />
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : update.id)}
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent"
                            aria-expanded={expanded}
                          >
                            {expanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" aria-hidden />
                                Tap to collapse full story
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" aria-hidden />
                                Tap for full story
                              </>
                            )}
                          </button>
                        </>
                      ) : null}
                    </div>

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
                            const confirmed = await confirmDeleteAppUpdate(confirm);
                            if (!confirmed) return;
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
                      onVote={(dir) => handleVote(update.id, dir, { blockSelfId: update.postedByUserId })}
                      onRequireSignIn={onRequireSignIn}
                      signedIn={signedIn}
                      disabled={isOwnUpdate}
                      disabledReason={OWN_CONTENT_VOTE_DISABLED_REASON}
                      feedbackNote="Votes are shared with your director."
                      compact
                    />
                  )}

                  {showComments && (
                    <AppUpdateComments
                      updateId={update.id}
                      postedByUserId={update.postedByUserId}
                      comments={comments}
                      currentUserId={userProfile?.uid}
                      userProfile={userProfile}
                      onAddComment={(text) => handleAddComment(update.id, text)}
                      onDeleteComment={(commentId) => void handleDeleteComment(update.id, commentId)}
                      onRequireSignIn={onRequireSignIn}
                      onViewProfile={onViewProfile}
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
