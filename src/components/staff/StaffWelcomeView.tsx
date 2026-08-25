import { useState } from 'react';
import { Megaphone, Pencil } from 'lucide-react';
import type { UserProfile } from '../../types';
import { canViewDirectorOverview } from '../../lib/roles';
import { useDirectorMessage } from '../../hooks/useDirectorMessage';
import LeaderMessageEditModal from '../LeaderMessageEditModal';

interface StaffWelcomeViewProps {
  actor: UserProfile;
}

export default function StaffWelcomeView({ actor }: StaffWelcomeViewProps) {
  const [editing, setEditing] = useState(false);
  const canEdit = canViewDirectorOverview(actor.role);
  const { message: directorMessage, saveMessage: saveDirectorMessage } = useDirectorMessage(actor);

  if (!canEdit) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div>
          <h3 className="font-display font-bold text-app text-lg">No permission</h3>
          <p className="text-sm text-muted mt-1">Only the Director can edit the public welcome message.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-app shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Public Welcome Message</h2>
            <p className="text-xs text-muted mt-0.5">Director note on the home and reviews pages</p>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="sbn-btn sbn-btn-primary sbn-btn-sm">
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="sbn-help-card space-y-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
              <Megaphone className="w-5 h-5" />
            </span>
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-sm font-semibold text-app">{directorMessage.directorName}</p>
                <p className="text-xs text-muted">{directorMessage.directorTitle}</p>
              </div>
              <p className="text-base font-display font-bold text-app leading-snug">{directorMessage.headline}</p>
              <p className="text-sm text-app leading-relaxed">{directorMessage.goal}</p>
              {directorMessage.promises.length > 0 && (
                <ul className="space-y-1.5">
                  {directorMessage.promises.map((promise) => (
                    <li key={promise} className="text-sm text-app leading-relaxed flex gap-2">
                      <span className="text-accent shrink-0">•</span>
                      <span>{promise}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-muted leading-relaxed">{directorMessage.closing}</p>
            </div>
          </div>
        </div>
      </div>

      {editing && (
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
          onClose={() => setEditing(false)}
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
    </div>
  );
}
