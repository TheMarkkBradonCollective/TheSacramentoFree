import { useState } from 'react';
import { Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import type { CommunityEvent, UserProfile } from '../types';
import { staffCancelEvent, staffDeleteEvent } from '../supabase';
import { canStaffDeleteAccount, isStaffRole } from '../lib/roles';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmStaffCancelEvent, confirmStaffDeleteEvent } from '../lib/destructiveConfirm';

interface StaffEventActionsProps {
  event: CommunityEvent;
  actor: UserProfile;
  onChanged?: () => void;
  onDeleted?: () => void;
  compact?: boolean;
}

export default function StaffEventActions({
  event,
  actor,
  onChanged,
  onDeleted,
  compact = false,
}: StaffEventActionsProps) {
  const { confirm, alert } = useConfirm();
  const [busy, setBusy] = useState<'cancel' | 'delete' | null>(null);

  if (!isStaffRole(actor.role)) return null;

  const canDelete = canStaffDeleteAccount(actor.role);
  const isUpcoming = event.status === 'upcoming';

  const handleCancel = async () => {
    const ok = await confirmStaffCancelEvent(confirm, event.title);
    if (!ok) return;
    setBusy('cancel');
    const result = await staffCancelEvent(event, actor);
    setBusy(null);
    if (!result.ok) {
      await alert({ title: 'Could not cancel', message: result.errorMessage || 'Could not cancel event.' });
      return;
    }
    onChanged?.();
  };

  const handleDelete = async () => {
    const ok = await confirmStaffDeleteEvent(confirm, event.title);
    if (!ok) return;
    setBusy('delete');
    const result = await staffDeleteEvent(event, actor);
    setBusy(null);
    if (!result.ok) {
      await alert({ title: 'Could not delete', message: result.errorMessage || 'Could not delete event.' });
      return;
    }
    onDeleted?.();
    onChanged?.();
  };

  const btnClass = compact ? 'sbn-btn sbn-btn-sm' : 'sbn-btn sbn-btn-sm';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-role-accent">
        <ShieldAlert className="w-3.5 h-3.5" />
        Staff
      </span>
      {isUpcoming && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void handleCancel()}
          className={`${btnClass} bg-accent/10 text-accent border border-accent/20`}
        >
          {busy === 'cancel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Cancel
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void handleDelete()}
          className={`${btnClass} bg-red-500/10 text-red-400 border border-red-500/20`}
        >
          {busy === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </button>
      )}
    </div>
  );
}
