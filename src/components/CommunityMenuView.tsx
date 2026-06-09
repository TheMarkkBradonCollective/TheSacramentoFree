import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { UserProfile } from '../types';
import AccountHelpSection from './AccountHelpSection';
import StaffModerationPanel from './StaffModerationPanel';
import LeaderMessageEditModal from './LeaderMessageEditModal';
import { useDirectorMessage } from '../hooks/useDirectorMessage';
import { useCityManagerMessage } from '../hooks/useCityManagerMessage';
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
  const { message: directorMessage, saveMessage: saveDirectorMessage, canEdit: canEditDirector } =
    useDirectorMessage(userProfile);
  const {
    message: cityManagerMessage,
    saveMessage: saveCityManagerMessage,
    canEdit: canEditCityManager,
    isPublished: cityManagerMessagePublished,
  } = useCityManagerMessage(userProfile);
  const [editingDirector, setEditingDirector] = useState(false);
  const [editingCityManager, setEditingCityManager] = useState(false);

  return (
    <div className={fullBleed ? 'pb-6' : 'space-y-6'}>
      {canEditDirector && (
        <div className={fullBleed ? sectionShell : ''}>
          <div className="sbn-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app">Public welcome message</p>
              <p className="text-xs text-muted mt-0.5">Director note on the home and reviews pages.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingDirector(true)}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      )}

      {canEditCityManager && (
        <div className={fullBleed ? sectionShell : ''}>
          <div className="sbn-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-app">City manager message</p>
              <p className="text-xs text-muted mt-0.5">
                {cityManagerMessagePublished
                  ? 'Live on the home and reviews pages.'
                  : 'Not visible yet — any staff member can write and save one to publish it.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingCityManager(true)}
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

      {editingDirector && (
        <LeaderMessageEditModal
          editTitle="Edit director message"
          values={{
            name: directorMessage.directorName,
            title: directorMessage.directorTitle,
            headline: directorMessage.headline,
            goal: directorMessage.goal,
            promises: directorMessage.promises,
            closing: directorMessage.closing,
          }}
          onClose={() => setEditingDirector(false)}
          onSave={async (next) =>
            saveDirectorMessage({
              ...directorMessage,
              directorName: next.name,
              directorTitle: next.title,
              headline: next.headline,
              goal: next.goal,
              promises: next.promises,
              closing: next.closing,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}

      {editingCityManager && (
        <LeaderMessageEditModal
          editTitle="Edit city manager message"
          values={{
            name: cityManagerMessage.managerName,
            title: cityManagerMessage.managerTitle,
            headline: cityManagerMessage.headline,
            goal: cityManagerMessage.goal,
            promises: cityManagerMessage.promises,
            closing: cityManagerMessage.closing,
          }}
          onClose={() => setEditingCityManager(false)}
          onSave={async (next) =>
            saveCityManagerMessage({
              ...cityManagerMessage,
              managerName: next.name,
              managerTitle: next.title,
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
