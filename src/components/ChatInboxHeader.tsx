import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Edit, Flag, LifeBuoy, MoreHorizontal, Star } from 'lucide-react';
import type { UserProfile } from '../types';
import { canViewStaffReports } from '../lib/roles';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import type { ChatFeedbackPanel } from './ChatFeedbackSection';

interface ChatInboxHeaderProps {
  onStartConversation?: () => void;
  onNewSupport?: () => void;
  onOpenFeedbackPanel?: (panel: ChatFeedbackPanel) => void;
  staffReportCount?: number;
  userProfile: UserProfile;
}

export default function ChatInboxHeader({
  onStartConversation,
  onNewSupport,
  onOpenFeedbackPanel,
  staffReportCount = 0,
  userProfile,
}: ChatInboxHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canStaffReports = canViewStaffReports(userProfile.role) && isStaffActingOfficial(userProfile);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  return (
    <header
      id="chat_inbox_header"
      className="shrink-0 flex items-center justify-end gap-1 px-3 py-2 chat-thread-header"
    >
      <div className="flex items-center gap-1 shrink-0">
        {onStartConversation ? (
          <button
            type="button"
            onClick={onStartConversation}
            className="p-2.5 rounded-full text-muted hover:text-app hover:bg-inset"
            aria-label="Start conversation"
            title="Start conversation"
          >
            <Edit className="w-5 h-5" />
          </button>
        ) : null}
        {onNewSupport ? (
          <button
            type="button"
            onClick={onNewSupport}
            className="p-2.5 rounded-full text-muted hover:text-app hover:bg-inset"
            aria-label="Contact support"
            title="Contact support"
          >
            <LifeBuoy className="w-5 h-5" />
          </button>
        ) : null}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="p-2.5 rounded-full text-muted hover:text-app hover:bg-inset"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full mt-1 z-20 min-w-[12rem] rounded-xl border border-app bg-surface py-1 shadow-lg">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm text-app hover:bg-surface-hover flex items-center gap-2"
                onClick={() => {
                  onOpenFeedbackPanel?.('reviews');
                  setMenuOpen(false);
                }}
              >
                <Star className="w-4 h-4 text-amber-500 shrink-0" />
                Community reviews
              </button>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm text-app hover:bg-surface-hover flex items-center gap-2"
                onClick={() => {
                  onOpenFeedbackPanel?.('report');
                  setMenuOpen(false);
                }}
              >
                <Flag className="w-4 h-4 text-red-400 shrink-0" />
                Send a report
              </button>
              {canStaffReports ? (
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-app hover:bg-surface-hover flex items-center gap-2"
                  onClick={() => {
                    onOpenFeedbackPanel?.('staffReports');
                    setMenuOpen(false);
                  }}
                >
                  <ClipboardList className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="flex-1">User reports</span>
                  {staffReportCount > 0 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                      {staffReportCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
