import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, UserRound, X } from 'lucide-react';
import { UserProfile } from '../types';
import type { MessageRequest } from '../types';
import {
  chatIdForUsers,
  getLatestMessageRequestBetween,
  searchPickupNeighbors,
  sendMessageRequest,
} from '../supabase';
import type { PickupNeighborCandidate } from '../lib/pickupAttribution';
import { normalizeUserRole, roleListLabel, roleTheme } from '../lib/roles';
import UserAvatar from './UserAvatar';

function NeighborRoleLine({ role }: { role?: UserProfile['role'] }) {
  const normalized = normalizeUserRole(role);
  const label = roleListLabel(role);
  const theme = roleTheme(role);

  return (
    <p
      className={`text-[10px] font-semibold truncate ${normalized === 'user' ? 'text-muted' : ''}`}
      style={normalized === 'user' ? undefined : { color: theme.accent }}
    >
      {label}
    </p>
  );
}

interface DirectMessageRequestModalProps {
  currentUser: UserProfile;
  blockedUserIds: Set<string>;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onOpenChat: (chatId: string) => void;
}

export default function DirectMessageRequestModal({
  currentUser,
  blockedUserIds,
  onClose,
  onViewProfile,
  onOpenChat,
}: DirectMessageRequestModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PickupNeighborCandidate[]>([]);
  const [selectedNeighbor, setSelectedNeighbor] = useState<PickupNeighborCandidate | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [dmRequest, setDmRequest] = useState<MessageRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchPickupNeighbors(query, currentUser.uid).then((results) => {
        setSearchResults(results.filter((neighbor) => !blockedUserIds.has(neighbor.userId)));
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery, currentUser.uid, blockedUserIds]);

  useEffect(() => {
    if (!selectedNeighbor) {
      setDmRequest(null);
      return;
    }

    let active = true;
    setLoadingRequest(true);
    setErr('');
    setSuccessMsg('');

    void getLatestMessageRequestBetween(currentUser.uid, selectedNeighbor.userId).then((request) => {
      if (!active) return;
      setDmRequest(request);
      setLoadingRequest(false);
    });

    return () => {
      active = false;
    };
  }, [selectedNeighbor, currentUser.uid]);

  const neighborList = useMemo(() => searchResults, [searchResults]);

  const pendingOutgoing =
    dmRequest?.status === 'pending' && dmRequest.fromUserId === currentUser.uid;
  const canMessage = dmRequest?.status === 'accepted';
  const canRequest = !dmRequest || dmRequest.status === 'declined';

  const handleSendRequest = async () => {
    if (!selectedNeighbor) return;
    setSubmitting(true);
    setErr('');
    setSuccessMsg('');

    const result = await sendMessageRequest({
      fromUser: currentUser,
      toUserId: selectedNeighbor.userId,
      message: requestNote,
    });

    setSubmitting(false);

    if (result.ok) {
      setSuccessMsg(`Message request sent to ${selectedNeighbor.displayName}.`);
      setRequestNote('');
      const updated = await getLatestMessageRequestBetween(currentUser.uid, selectedNeighbor.userId);
      setDmRequest(updated);
    } else {
      setErr(result.errorMessage || 'Could not send request.');
    }
  };

  const handleOpenChat = () => {
    if (!selectedNeighbor) return;
    onOpenChat(chatIdForUsers(currentUser.uid, selectedNeighbor.userId));
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card w-full max-w-lg p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="direct_message_request_title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 id="direct_message_request_title" className="font-display font-bold text-app flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              Compose message
            </h4>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Search by display name, pick a neighbor, then send a message request. Role labels help you spot staff members.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-app hover:bg-inset shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedNeighbor(null);
              setErr('');
              setSuccessMsg('');
            }}
            placeholder="Search by display name"
            className="w-full sbn-input pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-44 overflow-y-auto rounded-xl border border-app divide-y divide-app">
          {searchQuery.trim().length < 2 ? (
            <p className="text-xs text-muted p-3">Type at least two letters to search neighbors.</p>
          ) : neighborList.length === 0 ? (
            <p className="text-xs text-muted p-3">No neighbors matched that name.</p>
          ) : (
            neighborList.map((neighbor) => {
              const active = selectedNeighbor?.userId === neighbor.userId;
              return (
                <button
                  key={neighbor.userId}
                  type="button"
                  onClick={() => {
                    setSelectedNeighbor(neighbor);
                    setErr('');
                    setSuccessMsg('');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-accent-soft' : 'hover:bg-inset'
                  }`}
                >
                  <UserAvatar uid={neighbor.uid} src={neighbor.photoURL} name={neighbor.displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-app truncate">{neighbor.displayName}</p>
                    <NeighborRoleLine role={neighbor.role} />
                    <p className="text-[10px] text-subtle truncate">
                      {neighbor.neighborhood || 'Sacramento neighbor'}
                    </p>
                  </div>
                  <UserRound className={`w-4 h-4 shrink-0 ${active ? 'text-accent' : 'text-subtle'}`} />
                </button>
              );
            })
          )}
        </div>

        {selectedNeighbor && (
          <div className="rounded-xl border border-app bg-inset/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar uid={selectedNeighbor.uid} src={selectedNeighbor.photoURL} name={selectedNeighbor.displayName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-app truncate">{selectedNeighbor.displayName}</p>
                <NeighborRoleLine role={selectedNeighbor.role} />
                <button
                  type="button"
                  onClick={() => onViewProfile(selectedNeighbor.userId)}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  View profile
                </button>
              </div>
            </div>

            {loadingRequest ? (
              <p className="text-xs text-muted">Checking message status…</p>
            ) : canMessage ? (
              <button type="button" onClick={handleOpenChat} className="sbn-btn sbn-btn-primary w-full">
                <MessageSquare className="w-4 h-4" />
                Open messages
              </button>
            ) : pendingOutgoing ? (
              <p className="text-xs text-muted text-center py-1">
                Message request sent — waiting for {selectedNeighbor.displayName} to accept.
              </p>
            ) : canRequest ? (
              <>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Optional: say hello or mention what you're reaching out about…"
                  className="sbn-input w-full text-sm min-h-[4.5rem] resize-y"
                  maxLength={280}
                />
                <button
                  type="button"
                  onClick={() => void handleSendRequest()}
                  disabled={submitting}
                  className="sbn-btn sbn-btn-primary w-full"
                >
                  <MessageSquare className="w-4 h-4" />
                  {submitting ? 'Sending…' : 'Request to message'}
                </button>
              </>
            ) : (
              <p className="text-xs text-muted text-center py-1">
                View their profile to respond to their message request.
              </p>
            )}
          </div>
        )}

        {successMsg && <p className="text-xs font-semibold text-emerald-400">{successMsg}</p>}
        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

        <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary w-full">
          Done
        </button>
      </div>
    </div>
  );
}
