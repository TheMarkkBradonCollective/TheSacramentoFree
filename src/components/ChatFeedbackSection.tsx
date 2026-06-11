import { useEffect, useState } from 'react';
import { ChevronRight, ClipboardList, Flag, Star } from 'lucide-react';
import type { UserProfile } from '../types';
import { canViewStaffReports } from '../lib/roles';
import CommunityReviews from './CommunityReviews';
import SendUserReportPanel from './SendUserReportPanel';
import StaffUserReportsPanel from './StaffUserReportsPanel';
import FullScreenPanel from './FullScreenPanel';

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
        <div className="px-3 pb-2 space-y-1.5">
          <button type="button" onClick={() => setPanel('reviews')} className="sbn-help-list-item w-full">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Star className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="font-semibold text-sm text-app block">Community reviews</span>
              <span className="text-[11px] text-muted">Read all reviews — post or edit yours</span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
          <button type="button" onClick={() => setPanel('report')} className="sbn-help-list-item w-full">
            <span className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <Flag className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="font-semibold text-sm text-app block">Send a report</span>
              <span className="text-[11px] text-muted">One-way — staff review only</span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
          {canStaffReports ? (
            <button type="button" onClick={() => setPanel('staffReports')} className="sbn-help-list-item w-full">
              <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                <ClipboardList className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="font-semibold text-sm text-app block">User reports</span>
                <span className="text-[11px] text-muted">Neighbor safety submissions</span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            </button>
          ) : null}
        </div>
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
