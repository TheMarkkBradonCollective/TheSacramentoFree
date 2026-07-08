import { useCallback, useEffect, useState } from 'react';
import { ItemPost, ItemClaimRequest, ListingSubItem, UserProfile } from '../types';
import {
  confirmClaimRequest,
  getListingSubitems,
  getPendingClaimRequestsForChat,
  rejectClaimRequest,
  recordItemClaimInChat,
} from '../supabase';
import SubItemPicker from './SubItemPicker';
import { CheckCircle } from 'lucide-react';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useConfirm } from '../contexts/ConfirmContext';

interface ChatClaimActionsProps {
  chatId: string;
  linkedItem: ItemPost;
  viewer: UserProfile;
  claimerUserId: string;
  disabled?: boolean;
  onChanged: () => void;
}

export default function ChatClaimActions({
  chatId,
  linkedItem,
  viewer,
  claimerUserId,
  disabled,
  onChanged,
}: ChatClaimActionsProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [pending, setPending] = useState<ItemClaimRequest[]>([]);
  const [manualSelected, setManualSelected] = useState<string[]>([]);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { confirm } = useConfirm();

  const reload = useCallback(async () => {
    const [subs, reqs] = await Promise.all([
      getListingSubitems(linkedItem.id),
      getPendingClaimRequestsForChat(chatId),
    ]);
    setSubitems(subs);
    setPending(reqs);
    const available = subs.filter((s) => s.status === 'available').map((s) => s.id);
    setManualSelected(available.length === 1 ? [available[0]] : []);
  }, [linkedItem.id, chatId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reload();
      onChanged();
    }, 100);

    const unsubs = [
      subscribePostgresChanges(
        {
          channelName: `live-subitems-${linkedItem.id}`,
          table: 'listing_subitems',
          event: '*',
          filter: `itemId=eq.${linkedItem.id}`,
        },
        refresh,
      ),
      subscribePostgresChanges(
        {
          channelName: `live-claim-reqs-${chatId}`,
          table: 'item_claim_requests',
          event: '*',
          filter: `chatId=eq.${chatId}`,
        },
        refresh,
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [linkedItem.id, chatId, reload, onChanged]);

  const isMulti = subitems.length > 0;
  const availableCount = isMulti ? subitems.filter((s) => s.status === 'available').length : 1;
  const hasPendingRequests = pending.length > 0;

  if (
    linkedItem.userId !== viewer.uid ||
    linkedItem.type !== 'giveaway' ||
    (availableCount === 0 && !hasPendingRequests)
  ) {
    return null;
  }

  const handleConfirmRequest = async (request: ItemClaimRequest) => {
    const confirmed = await confirm({
      message: `Confirm pickup for ${request.claimerName}?`,
      confirmLabel: 'Confirm pickup',
    });
    if (!confirmed) return;
    setBusy(true);
    setErr('');
    const result = await confirmClaimRequest({
      requestId: request.id,
      actor: viewer,
      itemTitle: linkedItem.title,
    });
    setBusy(false);
    if (result.ok) {
      onChanged();
      await reload();
    } else {
      setErr(result.errorMessage || 'Could not confirm.');
    }
  };

  const handleRejectRequest = async (request: ItemClaimRequest) => {
    const itemNote =
      isMulti && request.subItemIds.length > 0
        ? ` That item will go back up for others.`
        : '';
    const confirmed = await confirm({
      message: `Mark that ${request.claimerName} wasn't the one who picked up?${itemNote}`,
      confirmLabel: 'Not them',
      variant: 'danger',
    });
    if (!confirmed) return;
    setBusy(true);
    setErr('');
    const result = await rejectClaimRequest({
      requestId: request.id,
      actor: viewer,
    });
    setBusy(false);
    if (result.ok) {
      onChanged();
      await reload();
    } else {
      setErr(result.errorMessage || 'Could not decline request.');
    }
  };

  const handleManualConfirm = async () => {
    if (isMulti && manualSelected.length !== 1) {
      setErr('Select exactly one item they picked up.');
      return;
    }

    const labels =
      isMulti && manualSelected.length === 1
        ? subitems.filter((s) => manualSelected.includes(s.id)).map((s) => s.label).join(', ')
        : linkedItem.title;

    const confirmed = await confirm({
      message: isMulti
        ? `Confirm this neighbor picked up: ${labels}?`
        : 'Mark this item as claimed by the neighbor in this chat?',
      confirmLabel: 'Confirm pickup',
    });
    if (!confirmed) return;

    setBusy(true);
    setErr('');
    const result = await recordItemClaimInChat({
      itemId: linkedItem.id,
      itemTitle: linkedItem.title,
      giverUserId: viewer.uid,
      claimerUserId,
      chatId,
      claimMessage: '',
      subItemIds: isMulti ? manualSelected : undefined,
    });
    setBusy(false);

    if (result.ok) {
      setShowManualPicker(false);
      onChanged();
      await reload();
    } else {
      setErr(result.errorMessage || 'Could not mark as claimed.');
    }
  };

  return (
    <div className="space-y-2">
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

      {pending.map((req) => (
        <div
          key={req.id}
          className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2"
        >
          <p className="text-xs text-app">
            <span className="font-semibold">{req.claimerName}</span> says they picked up
            {isMulti && req.subItemIds.length > 0 && (
              <>
                :{' '}
                {subitems
                  .filter((s) => req.subItemIds.includes(s.id))
                  .map((s) => s.label)
                  .join(', ')}
              </>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void handleConfirmRequest(req)}
              className="w-full sbn-btn sbn-btn-primary sbn-btn-sm justify-center"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm pickup
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void handleRejectRequest(req)}
              className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
            >
              Not them
            </button>
          </div>
        </div>
      ))}

      {!showManualPicker ? (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => (isMulti ? setShowManualPicker(true) : void handleManualConfirm())}
          className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
        >
          <CheckCircle className="w-4 h-4" />
          {isMulti ? 'Confirm item picked up…' : 'This neighbor claimed it'}
        </button>
      ) : (
        <div className="p-2.5 rounded-xl border border-app bg-inset/40 space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted tracking-wide">Which item did they take?</p>
          <SubItemPicker
            subitems={subitems}
            selectedIds={manualSelected}
            onChange={setManualSelected}
            disabled={busy}
            selectionMode="single"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowManualPicker(false)}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || manualSelected.length !== 1}
              onClick={() => void handleManualConfirm()}
              className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
