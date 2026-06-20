import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { HelpAnnouncementInput, HelpAnnouncementRecord, UserProfile } from '../types';
import { useHelpAnnouncements } from '../hooks/useHelpAnnouncements';
import { useCommunityContentVotes } from '../hooks/useCommunityContentVotes';
import { useHelpAnnouncementComments } from '../hooks/useHelpAnnouncementComments';
import ContentVoteButtons, { OWN_CONTENT_VOTE_DISABLED_REASON } from './ContentVoteButtons';
import AnnouncementComments from './AnnouncementComments';
import PublicCard from './public/PublicCard';
import AppUpdateEditModal from './AppUpdateEditModal';
import { useConfirm } from '../contexts/ConfirmContext';

interface AnnouncementsListProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
  onViewProfile?: (userId: string) => void;
  showVotes?: boolean;
  showComments?: boolean;
}

function formatAnnouncementDate(iso: string): string {
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

export default function AnnouncementsList({
  userProfile,
  onRequireSignIn,
  onViewProfile,
  showVotes = true,
  showComments = true,
}: AnnouncementsListProps) {
  const {
    announcements,
    loading,
    createAnnouncement,
    saveAnnouncement,
    removeAnnouncement,
    canPost,
    canEdit,
  } = useHelpAnnouncements(userProfile);
  const announcementIds = useMemo(() => announcements.map((row) => row.id), [announcements]);
  const voteTargetIds = useMemo(
    () => (showVotes ? announcementIds : []),
    [showVotes, announcementIds],
  );
  const commentTargetIds = useMemo(
    () => (showComments ? announcementIds : []),
    [showComments, announcementIds],
  );
  const { getVoteState, handleVote } = useCommunityContentVotes('announcement', voteTargetIds, userProfile);
  const { getCommentsForAnnouncement, handleAddComment, handleDeleteComment } = useHelpAnnouncementComments(
    commentTargetIds,
    userProfile ?? null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<HelpAnnouncementRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const { confirm } = useConfirm();
  const signedIn = Boolean(userProfile);

  const emptyDraft = (): HelpAnnouncementInput => ({
    date: todayIsoDate(),
    title: '',
    body: '',
    detail: null,
  });

  if (loading) {
    return <p className="text-sm text-muted">Loading announcements…</p>;
  }

  return (
    <div className="space-y-4">
      {canPost && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="sbn-btn sbn-btn-primary sbn-btn-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Post announcement
        </button>
      )}

      {announcements.length === 0 ? (
        <p className="text-sm text-muted italic">
          {canPost ? 'No announcements yet — post the first one above.' : 'No announcements posted yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((announcement) => {
            const expanded = expandedId === announcement.id;
            const summary = announcement.body;
            const fullStory = announcement.detail?.trim() || '';
            const hasFullStory = Boolean(fullStory);
            const comments = getCommentsForAnnouncement(announcement.id);
            const editable = canEdit(announcement);
            const isOwnAnnouncement = signedIn && announcement.postedByUserId === userProfile?.uid;
            const canExpand = hasFullStory || showComments;

            return (
              <li key={announcement.id}>
                <PublicCard>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canExpand) return;
                        setExpandedId(expanded ? null : announcement.id);
                      }}
                      className={`flex-1 text-left min-w-0 ${canExpand ? '' : 'cursor-default'}`}
                      aria-expanded={canExpand ? expanded : undefined}
                      disabled={!canExpand}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <time
                            dateTime={announcement.date}
                            className="text-xs font-bold text-accent uppercase tracking-wider"
                          >
                            {formatAnnouncementDate(announcement.date)}
                          </time>
                          <h2 className="mt-1 text-base font-black text-app">{announcement.title}</h2>
                          <p className="mt-1 text-[11px] text-muted">
                            Posted by {announcement.authorName} · {announcement.authorTitle}
                          </p>
                          <p className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-wrap font-semibold">
                            {summary}
                          </p>
                          {expanded && hasFullStory ? (
                            <p className="mt-3 text-sm text-muted leading-relaxed whitespace-pre-wrap font-normal border-t border-app pt-3">
                              {fullStory}
                            </p>
                          ) : null}
                        </div>
                        {canExpand ? (
                          <span className="shrink-0 p-1 text-muted" aria-hidden>
                            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </span>
                        ) : null}
                      </div>
                      {canExpand ? (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-accent">
                          <span>
                            {expanded
                              ? 'Tap to collapse'
                              : hasFullStory
                                ? 'Tap for full story'
                                : 'Tap for comments'}
                          </span>
                          {showComments && comments.length > 0 && !expanded ? (
                            <span className="inline-flex items-center gap-1 text-muted">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </button>

                    {editable && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAnnouncement(announcement)}
                          className="p-2 rounded-full text-muted hover:text-app hover:bg-inset"
                          title="Edit announcement"
                          aria-label="Edit announcement"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await confirm({
                              message: 'Delete this announcement?',
                              confirmLabel: 'Delete',
                              variant: 'danger',
                            });
                            if (!confirmed) return;
                            await removeAnnouncement(announcement.id);
                          }}
                          className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-inset"
                          title="Delete announcement"
                          aria-label="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {showVotes && (
                    <ContentVoteButtons
                      voteState={getVoteState(announcement.id)}
                      onVote={(dir) =>
                        handleVote(announcement.id, dir, { blockSelfId: announcement.postedByUserId })
                      }
                      onRequireSignIn={onRequireSignIn}
                      signedIn={signedIn}
                      disabled={isOwnAnnouncement}
                      disabledReason={OWN_CONTENT_VOTE_DISABLED_REASON}
                      feedbackNote="Votes help staff see what resonates with neighbors."
                      compact
                    />
                  )}

                  {showComments && expanded && (
                    <AnnouncementComments
                      announcementId={announcement.id}
                      postedByUserId={announcement.postedByUserId}
                      comments={comments}
                      currentUserId={userProfile?.uid}
                      userProfile={userProfile}
                      onAddComment={(text) => handleAddComment(announcement.id, text)}
                      onDeleteComment={(commentId) => void handleDeleteComment(announcement.id, commentId)}
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
          editTitle="Post announcement"
          values={emptyDraft()}
          onClose={() => setCreating(false)}
          onSave={createAnnouncement}
        />
      )}

      {editingAnnouncement && (
        <AppUpdateEditModal
          editTitle="Edit announcement"
          values={{
            date: editingAnnouncement.date,
            title: editingAnnouncement.title,
            body: editingAnnouncement.body,
            detail: editingAnnouncement.detail,
          }}
          onClose={() => setEditingAnnouncement(null)}
          onSave={async (next) => {
            const result = await saveAnnouncement(editingAnnouncement.id, next);
            if (result.ok) setEditingAnnouncement(null);
            return result;
          }}
        />
      )}
    </div>
  );
}
