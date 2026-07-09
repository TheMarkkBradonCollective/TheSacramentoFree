import type { UserProfile } from '../../types';
import StaffModerationPanel from '../StaffModerationPanel';

interface StaffModerationViewProps {
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
}

/**
 * Wraps the existing StaffModerationPanel (violations, audit log, leader messages)
 * in the sidebar panel layout. The neighbour directory and post management that
 * were also inside StaffModerationPanel now have their own dedicated sidebar tabs
 * (staff_users, staff_posts), so this view focuses on violations/audit/content.
 */
export default function StaffModerationView({ actor, onViewProfile }: StaffModerationViewProps) {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-app shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent font-mono">Staff Panel</p>
        <h2 className="font-display font-bold text-app text-lg">Moderation</h2>
        <p className="text-xs text-muted mt-0.5">Go Get violations, audit log, and community messages</p>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        <StaffModerationPanel viewer={actor} onViewProfile={onViewProfile} />
      </div>
    </div>
  );
}
