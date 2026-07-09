import type { UserProfile } from '../../types';
import DirectorSiteOverview from '../DirectorSiteOverview';
import { isStaffRole, isDirectorRole } from '../../lib/roles';

interface StaffOverviewViewProps {
  actor: UserProfile;
}

export default function StaffOverviewView({ actor }: StaffOverviewViewProps) {
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

      <div className="flex-1 overflow-y-auto p-4">
        {isDirectorRole(actor.role) ? (
          <DirectorSiteOverview />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Director-level site metrics are visible to the Sacramento Buy Nothing Director only.
              Use the sidebar tabs to manage users, posts, and your team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
