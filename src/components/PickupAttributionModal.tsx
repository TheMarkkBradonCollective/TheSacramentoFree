import { useEffect, useMemo, useState } from 'react';
import { Check, Search, UserRound, X } from 'lucide-react';
import { ItemPost, PickupAttributionType, UserProfile } from '../types';
import {
  PICKUP_CHANNEL_OPTIONS,
  PickupNeighborCandidate,
  buildPickupAttributionInput,
  getPickupAttributionLabel,
  initialPickupSelection,
} from '../lib/pickupAttribution';
import {
  completeItemWithPickupAttribution,
  getFacebookPickupGroups,
  getPickupNeighborCandidates,
  searchPickupNeighbors,
} from '../supabase';
import UserAvatar from './UserAvatar';

interface PickupAttributionModalProps {
  item: ItemPost;
  owner: UserProfile;
  mode: 'complete' | 'edit';
  onClose: () => void;
  onSaved: () => void;
}

type Selection = 'neighbor' | PickupAttributionType;

export default function PickupAttributionModal({
  item,
  owner,
  mode,
  onClose,
  onSaved,
}: PickupAttributionModalProps) {
  const [selection, setSelection] = useState<Selection>(() => initialPickupSelection(item));
  const [selectedNeighbor, setSelectedNeighbor] = useState<PickupNeighborCandidate | null>(null);
  const [facebookGroupName, setFacebookGroupName] = useState(
    item.pickupAttributionType === 'facebook_group' ? item.pickupAttributionLabel || '' : '',
  );
  const [otherLabel, setOtherLabel] = useState(
    item.pickupAttributionType === 'other' ? item.pickupAttributionLabel || '' : '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<PickupNeighborCandidate[]>([]);
  const [searchResults, setSearchResults] = useState<PickupNeighborCandidate[]>([]);
  const [facebookGroups, setFacebookGroups] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    void getPickupNeighborCandidates(item.id, owner.uid).then(setCandidates);
    void getFacebookPickupGroups().then(setFacebookGroups);
  }, [item.id, owner.uid]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchPickupNeighbors(query, owner.uid).then(setSearchResults);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery, owner.uid]);

  const neighborList = useMemo(() => {
    const merged = [...candidates];
    for (const result of searchResults) {
      if (!merged.some((entry) => entry.userId === result.userId)) {
        merged.push(result);
      }
    }
    return merged;
  }, [candidates, searchResults]);

  const canConfirm = useMemo(() => {
    if (selection === 'neighbor') return !!selectedNeighbor;
    if (selection === 'facebook_group') return facebookGroupName.trim().length > 0;
    return true;
  }, [selection, selectedNeighbor, facebookGroupName]);

  const handleConfirm = async () => {
    const attribution = buildPickupAttributionInput({
      selection,
      neighbor: selectedNeighbor,
      facebookGroupName,
      otherLabel,
    });

    if (!attribution && selection !== 'neighbor') {
      setErr('Choose who picked this up, or skip for now.');
      return;
    }
    if (selection === 'neighbor' && !attribution) {
      setErr('Select a neighbor or search by display name.');
      return;
    }

    setSubmitting(true);
    setErr('');

    const result = await completeItemWithPickupAttribution({
      item,
      owner,
      attribution,
      markCompleted: mode === 'complete',
    });

    setSubmitting(false);

    if (result.ok) {
      onSaved();
      onClose();
    } else {
      setErr(result.errorMessage || 'Could not save pickup info.');
    }
  };

  const handleSkip = async () => {
    if (mode !== 'complete') {
      onClose();
      return;
    }

    setSubmitting(true);
    setErr('');
    const result = await completeItemWithPickupAttribution({
      item,
      owner,
      attribution: null,
      markCompleted: true,
    });
    setSubmitting(false);

    if (result.ok) {
      onSaved();
      onClose();
    } else {
      setErr(result.errorMessage || 'Could not mark as claimed.');
    }
  };

  const currentLabel = getPickupAttributionLabel(item);

  return (
    <div className="fixed inset-0 z-[85] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card w-full max-w-lg p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup_attribution_title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 id="pickup_attribution_title" className="font-display font-bold text-app">
              {mode === 'complete' ? 'Who picked this up?' : 'Update who picked up'}
            </h4>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {mode === 'complete'
                ? `Mark "${item.title}" as ${item.type === 'trade' ? 'traded' : item.type === 'looking' ? 'fulfilled' : 'claimed'} and note where it went.`
                : currentLabel
                  ? `Currently recorded as ${currentLabel}.`
                  : 'Add who picked this up for your records.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-app hover:bg-inset"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-subtle">Off-app / other channels</p>
          <div className="grid gap-2">
            {PICKUP_CHANNEL_OPTIONS.map((option) => {
              const active = selection === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setSelection(option.type);
                    setSelectedNeighbor(null);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft text-app'
                      : 'border-app bg-inset text-muted hover:text-app'
                  }`}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>

          {selection === 'facebook_group' && (
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-subtle" htmlFor="fb_group_name">
                Facebook group name
              </label>
              <input
                id="fb_group_name"
                list="facebook_pickup_groups_datalist"
                value={facebookGroupName}
                onChange={(e) => setFacebookGroupName(e.target.value)}
                placeholder="Type or choose a group"
                className="w-full sbn-input"
              />
              <datalist id="facebook_pickup_groups_datalist">
                {facebookGroups.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          )}

          {selection === 'other' && (
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-subtle" htmlFor="other_pickup_label">
                Optional note
              </label>
              <input
                id="other_pickup_label"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder="Friend, family, curb passerby…"
                className="w-full sbn-input"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-subtle">Neighbor on the app</p>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by display name"
              className="w-full sbn-input pl-9"
            />
          </div>

          <div className="max-h-44 overflow-y-auto rounded-xl border border-app divide-y divide-app">
            {neighborList.length === 0 ? (
              <p className="text-xs text-muted p-3">
                Message interested neighbors first, or search by display name above.
              </p>
            ) : (
              neighborList.map((neighbor) => {
                const active = selection === 'neighbor' && selectedNeighbor?.userId === neighbor.userId;
                return (
                  <button
                    key={neighbor.userId}
                    type="button"
                    onClick={() => {
                      setSelection('neighbor');
                      setSelectedNeighbor(neighbor);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      active ? 'bg-accent-soft' : 'hover:bg-inset'
                    }`}
                  >
                    <UserAvatar uid={neighbor.uid} src={neighbor.photoURL} name={neighbor.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-app truncate">{neighbor.displayName}</p>
                      <p className="text-[10px] text-muted truncate">
                        {neighbor.neighborhood || 'Sacramento neighbor'}
                        {neighbor.source === 'chat' ? ' · messaged you' : neighbor.source === 'interest' ? ' · interested' : ''}
                      </p>
                    </div>
                    {active ? <Check className="w-4 h-4 text-accent shrink-0" /> : <UserRound className="w-4 h-4 text-subtle shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {mode === 'complete' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSkip()}
              className="sbn-btn sbn-btn-ghost flex-1"
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            disabled={submitting || !canConfirm}
            onClick={() => void handleConfirm()}
            className="sbn-btn sbn-btn-primary flex-1"
          >
            {mode === 'complete' ? 'Save & mark claimed' : 'Save pickup info'}
          </button>
        </div>
      </div>
    </div>
  );
}
