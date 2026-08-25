import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Flag, Loader2 } from 'lucide-react';
import { ItemPost, ListingSubItem, UserProfile } from '../types';
import {
  getAppClaimsForItem,
  getListingSubitems,
  getPendingClaimRequestsForChat,
  submitClaimDisputeSupportTicket,
  submitSelfHandoffRequest,
} from '../supabase';
import SubItemPicker from './SubItemPicker';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useConfirm } from '../contexts/ConfirmContext';

interface ChatClaimerActionsProps {
  chatId: string;
  linkedItem: ItemPost;
  viewer: UserProfile;
  disabled?: boolean;
  onChanged: () => void;
  onOpenSupport?: () => void;
}

export default function ChatClaimerActions({
  chatId,
  linkedItem,
  viewer,
  disabled,
  onChanged,
  onOpenSupport,
}: ChatClaimerActionsProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [hasPendingFromViewer, setHasPendingFromViewer] = useState(false);
  const [wrongClaimerRecorded, setWrongClaimerRecorded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { confirm, alert } = useConfirm();

  const isOwner = linkedItem.userId === viewer.uid;
  const isGiveaway = linkedItem.type === 'giveaway';
  const isLooking = linkedItem.type === 'looking';

  const reload = useCallback(async () => {
    const [subs, pending, claims] = await Promise.all([
      getListingSubitems(linkedItem.id),
      getPendingClaimRequestsForChat(chatId),
      getAppClaimsForItem(linkedItem.id),
    ]);
    setSubitems(subs);
    setHasPendingFromViewer(
      pending.some((req) => req.claimerUserId === viewer.uid && req.status === 'pending'),
    );
    setWrongClaimerRecorded(
      claims.length > 0 && !claims.some((c) => c.claimerUserId === viewer.uid),
    );
    const available = subs.filter((s) => s.status === 'available').map((s) => s.id);
    setSelectedIds(available.length === 1 ? [available[0]] : []);
  }, [linkedItem.id, chatId, viewer.uid]);

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
          channelName: `claimer-subitems-${linkedItem.id}`,
          table: 'listing_subitems',
          event: '*',
          filter: `itemId=eq.${linkedItem.id}`,
        },
        refresh,
      ),
      subscribePostgresChanges(
        {
          channelName: `claimer-reqs-${chatId}`,
          table: 'item_claim_requests',
          event: '*',
          filter: `chatId=eq.${chatId}`,
        },
        refresh,
      ),
      subscribePostgresChanges(
        {
          channelName: `claimer-claims-${linkedItem.id}`,
          table: 'item_claims',
          event: '*',
          filter: `itemId=eq.${linkedItem.id}`,
        },
        refresh,
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [linkedItem.id, chatId, reload, onChanged]);

  if (
    isOwner ||
    linkedItem.status !== 'active' ||
    (!isGiveaway && !isLooking)
  ) {
    return null;
  }

  const isMulti = isGiveaway && subitems.length > 0;
  const availableCount = isMulti ? subitems.filter((s) => s.status === 'available').length : 1;
  const canSubmitHandoff = !hasPendingFromViewer && (isLooking || availableCount > 0);

  const handleSubmitHandoff = async () => {
    if (isMulti && selectedIds.length !== 1) {
      setErr('Pick exactly one item you picked up.');
      return;
    }

    const kind = isLooking ? 'dropoff' : 'pickup';
    const confirmMessage = isLooking
      ? `Tell ${linkedItem.userDisplayName} you dropped off for their request? They can confirm or deny in chat.`
      : `Tell ${linkedItem.userDisplayName} you picked this up? They can confirm or deny in chat.`;

    const confirmed = await confirm({
      message: confirmMessage,
      confirmLabel: isLooking ? 'I dropped off' : 'I picked up',
    });
    if (!confirmed) return;

    setBusy(true);
    setErr('');
    const result = await submitSelfHandoffRequest({
      item: linkedItem,
      actor: viewer,
      subItemIds: isMulti ? selectedIds : [],
      kind,
    });
    setBusy(false);

    if (result.ok) {
      setShowPicker(false);
      onChanged();
      await reload();
    } else {
      setErr(result.errorMessage || 'Could not send handoff request.');
    }
  };

  const handleReportToStaff = async () => {
    const note = window.prompt(
      'Optional: tell staff what happened (e.g. someone else was marked as the picker).',
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
        message:
          'Support will review who is recorded on this listing. Open Support in Messages if you want to follow up.',
      });
      onOpenSupport?.();
      onChanged();
    } else {
      setErr(result.errorMessage || 'Could not send report.');
    }
  };

  return (
    <div className="space-y-2">
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

      {hasPendingFromViewer && (
        <p className="text-xs text-muted text-center px-2">
          Waiting for {linkedItem.userDisplayName} to confirm your{' '}
          {isLooking ? 'drop-off' : 'pickup'}.
        </p>
      )}

      {canSubmitHandoff && !showPicker && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => (isMulti ? setShowPicker(true) : void handleSubmitHandoff())}
          className="w-full sbn-btn sbn-btn-primary sbn-btn-sm justify-center"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {isLooking ? 'I dropped off' : isMulti ? 'I picked up…' : 'I picked up'}
        </button>
      )}

      {showPicker && (
        <div className="p-2.5 rounded-xl border border-app bg-inset/40 space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted tracking-wide">
            Which item did you pick up?
          </p>
          <SubItemPicker
            subitems={subitems}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            disabled={busy}
            selectionMode="single"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.length !== 1}
              onClick={() => void handleSubmitHandoff()}
              className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {wrongClaimerRecorded && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void handleReportToStaff()}
          className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center text-accent border-accent/30"
        >
          <Flag className="w-4 h-4" />
          Report wrong claim to staff
        </button>
      )}
    </div>
  );
}
