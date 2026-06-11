import { useEffect, useState } from 'react';
import { ClipboardList, Flag, Star } from 'lucide-react';
import type { UserProfile } from '../types';
import { canViewStaffReports } from '../lib/roles';
import { useStaffUserReports } from '../hooks/useStaffUserReports';
import CommunityReviews from './CommunityReviews';
import SendUserReportPanel from './SendUserReportPanel';
import StaffUserReportsPanel from './StaffUserReportsPanel';
import FullScreenPanel from './FullScreenPanel';
import ChatSidebarRow from './ChatSidebarRow';

export type ChatFeedbackPanel = 'reviews' | 'report' | 'staffReports' | null;

interface ChatFeedbackSectionProps {
  userProfile: UserProfile;
  initialPanel?: ChatFeedbackPanel;
  onClearInitialPanel?: () => void;
}

export default function ChatFeedbackSection({
  userProfile,
  initialPanel = null,
  onClearInitialPanel,
}: ChatFeedbackSectionProps) {
  const [panel, setPanel] = useState<ChatFeedbackPanel>(null);
  const canStaffReports = canViewStaffReports(userProfile.role);
  const { reports } = useStaffUserReports(canStaffReports);

  const newReportCount = reports.filter((report) => report.status === 'new').length;

  useEffect(() => {
    if (!initialPanel) return;
    setPanel(initialPanel);
    onClearInitialPanel?.();
  }, [initialPanel, onClearInitialPanel]);

  const closePanel = () => setPanel(null);

  return (
    <>
      <div className="border-b border-app">
        <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
          Reviews & reports
        </div>
        <ChatSidebarRow
          id="chat_row_reviews"
          icon={Star}
          iconClassName="bg-amber-500/10 text-amber-500"
          title="Community reviews"
          subtitle="Read neighbor feedback — post or edit yours"
          preview="Share your experience and see what neighbors think about the app."
          selected={panel === 'reviews'}
          onClick={() => setPanel('reviews')}
        />
        <ChatSidebarRow
          id="chat_row_send_report"
          icon={Flag}
          iconClassName="bg-red-500/10 text-red-400"
          title="Send a report"
          subtitle="One-way — staff review only"
          preview="Report a safety issue. Staff will review; you will not get a reply here."
          selected={panel === 'report'}
          onClick={() => setPanel('report')}
        />
        {canStaffReports ? (
          <ChatSidebarRow
            id="chat_row_user_reports"
            icon={ClipboardList}
            iconClassName="bg-violet-500/10 text-violet-400"
            title="User reports"
            subtitle="Neighbor safety submissions"
            preview={
              newReportCount > 0
                ? `${newReportCount} new report${newReportCount === 1 ? '' : 's'} waiting for review`
                : 'Review one-way reports from neighbors.'
            }
            selected={panel === 'staffReports'}
            onClick={() => setPanel('staffReports')}
            trailing={
              newReportCount > 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 shrink-0">
                  {newReportCount} new
                </span>
              ) : undefined
            }
          />
        ) : null}
      </div>

      {panel === 'reviews' ? (
        <FullScreenPanel
          wide
          title="Community reviews"
          subtitle="Read neighbor feedback and share your own"
          onClose={closePanel}
        >
          <CommunityReviews userProfile={userProfile} />
        </FullScreenPanel>
      ) : null}

      {panel === 'report' ? (
        <SendUserReportPanel user={userProfile} onClose={closePanel} />
      ) : null}

      {panel === 'staffReports' ? <StaffUserReportsPanel onClose={closePanel} /> : null}
    </>
  );
}
