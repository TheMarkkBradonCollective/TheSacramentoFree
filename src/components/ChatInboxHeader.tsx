import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Flag, LifeBuoy, MoreHorizontal, Plus, Star } from 'lucide-react';
import type { UserProfile } from '../types';
import { canViewStaffReports } from '../lib/roles';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import type { ChatFeedbackPanel } from './ChatFeedbackSection';
import type { ChatCategoryFilter, ChatStatusFilter } from '../lib/chatInboxFilters';

interface ChatInboxHeaderProps {
  onStartConversation?: () => void;
  onNewSupport?: () => void;
  onOpenFeedbackPanel?: (panel: ChatFeedbackPanel) => void;
  staffReportCount?: number;
  userProfile: UserProfile;
  categoryFilter: ChatCategoryFilter;
  statusFilter: ChatStatusFilter;
  onCategoryFilterChange: (filter: ChatCategoryFilter) => void;
  onStatusFilterChange: (filter: ChatStatusFilter) => void;
}

const CATEGORY_TABS: Array<{ value: ChatCategoryFilter; label: string }> = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'dm', label: 'DM' },
  { value: 'support', label: 'Support' },
  { value: 'groups', label: 'Groups' },
];

const STATUS_TABS: Array<{ value: ChatStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];

function FilterTabRow<T extends string>({
  id,
  ariaLabel,
  tabs,
  value,
  onChange,
}: {
  id: string;
  ariaLabel: string;
  tabs: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="inline-flex w-full rounded-xl border border-app bg-inset p-0.5"
      role="tablist"
      aria-label={ariaLabel}
      id={id}
    >
      {tabs.map(({ value: tabValue, label }) => {
        const selected = value === tabValue;
        return (
          <button
            key={tabValue}
            type="button"
            role="tab"
            id={`${id}_${tabValue}`}
            aria-selected={selected}
            onClick={() => onChange(tabValue)}
            className={`flex-1 inline-flex items-center justify-center rounded-[0.65rem] px-1.5 py-1.5 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              selected
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-app hover:bg-surface-hover'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function ChatInboxHeader({
  onStartConversation,
  onNewSupport,
  onOpenFeedbackPanel,
  staffReportCount = 0,
  userProfile,
  categoryFilter,
  statusFilter,
  onCategoryFilterChange,
  onStatusFilterChange,
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
    <header id="chat_inbox_header" className="shrink-0 px-3 pt-2 pb-1 space-y-2">
      <FilterTabRow
        id="chat_category_tabs"
        ariaLabel="Chat type"
        tabs={CATEGORY_TABS}
        value={categoryFilter}
        onChange={onCategoryFilterChange}
      />
      <FilterTabRow
        id="chat_status_tabs"
        ariaLabel="Chat status"
        tabs={STATUS_TABS}
        value={statusFilter}
        onChange={onStatusFilterChange}
      />

      <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0" id="chat_view_mode_bar">
        <div className="shrink-0">
          {onStartConversation ? (
            <button
              type="button"
              onClick={onStartConversation}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-accent bg-accent px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-on-accent hover:bg-accent-hover transition-colors cursor-pointer whitespace-nowrap"
              aria-label="New chat"
              title="New chat"
              id="chat_new_conversation_btn"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span>New</span>
            </button>
          ) : null}
        </div>

        <div className="flex-1 min-w-0" aria-hidden />

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onNewSupport ? (
            <button
              type="button"
              onClick={onNewSupport}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-app bg-inset px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-muted hover:text-app hover:border-accent/40 transition-colors cursor-pointer whitespace-nowrap"
              aria-label="Contact support"
              title="Contact support"
            >
              <LifeBuoy className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Support</span>
            </button>
          ) : null}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={`inline-flex items-center justify-center rounded-xl border p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                menuOpen
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-app bg-inset text-muted hover:text-app hover:border-accent/40'
              }`}
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
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
      </div>
    </header>
  );
}
