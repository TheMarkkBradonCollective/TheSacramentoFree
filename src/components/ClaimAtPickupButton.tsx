import { useEffect, useState } from 'react';
import { ItemPost, ListingSubItem, UserProfile } from '../types';
import { getListingSubitems, submitSelfClaimRequest } from '../supabase';
import { isUserAtPickupLocation, pickupHasGpsPin } from '../lib/pickupProximity';
import SubItemPicker from './SubItemPicker';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ClaimAtPickupButtonProps {
  item: ItemPost;
  user: UserProfile;
  userLat: number | null;
  userLng: number | null;
  onClaimSubmitted: (chatId: string) => void;
  className?: string;
  compact?: boolean;
}

export default function ClaimAtPickupButton({
  item,
  user,
  userLat,
  userLng,
  onClaimSubmitted,
  className = '',
  compact = false,
}: ClaimAtPickupButtonProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [loadingSubitems, setLoadingSubitems] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const isOwner = item.userId === user.uid;
  const isGiveaway = item.type === 'giveaway' && item.status === 'active';
  const hasGps = pickupHasGpsPin(item);
  const atLocation =
    hasGps &&
    userLat != null &&
    userLng != null &&
    isUserAtPickupLocation(userLat, userLng, item);

  useEffect(() => {
    if (!showPicker || !isGiveaway) return;
    setLoadingSubitems(true);
    void getListingSubitems(item.id).then((rows) => {
      setSubitems(rows);
      const available = rows.filter((s) => s.status === 'available').map((s) => s.id);
      setSelectedIds(available.length === 1 ? available : []);
      setLoadingSubitems(false);
    });
  }, [showPicker, item.id, isGiveaway]);

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

  if (!isGiveaway || isOwner || !hasGps) return null;

  const availableCount =
    subitems.length > 0 ? subitems.filter((s) => s.status === 'available').length : 1;

  if (availableCount === 0) return null;

  const handleOpen = () => {
    if (userLat == null || userLng == null) {
      if (!navigator.geolocation) {
        setErr('Enable location in your browser to claim at pickup.');
        return;
      }
      setErr('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (!isUserAtPickupLocation(latitude, longitude, item)) {
            setErr('Move closer to the pickup pin to claim (contactless pickup).');
            return;
          }
          setShowPicker(true);
        },
        () => setErr('Could not read your location. Check GPS permissions.'),
        { enableHighAccuracy: true, timeout: 10000 },
      );
      return;
    }
    if (!atLocation) {
      setErr('Move closer to the pickup pin to claim (contactless pickup).');
      return;
    }
    setErr('');
    setShowPicker(true);
  };

  const handleSubmit = async () => {
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

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={false}
        title={
          atLocation
            ? 'Tell the poster you picked up (contactless)'
            : userLat == null
              ? 'Enable GPS to claim at pickup'
              : 'Get closer to the pickup pin'
        }
        className={`sbn-btn ${atLocation ? 'sbn-btn-primary' : 'sbn-btn-secondary'} ${compact ? 'sbn-btn-sm' : ''} ${className}`}
      >
        <CheckCircle className="w-4 h-4" />
        {compact ? 'Claim' : 'I picked up'}
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-[75] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="sbn-card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-display font-bold text-app">Contactless pickup claim</h4>
            <p className="text-xs text-muted leading-snug">
              {subitems.length > 0
                ? 'Select what you took. The poster will confirm in Messages.'
                : `${item.userDisplayName} will get a message that you picked this up.`}
            </p>

            {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

            {loadingSubitems ? (
              <p className="text-sm text-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading items…
              </p>
            ) : subitems.length > 0 ? (
              <SubItemPicker subitems={subitems} selectedIds={selectedIds} onChange={setSelectedIds} />
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="sbn-btn sbn-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || (subitems.length > 0 && selectedIds.length === 0)}
                onClick={() => void handleSubmit()}
                className="sbn-btn sbn-btn-primary flex-1"
              >
                {submitting ? 'Sending…' : 'Send claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
