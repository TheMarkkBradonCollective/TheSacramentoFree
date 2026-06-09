import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { UserProfile } from '../types';
import AccountHelpSection from './AccountHelpSection';
import StaffModerationPanel from './StaffModerationPanel';
import CommunityFooter from './CommunityFooter';
import DirectorMessageEditModal from './DirectorMessageEditModal';
import { useDirectorMessage } from '../hooks/useDirectorMessage';
import { canAccessStaffDirectory } from '../lib/roles';

interface CommunityMenuViewProps {
  userProfile: UserProfile;
  onViewProfile: (userId: string) => void;
  /** Edge-to-edge sections (mobile tab) — no nested card frames */
  fullBleed?: boolean;
}

export default function CommunityMenuView({
  userProfile,
  onViewProfile,
  fullBleed = false,
}: CommunityMenuViewProps) {
  const sectionShell = fullBleed ? 'px-4 py-5 border-t border-app/40' : '';
  const { message, saveMessage, canEdit } = useDirectorMessage(userProfile);
  const [editingWelcome, setEditingWelcome] = useState(false);

  return (
    <div className={fullBleed ? 'pb-6' : 'space-y-6'}>
      {canEdit && (
        <div className={fullBleed ? sectionShell : ''}>
          <div className="sbn-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app">Public welcome message</p>
              <p className="text-xs text-muted mt-0.5">Shown on the home page before sign-in.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingWelcome(true)}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      )}

      <div className={fullBleed ? sectionShell : ''}>
        <AccountHelpSection user={userProfile} />
      </div>

      {canAccessStaffDirectory(userProfile.role) && (
        <div className={fullBleed ? `${sectionShell} border-t-0` : ''}>
          <StaffModerationPanel viewer={userProfile} onViewProfile={onViewProfile} />
        </div>
      )}

      <div className={fullBleed ? 'px-4' : ''}>
        <CommunityFooter compact />
      </div>

      {editingWelcome && (
        <DirectorMessageEditModal
          message={message}
          onClose={() => setEditingWelcome(false)}
          onSave={saveMessage}
        />
      )}
    </div>
  );
}
