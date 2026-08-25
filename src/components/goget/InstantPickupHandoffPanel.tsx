import { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { GoGetSession, ItemPost, ListingSubItem, UserProfile } from '../../types';
import { getListingSubitems, submitSelfClaimRequest } from '../../supabase';
import { finishInstantPickupTrip } from '../../lib/goGetSessions';
import SubItemPicker from '../SubItemPicker';

interface InstantPickupHandoffPanelProps {
  item: ItemPost;
  session: GoGetSession;
  picker: UserProfile;
  disabled?: boolean;
  onSubmitted?: () => void;
  className?: string;
}

export default function InstantPickupHandoffPanel({
  item,
  session,
  picker,
  disabled,
  onSubmitted,
  className = '',
}: InstantPickupHandoffPanelProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getListingSubitems(item.id).then((rows) => {
      if (cancelled) return;
      setSubitems(rows);
      const available = rows.filter((s) => s.status === 'available').map((s) => s.id);
      setSelectedIds(available.length === 1 ? available : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const isMulti = subitems.length > 0;
  const availableCount = isMulti ? subitems.filter((s) => s.status === 'available').length : 1;

  if (availableCount === 0) {
    return (
      <p className={`text-xs text-muted ${className}`}>
        Everything on this listing is already claimed or pending confirmation.
      </p>
    );
  }

  const handleSubmit = async () => {
    if (isMulti && selectedIds.length === 0) {
      setErr('Select what you picked up.');
      return;
    }
    setSubmitting(true);
    setErr('');
    const claimResult = await submitSelfClaimRequest({
      item,
      claimer: picker,
      subItemIds: isMulti ? selectedIds : [],
    });
    if (!claimResult.ok) {
      setSubmitting(false);
      setErr(claimResult.errorMessage || 'Could not notify the poster.');
      return;
    }
    const tripResult = await finishInstantPickupTrip(session, item);
    setSubmitting(false);
    if (!tripResult.ok) {
      setErr(tripResult.errorMessage || 'Pickup sent, but the trip could not be ended.');
      onSubmitted?.();
      return;
    }
    onSubmitted?.();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-xs text-muted leading-snug">
        {isMulti
          ? 'Select what you took — the poster confirms in chat. You do not have to take everything.'
          : `${item.userDisplayName} will confirm in chat that you picked this up.`}
      </p>
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      {loading ? (
        <p className="text-sm text-muted flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading items…
        </p>
      ) : isMulti ? (
        <SubItemPicker
          subitems={subitems}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          selectionMode="multiple"
        />
      ) : null}
      <button
        type="button"
        disabled={disabled || submitting || (isMulti && selectedIds.length === 0)}
        onClick={() => void handleSubmit()}
        className="sbn-btn sbn-btn-primary w-full justify-center"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            {isMulti ? 'Notify what I picked up' : 'Notify poster I picked up'}
          </>
        )}
      </button>
    </div>
  );
}
