import { useCallback, useEffect, useState } from 'react';
import { ItemPost, ItemClaimRequest, ListingSubItem, UserProfile } from '../types';
import {
  confirmClaimRequest,
  getListingSubitems,
  getPendingClaimRequestsForChat,
  markItemFulfilledFromChat,
  rejectClaimRequest,
  recordItemClaimInChat,
  submitClaimDisputeSupportTicket,
} from '../supabase';
import SubItemPicker from './SubItemPicker';
import { CheckCircle, Flag } from 'lucide-react';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useConfirm } from '../contexts/ConfirmContext';
import { formatItemFulfilledChatMessage } from '../lib/claims';

interface ChatClaimActionsProps {
  chatId: string;
  linkedItem: ItemPost;
  viewer: UserProfile;
  claimerUserId: string;
  disabled?: boolean;
  onChanged: () => void;
  onOpenSupport?: () => void;
}

export default function ChatClaimActions({
  chatId,
  linkedItem,
  viewer,
  claimerUserId,
  disabled,
  onChanged,
  onOpenSupport,
}: ChatClaimActionsProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [pending, setPending] = useState<ItemClaimRequest[]>([]);
  const [manualSelected, setManualSelected] = useState<string[]>([]);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { confirm, alert } = useConfirm();

  const isGiveaway = linkedItem.type === 'giveaway';
  const isLooking = linkedItem.type === 'looking';

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

  const isMulti = isGiveaway && subitems.length > 0;
  const availableCount = isMulti ? subitems.filter((s) => s.status === 'available').length : 1;
  const hasPendingRequests = pending.length > 0;

  if (
    linkedItem.userId !== viewer.uid ||
    (!isGiveaway && !isLooking) ||
    (isGiveaway && availableCount === 0 && !hasPendingRequests) ||
    (isLooking && linkedItem.status !== 'active' && !hasPendingRequests)
  ) {
    return null;
  }

  const handleConfirmRequest = async (request: ItemClaimRequest) => {
    const confirmMessage = isLooking
      ? `Confirm you received the drop-off from ${request.claimerName}?`
      : `Confirm pickup for ${request.claimerName}?`;
    const confirmLabel = isLooking ? 'Confirm drop-off' : 'Confirm pickup';

    const confirmed = await confirm({
      message: confirmMessage,
      confirmLabel,
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
      message: isLooking
        ? `Mark that ${request.claimerName} didn't drop this off?${itemNote}`
        : `Mark that ${request.claimerName} wasn't the one who picked up?${itemNote}`,
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

    const helperName =
      pending.find((r) => r.claimerUserId === claimerUserId)?.claimerName ||
      'this neighbor';

    const confirmMessage = isLooking
      ? `Mark this request fulfilled with help from ${helperName}?`
      : isMulti
        ? `Confirm this neighbor picked up: ${labels}?`
        : 'Mark this item as claimed by the neighbor in this chat?';
    const confirmLabel = isLooking ? 'Mark fulfilled' : 'Confirm pickup';

    const confirmed = await confirm({
      message: confirmMessage,
      confirmLabel,
    });
    if (!confirmed) return;

    setBusy(true);
    setErr('');

    if (isLooking) {
      const result = await markItemFulfilledFromChat({
        itemId: linkedItem.id,
        ownerUserId: viewer.uid,
        helperUserId: claimerUserId,
        chatId,
        message: formatItemFulfilledChatMessage(linkedItem.title, helperName),
      });
      setBusy(false);
      if (result.ok) {
        setShowManualPicker(false);
        onChanged();
        await reload();
      } else {
        setErr(result.errorMessage || 'Could not mark as fulfilled.');
      }
      return;
    }

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

  const handleReportToStaff = async () => {
    const note = window.prompt(
      'Optional: tell staff what happened (e.g. wrong neighbor marked or dispute over pickup).',
    );
    if (note === null) return;

    setBusy(true);
    setErr('');
    const result = await submitClaimDisputeSupportTicket({
      opener: viewer,
      item: linkedItem,
      chatId,
      note: note.trim() || undefined,
    });
    setBusy(false);

    if (result.ok) {
      await alert({
        title: 'Report sent to staff',
        message: 'Support will review this listing. Open Support in Messages to follow up.',
      });
      onOpenSupport?.();
      onChanged();
    } else {
      setErr(result.errorMessage || 'Could not send report.');
    }
  };

  const manualButtonLabel = isLooking
    ? 'This neighbor dropped off'
    : isMulti
      ? 'Confirm item picked up…'
      : 'This neighbor claimed it';

  return (
    <div className="space-y-2">
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

      {pending.map((req) => (
        <div
          key={req.id}
          className="p-2.5 rounded-xl border border-accent/30 bg-accent/5 space-y-2"
        >
          <p className="text-xs text-app">
            <span className="font-semibold">{req.claimerName}</span>{' '}
            {isLooking ? 'says they dropped off' : 'says they picked up'}
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
              {isLooking ? 'Confirm drop-off' : 'Confirm pickup'}
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

      {(isGiveaway ? availableCount > 0 || hasPendingRequests : linkedItem.status === 'active') &&
        !hasPendingRequests && (
          <>
            {!showManualPicker ? (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => (isMulti ? setShowManualPicker(true) : void handleManualConfirm())}
                className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
              >
                <CheckCircle className="w-4 h-4" />
                {manualButtonLabel}
              </button>
            ) : (
              <div className="p-2.5 rounded-xl border border-app bg-inset/40 space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted tracking-wide">
                  Which item did they take?
                </p>
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
          </>
        )}

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void handleReportToStaff()}
        className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center text-muted"
      >
        <Flag className="w-4 h-4" />
        Report claim issue to staff
      </button>
    </div>
  );
}
