import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { HelpAnnouncementInput, HelpAnnouncementRecord, UserProfile } from '../types';
import { useHelpAnnouncements } from '../hooks/useHelpAnnouncements';
import { useCommunityContentVotes } from '../hooks/useCommunityContentVotes';
import { useHelpAnnouncementComments } from '../hooks/useHelpAnnouncementComments';
import ContentVoteButtons, { OWN_CONTENT_VOTE_DISABLED_REASON } from './ContentVoteButtons';
import AnnouncementComments from './AnnouncementComments';
import PublicCard from './public/PublicCard';
import AppUpdateEditModal from './AppUpdateEditModal';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmDeleteAnnouncement } from '../lib/destructiveConfirm';
import { REBRAND_ANNOUNCEMENT_ID, REBRAND_ANNOUNCEMENT_LETTER } from '../../shared/rebrandAnnouncement2026';
import LinkifiedText from './LinkifiedText';

interface AnnouncementsListProps {
  userProfile?: UserProfile | null;
  onRequireSignIn?: () => void;
  onViewProfile?: (userId: string) => void;
  showVotes?: boolean;
  showComments?: boolean;
  focusId?: string | null;
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
  focusId = null,
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

  useEffect(() => {
    if (!focusId) return;
    setExpandedId(focusId);
    const timer = window.setTimeout(() => {
      document.getElementById(`announcement-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusId, announcements.length]);

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
            const isLetter = announcement.id === REBRAND_ANNOUNCEMENT_ID;
            const fullStory = announcement.detail?.trim() || '';
            const letterText = isLetter ? REBRAND_ANNOUNCEMENT_LETTER : fullStory;
            const hasFullStory = isLetter || Boolean(fullStory);
            const comments = getCommentsForAnnouncement(announcement.id);
            const editable = canEdit(announcement);
            const isOwnAnnouncement = signedIn && announcement.postedByUserId === userProfile?.uid;

            return (
              <li
                key={announcement.id}
                id={`announcement-${announcement.id}`}
                className={focusId === announcement.id ? 'scroll-mt-4 ring-2 ring-accent/60 rounded-2xl' : 'scroll-mt-4'}
              >
                <PublicCard>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 text-left min-w-0">
                      <time
                        dateTime={announcement.date}
                        className="text-xs font-bold text-accent uppercase tracking-wider"
                      >
                        {formatAnnouncementDate(announcement.date)}
                      </time>
                      <h2 className="mt-1 text-base font-black text-app">{announcement.title}</h2>
                      {!isLetter ? (
                        <p className="mt-1 text-[11px] text-muted">
                          Posted by {announcement.authorName} · {announcement.authorTitle}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted italic">A personal letter — not a release note</p>
                      )}
                      {!isLetter ? (
                        <p className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-wrap font-semibold">
                          <LinkifiedText text={summary} />
                        </p>
                      ) : null}
                      {hasFullStory ? (
                        <>
                          {isLetter || expanded ? (
                            <div
                              className={`mt-3 text-sm text-app leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                                isLetter ? 'font-serif border-t-2 border-app pt-4' : 'text-muted font-normal border-t border-app pt-3'
                              }`}
                            >
                              {isLetter ? (
                                letterText
                              ) : (
                                <LinkifiedText text={letterText} />
                              )}
                            </div>
                          ) : null}
                          {!isLetter ? (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : announcement.id)}
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
                          ) : null}
                        </>
                      ) : null}
                    </div>

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
                            const confirmed = await confirmDeleteAnnouncement(confirm);
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

                  {showComments && (
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
