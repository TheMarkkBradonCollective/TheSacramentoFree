import { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { submitUserReport } from '../supabase';
import FullScreenPanel from './FullScreenPanel';
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { useImageAttachment } from '../hooks/useImageAttachment';
import { Flag, ChevronRight, Megaphone, ScrollText, Star } from 'lucide-react';
import UpdatesList from './UpdatesList';
import AnnouncementsList from './AnnouncementsList';
import CommunityReviews from './CommunityReviews';
import { canManageAppUpdates, canPostAnnouncements, canViewDirectorOverview } from '../lib/roles';
import DirectorSiteOverview from './DirectorSiteOverview';

interface AccountHelpSectionProps {
  user: UserProfile;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
  initialHelpPanel?: 'updates' | 'announcements' | null;
  onClearInitialHelpPanel?: () => void;
}

type Panel = 'report' | 'updates' | 'announcements' | 'reviews' | null;

export default function AccountHelpSection({
  user,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
  initialHelpPanel = null,
  onClearInitialHelpPanel,
}: AccountHelpSectionProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [reportSubject, setReportSubject] = useState('');
  const [reportBody, setReportBody] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const reportProof = useImageAttachment();
  const [err, setErr] = useState('');

  const handleSubmitReport = async () => {
    setReportSending(true);
    setErr('');
    const result = await submitUserReport({
      reporter: user,
      subject: reportSubject,
      body: reportBody,
      proofFile: reportProof.file,
    });
    setReportSending(false);
    if (result.ok) {
      setReportSent(true);
      setReportSubject('');
      setReportBody('');
      reportProof.clear();
    } else {
      setErr(result.errorMessage || 'Could not send report.');
    }
  };

  const closePanel = () => {
    setPanel(null);
    setErr('');
    setReportSent(false);
    reportProof.clear();
  };

  const canManageUpdates = canManageAppUpdates(user.role);
  const canPostAnnouncementsPanel = canPostAnnouncements(user.role);
  const showDirectorOverview = canViewDirectorOverview(user.role);

  useEffect(() => {
    if (!initialHelpPanel) return;
    setPanel(initialHelpPanel);
    onClearInitialHelpPanel?.();
  }, [initialHelpPanel, onClearInitialHelpPanel]);

  return (
    <div className="space-y-3 min-w-0 w-full overflow-x-hidden" id="account_help_section">
      {showDirectorOverview && (
        <DirectorSiteOverview
          scrollIntoView={scrollToDirectorOverview}
          onScrolled={onClearScrollToDirectorOverview}
        />
      )}
      <h3 className="font-display font-bold text-sm text-app">News & safety</h3>
      <div className="grid gap-2 sm:grid-cols-2 min-w-0">
        <button type="button" onClick={() => setPanel('updates')} className="sbn-help-list-item">
          <span className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
            <ScrollText className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">App updates</span>
            <span className="text-[11px] text-muted">
              {canManageUpdates
                ? 'Director changelog — post what is new in the app'
                : "See what's new and vote on changes"}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button type="button" onClick={() => setPanel('announcements')} className="sbn-help-list-item">
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
            <Megaphone className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Announcements</span>
            <span className="text-[11px] text-muted">
              {canPostAnnouncementsPanel
                ? 'Staff news — neighbors can vote and comment'
                : 'Community news from staff — vote and join the discussion'}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button type="button" onClick={() => setPanel('reviews')} className="sbn-help-list-item">
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Star className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Community reviews</span>
            <span className="text-[11px] text-muted">Read all reviews — post or edit yours</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => setPanel('report')}
          className="sbn-help-list-item"
        >
          <span className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <Flag className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Send a report</span>
            <span className="text-[11px] text-muted">One-way — staff review only</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
      </div>
      <p className="text-[10px] text-muted leading-snug">
        Reports are one-way — staff review them but you will not get a reply. For personal help, open Chat → Support.
      </p>

      {panel === 'updates' && (
        <FullScreenPanel
          wide
          title="App updates"
          subtitle={
            canManageUpdates
              ? 'Post changelog entries for neighbors — votes come back to you as feedback'
              : 'Tap an update to read more — your votes go to the director'
          }
          onClose={closePanel}
        >
          <UpdatesList userProfile={user} />
        </FullScreenPanel>
      )}

      {panel === 'announcements' && (
        <FullScreenPanel
          wide
          title="Announcements"
          subtitle={
            canPostAnnouncementsPanel
              ? 'Share news with the community — neighbors can vote and comment'
              : 'Tap an announcement to read more, vote, and join the discussion'
          }
          onClose={closePanel}
        >
          <AnnouncementsList userProfile={user} />
        </FullScreenPanel>
      )}

      {panel === 'reviews' && (
        <FullScreenPanel
          wide
          title="Community reviews"
          subtitle="Read neighbor feedback and share your own"
          onClose={closePanel}
        >
          <CommunityReviews userProfile={user} />
        </FullScreenPanel>
      )}

      {panel === 'report' && (
        <FullScreenPanel title="Send a report" subtitle="No follow-up — staff will review" onClose={closePanel}>
          {reportSent ? (
            <div className="sbn-help-empty space-y-2">
              <p className="font-display font-bold text-app">Report received</p>
              <p className="text-sm text-muted">
                Thank you. Moderators will review this. You do not need to do anything else.
              </p>
              <button type="button" onClick={closePanel} className="sbn-btn sbn-btn-primary mt-2">
                Done
              </button>
            </div>
          ) : (
            <div className="sbn-help-card space-y-4">
              {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Subject</span>
                <input
                  className="sbn-input text-sm"
                  value={reportSubject}
                  onChange={(e) => setReportSubject(e.target.value)}
                  placeholder="Brief summary"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">What happened?</span>
                <textarea
                  className="sbn-input text-sm min-h-[8rem]"
                  value={reportBody}
                  onChange={(e) => setReportBody(e.target.value)}
                  placeholder="Describe the issue. Include neighbor names or post details if relevant."
                />
              </label>
              <ImageAttachmentPicker
                label="Screenshot proof (optional)"
                hint="Attach a screenshot if it helps staff understand the issue."
                file={reportProof.file}
                previewUrl={reportProof.previewUrl}
                onChange={reportProof.setFile}
                disabled={reportSending}
              />
              <button
                type="button"
                disabled={reportSending || !reportSubject.trim() || !reportBody.trim()}
                onClick={() => void handleSubmitReport()}
                className="sbn-btn sbn-btn-primary w-full"
              >
                {reportSending ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          )}
        </FullScreenPanel>
      )}
    </div>
  );
}
