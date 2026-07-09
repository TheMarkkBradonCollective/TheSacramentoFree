import { useState } from 'react';
import { MessageSquareQuote, Pencil } from 'lucide-react';
import type { UserProfile } from '../../types';
import DirectorSiteOverview from '../DirectorSiteOverview';
import { canEditOwnStaffMessage, isDirectorRole, isStaffRole } from '../../lib/roles';
import { useStaffMessage } from '../../hooks/useStaffMessage';
import LeaderMessageEditModal from '../LeaderMessageEditModal';

interface StaffOverviewViewProps {
  actor: UserProfile;
}

export default function StaffOverviewView({ actor }: StaffOverviewViewProps) {
  const [editingTeamMessage, setEditingTeamMessage] = useState(false);
  const canEditTeamMessage = canEditOwnStaffMessage(actor.role);
  const {
    message: staffMessage,
    saveMessage: saveStaffMessage,
    isPublished: staffMessagePublished,
  } = useStaffMessage(actor);

  if (!isStaffRole(actor.role)) return null;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="px-4 pt-4 pb-3 border-b border-app shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent font-mono">Staff Panel</p>
        <h2 className="font-display font-bold text-app text-lg">Overview</h2>
        <p className="text-xs text-muted mt-0.5">
          {isDirectorRole(actor.role) ? 'Platform-wide metrics and recent activity' : 'Community health at a glance'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isDirectorRole(actor.role) ? (
          <DirectorSiteOverview />
        ) : (
          <p className="text-sm text-muted">
            Director-level site metrics are visible to the Sacramento Buy Nothing Director only.
            Use the sidebar tabs to manage users, listings, and messages.
          </p>
        )}

        {canEditTeamMessage && staffMessage && (
          <div className="sbn-help-card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                  <MessageSquareQuote className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-app">Your team message</p>
                  <p className="text-xs text-muted mt-0.5">
                    {staffMessagePublished
                      ? 'Live on the home and reviews pages'
                      : 'Not published yet — add your welcome note for neighbors'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeamMessage(true)}
                className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
            {staffMessagePublished && (
              <p className="text-sm text-app leading-relaxed pl-11">{staffMessage.headline}</p>
            )}
          </div>
        )}
      </div>

      {editingTeamMessage && staffMessage && (
        <LeaderMessageEditModal
          editTitle="Edit your team message"
          values={{
            name: staffMessage.staffName,
            title: staffMessage.staffTitle,
            headline: staffMessage.headline,
            goal: staffMessage.goal,
            promises: staffMessage.promises,
            closing: staffMessage.closing,
          }}
          onClose={() => setEditingTeamMessage(false)}
          onSave={async (next) =>
            saveStaffMessage({
              ...staffMessage,
              staffName: next.name,
              staffTitle: next.title,
              headline: next.headline,
              goal: next.goal,
              promises: next.promises,
              closing: next.closing,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}
    </div>
  );
}
