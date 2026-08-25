import { useState } from 'react';
import { Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import type { ItemPost, UserProfile } from '../types';
import { staffDeleteListing, staffWithdrawListing } from '../supabase';
import { canStaffDeleteAccount, isStaffRole } from '../lib/roles';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmStaffCancelEvent, confirmStaffDeleteEvent, confirmStaffDeleteListing, confirmStaffWithdrawListing } from '../lib/destructiveConfirm';

interface StaffListingActionsProps {
  item: ItemPost;
  actor: UserProfile;
  onChanged?: () => void;
  onDeleted?: () => void;
  compact?: boolean;
}

export default function StaffListingActions({
  item,
  actor,
  onChanged,
  onDeleted,
  compact = false,
}: StaffListingActionsProps) {
  const { confirm, alert } = useConfirm();
  const [busy, setBusy] = useState<'withdraw' | 'delete' | null>(null);

  if (!isStaffRole(actor.role)) return null;

  const canDelete = canStaffDeleteAccount(actor.role);

  const handleWithdraw = async () => {
    const ok = await confirmStaffWithdrawListing(confirm, item.title);
    if (!ok) return;
    setBusy('withdraw');
    const result = await staffWithdrawListing(item, actor);
    setBusy(null);
    if (!result.ok) {
      await alert({ title: 'Could not withdraw', message: result.errorMessage || 'Could not withdraw listing.' });
      return;
    }
    onChanged?.();
  };

  const handleDelete = async () => {
    const ok = await confirmStaffDeleteListing(confirm, item.title);
    if (!ok) return;
    setBusy('delete');
    const result = await staffDeleteListing(item, actor);
    setBusy(null);
    if (!result.ok) {
      await alert({ title: 'Could not delete', message: result.errorMessage || 'Could not delete listing.' });
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
      {item.status !== 'withdrawn' && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void handleWithdraw()}
          className={`${btnClass} bg-accent/10 text-accent border border-accent/20`}
        >
          {busy === 'withdraw' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Withdraw
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
