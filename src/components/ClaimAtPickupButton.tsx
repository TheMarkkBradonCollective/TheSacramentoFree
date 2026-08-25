import { useEffect, useState } from 'react';
import { ItemPost, ListingSubItem, UserProfile } from '../types';
import { getListingSubitems, submitSelfClaimRequest } from '../supabase';
import { isUserAtPickupLocation, pickupHasGpsPin } from '../lib/pickupProximity';
import { canOfferContactlessClaim, isContactlessClaimCategory } from '../lib/listingMapActions';
import SubItemPicker from './SubItemPicker';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { supportsGoGetCoordination } from '../lib/goGetEligibility';
import { isInstantClaimCategory } from '../lib/goGetSessions';

interface ClaimAtPickupButtonProps {
  item: ItemPost;
  user: UserProfile;
  userLat: number | null;
  userLng: number | null;
  onClaimSubmitted: (chatId: string) => void;
  className?: string;
  compact?: boolean;
  variant?: 'button' | 'gps';
}

export default function ClaimAtPickupButton({
  item,
  user,
  userLat,
  userLng,
  onClaimSubmitted,
  className = '',
  compact = false,
  variant = 'button',
}: ClaimAtPickupButtonProps) {
  const { alert } = useConfirm();
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [loadingSubitems, setLoadingSubitems] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const isOwner = item.userId === user.uid;
  const isInstantPickup =
    item.type === 'giveaway' && item.status === 'active' && isInstantClaimCategory(item.category);
  const hasGps = pickupHasGpsPin(item);
  const atLocation =
    hasGps &&
    userLat != null &&
    userLng != null &&
    isUserAtPickupLocation(userLat, userLng, item);

  useEffect(() => {
    if (!isInstantPickup) return;
    void getListingSubitems(item.id).then((rows) => {
      setSubitems(rows);
    });
  }, [item.id, isInstantPickup]);

  useEffect(() => {
    if (!showPicker || !isInstantPickup) return;
    setLoadingSubitems(true);
    void getListingSubitems(item.id).then((rows) => {
      setSubitems(rows);
      const available = rows.filter((s) => s.status === 'available');
      setSelectedIds(available.length === 1 ? [available[0].id] : []);
      setLoadingSubitems(false);
    });
  }, [showPicker, item.id, isInstantPickup]);

  useEffect(() => {
    if (!showPicker) return;

    const refresh = debounceRealtime(() => {
      void getListingSubitems(item.id).then((rows) => {
        setSubitems(rows);
        setSelectedIds((prev) => prev.filter((id) => rows.some((s) => s.id === id && s.status === 'available')));
      });
    }, 100);

    return subscribePostgresChanges(
      {
        channelName: `live-claim-picker-${item.id}`,
        table: 'listing_subitems',
        event: '*',
        filter: `itemId=eq.${item.id}`,
      },
      refresh,
    );
  }, [showPicker, item.id]);

  if (!supportsGoGetCoordination()) return null;

  if (!isInstantPickup || isOwner || !hasGps) return null;

  if (!canOfferContactlessClaim(item, user.uid, userLat, userLng)) return null;

  const availableCount =
    subitems.length > 0 ? subitems.filter((s) => s.status === 'available').length : 1;

  if (availableCount === 0) return null;

  const handleOpen = async () => {
    const { ensureGoGetAllowed } = await import('../lib/goGetEligibility');
    const allowed = await ensureGoGetAllowed({
      self: user,
      otherUserId: item.userId,
      otherDisplayName: item.userDisplayName,
      alert,
    });
    if (!allowed) return;
    if (!atLocation) {
      setErr('Move closer to the curb alert pin.');
      return;
    }
    setErr('');
    setShowPicker(true);
  };

  const handleSubmit = async () => {
    if (subitems.length > 0 && selectedIds.length === 0) {
      setErr('Select what you picked up.');
      return;
    }
    const { ensureGoGetAllowed } = await import('../lib/goGetEligibility');
    const allowed = await ensureGoGetAllowed({
      self: user,
      otherUserId: item.userId,
      otherDisplayName: item.userDisplayName,
      alert,
    });
    if (!allowed) return;
    setSubmitting(true);
    setErr('');
    const result = await submitSelfClaimRequest({
      item,
      claimer: user,
      subItemIds: subitems.length > 0 ? selectedIds : [],
    });
    setSubmitting(false);

    if (result.ok && result.chatId) {
      setShowPicker(false);
      onClaimSubmitted(result.chatId);
    } else {
      setErr(result.errorMessage || 'Could not submit claim.');
    }
  };

  const trigger =
    variant === 'gps' ? (
      <button
        type="button"
        onClick={() => void handleOpen()}
        title="Optional — let the poster know you picked this up"
        className={`sbn-gps-action ${className}`}
      >
        <span className="sbn-gps-action__icon">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        </span>
        <span className="sbn-gps-action__label">Claim</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void handleOpen()}
        title="Optional — let the poster know you picked this up"
        className={`sbn-btn sbn-btn-primary ${compact ? 'sbn-btn-sm' : ''} ${className}`}
        aria-label="Notify poster I picked up"
      >
        <CheckCircle className="w-4 h-4" />
        <span>{compact ? 'Claim' : 'Notify poster I picked up'}</span>
      </button>
    );

  return (
    <>
      {trigger}

      {showPicker && (
        <div className="fixed inset-0 z-[75] bg-black/60 flex items-center justify-center p-4">
          <div className="sbn-card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-display font-bold text-app">Which item did you take?</h4>
            <p className="text-xs text-muted leading-snug">
              {subitems.length > 1
                ? 'Pick what you took — the poster confirms in chat. You do not have to take everything.'
                : `${item.userDisplayName} will confirm in chat that you picked this up. You can skip notifying them.`}
            </p>

            {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

            {loadingSubitems ? (
              <p className="text-sm text-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading items…
              </p>
            ) : subitems.length > 0 ? (
              <SubItemPicker
                subitems={subitems}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                selectionMode="multiple"
              />
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="sbn-btn sbn-btn-secondary flex-1"
              >
                Skip
              </button>
              <button
                type="button"
                disabled={submitting || (subitems.length > 0 && selectedIds.length === 0)}
                onClick={() => void handleSubmit()}
                className="sbn-btn sbn-btn-primary flex-1"
              >
                {submitting ? 'Sending…' : subitems.length > 0 ? 'Notify for this item' : 'Notify poster'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
