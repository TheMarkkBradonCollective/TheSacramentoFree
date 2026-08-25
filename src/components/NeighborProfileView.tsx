import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  ChevronUp,
  Flag,
  Gift,
  MapPin,
  MessageSquare,
  Package,
  Repeat2,
  ShieldCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  acceptMessageRequest,
  acceptFriendRequest,
  chatIdForUsers,
  declineMessageRequest,
  declineFriendRequest,
  getBlockStatus,
  getLatestFriendRequestBetween,
  getLatestMessageRequestBetween,
  getNeighborStats,
  getPublicNeighborProfile,
  NeighborStats,
  profileFromListingAuthor,
  sendFriendRequest,
  sendMessageRequest,
  setUserRole,
  unblockUser,
} from '../supabase';
import BlockNeighborModal from './BlockNeighborModal';
import ReportNeighborModal from './ReportNeighborModal';
import { ItemPost } from '../types';
import RoleBadge from './RoleBadge';
import { ASSIGNABLE_ROLE_OPTIONS, isDirectorRole, isStaffRole } from '../lib/roles';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import type { FriendRequest, MessageRequest } from '../types';
import ProfilePostList from './ProfilePostList';
import ProfileAwardsRow from './ProfileAwardsRow';
import ProfileFriendsRow from './ProfileFriendsRow';
import UserAvatar from './UserAvatar';
import { formatLastActive } from '../lib/presence';
import { useDismissOnEscape } from '../hooks/useDismissOnEscape';

interface NeighborProfileViewProps {
  userId: string;
  currentUserId: string;
  currentUserProfile?: UserProfile;
  listingHints?: ItemPost[];
  onClose: () => void;
  onOpenChat?: (chatId: string) => void;
  onViewPost?: (post: ItemPost) => void;
  onRepostPost?: (post: ItemPost) => void;
  onDeletePost?: (post: ItemPost) => void;
  onBlockListChanged?: () => void;
  onViewNeighborProfile?: (userId: string) => void;
  /** Stack above an open listing or event detail sheet. */
  nested?: boolean;
}

export default function NeighborProfileView({
  userId,
  currentUserId,
  currentUserProfile,
  listingHints = [],
  onClose,
  onOpenChat,
  onViewPost,
  onRepostPost,
  onDeletePost,
  onBlockListChanged,
  onViewNeighborProfile,
  nested = false,
}: NeighborProfileViewProps) {
  const hintListing = listingHints.find((item) => item.userId === userId);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<NeighborStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockStatus, setBlockStatus] = useState({
    isHidden: false,
    iBlockedThem: false,
    theyBlockedMe: false,
  });
  const [dmRequest, setDmRequest] = useState<MessageRequest | null>(null);
  const [friendRequest, setFriendRequest] = useState<FriendRequest | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [friendNote, setFriendNote] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [friendSending, setFriendSending] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);

  const isSelf = userId === currentUserId;
  const canManageTeamRoles =
    !isSelf && isDirectorRole(currentUserProfile?.role) && isStaffActingOfficial(currentUserProfile);

  const [selectedRole, setSelectedRole] = useState<UserProfile['role']>('user');
  const [roleMsg, setRoleMsg] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);

  const loadProfileData = async () => {
    const [status, loadedProfile, loadedStats, latestRequest, latestFriendRequest] = await Promise.all([
      getBlockStatus(currentUserId, userId),
      getPublicNeighborProfile(userId, currentUserId),
      getNeighborStats(userId),
      getLatestMessageRequestBetween(currentUserId, userId),
      getLatestFriendRequestBetween(currentUserId, userId),
    ]);

    setBlockStatus(status);
    if (status.isHidden && !status.iBlockedThem) {
      setProfile(null);
      setStats(null);
      setDmRequest(null);
      setFriendRequest(null);
      setLoading(false);
      return;
    }

    const localSeed: UserProfile | null =
      userId === currentUserId && currentUserProfile
        ? currentUserProfile
        : hintListing
          ? profileFromListingAuthor(userId, hintListing)
          : null;

    const resolved = loadedProfile ?? localSeed;
    setProfile(resolved);
    setSelectedRole(resolved?.role ?? 'user');
    setStats(loadedStats);
    setDmRequest(latestRequest);
    setFriendRequest(latestFriendRequest);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActionMsg('');
    setActionError('');

    void loadProfileData().then(() => {
      if (!active) return;
    });

    const reload = debounceRealtime(() => {
      if (active) void loadProfileData();
    }, 250);

    const unsubItems = subscribePostgresChanges(
      { channelName: `live-profile-items-${userId}`, table: 'items', event: '*' },
      () => reload(),
    );
    const unsubRequests = subscribePostgresChanges(
      { channelName: `live-dm-req-${currentUserId}-${userId}`, table: 'message_requests', event: '*' },
      () => reload(),
    );
    const unsubFriendRequests = subscribePostgresChanges(
      { channelName: `live-friend-req-${currentUserId}-${userId}`, table: 'friend_requests', event: '*' },
      () => reload(),
    );
    const unsubBlocks = subscribePostgresChanges(
      { channelName: `live-block-${currentUserId}-${userId}`, table: 'user_blocks', event: '*' },
      () => reload(),
    );

    return () => {
      active = false;
      unsubItems();
      unsubRequests();
      unsubFriendRequests();
      unsubBlocks();
    };
  }, [userId, currentUserId, currentUserProfile, hintListing?.id]);

  useDismissOnEscape(onClose);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleRoleSave = async () => {
    if (!profile || !selectedRole) return;
    setRoleSaving(true);
    setRoleMsg('');
    const result = await setUserRole(profile.uid, selectedRole, {
      actorUserId: currentUserProfile!.uid,
      actorName: currentUserProfile!.displayName,
      targetName: profile.displayName,
      previousRole: profile.role,
    });
    setRoleSaving(false);
    if (result.ok) {
      setProfile((prev) => (prev ? { ...prev, role: selectedRole } : prev));
      setRoleMsg('Role updated successfully.');
    } else {
      setRoleMsg(result.errorMessage || 'Failed to update role.');
    }
  };

  const handleSendRequest = async () => {
    if (!currentUserProfile) return;
    setRequestSending(true);
    setActionError('');
    setActionMsg('');
    const result = await sendMessageRequest({
      fromUser: currentUserProfile,
      toUserId: userId,
      message: requestNote,
    });
    setRequestSending(false);
    if (result.ok) {
      setActionMsg('Message request sent. They can accept to start chatting.');
      setRequestNote('');
      void loadProfileData();
    } else {
      setActionError(result.errorMessage || 'Could not send request.');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserProfile) return;
    setFriendSending(true);
    setActionError('');
    setActionMsg('');
    const result = await sendFriendRequest({
      fromUser: currentUserProfile,
      toUserId: userId,
      message: friendNote,
    });
    setFriendSending(false);
    if (result.ok) {
      setActionMsg('Friend request sent. They can accept to become friends.');
      setFriendNote('');
      void loadProfileData();
    } else {
      setActionError(result.errorMessage || 'Could not send friend request.');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!currentUserProfile || !friendRequest) return;
    setFriendBusy(true);
    setActionError('');
    const result = await acceptFriendRequest(friendRequest.id, currentUserProfile);
    setFriendBusy(false);
    if (result.ok) {
      setActionMsg(`You and ${profile?.displayName ?? 'this neighbor'} are now friends.`);
      void loadProfileData();
    } else {
      setActionError(result.errorMessage || 'Could not accept friend request.');
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!friendRequest) return;
    setFriendBusy(true);
    const result = await declineFriendRequest(friendRequest.id, currentUserId);
    setFriendBusy(false);
    if (result.ok) {
      setActionMsg('Friend request declined.');
      void loadProfileData();
    } else {
      setActionError(result.errorMessage || 'Could not decline friend request.');
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentUserProfile || !dmRequest) return;
    setRequestBusy(true);
    setActionError('');
    const result = await acceptMessageRequest(dmRequest.id, currentUserProfile);
    setRequestBusy(false);
    if (result.ok && result.chatId) {
      onClose();
      onOpenChat?.(result.chatId);
    } else {
      setActionError(result.errorMessage || 'Could not accept request.');
    }
  };

  const handleDeclineRequest = async () => {
    if (!dmRequest) return;
    setRequestBusy(true);
    const result = await declineMessageRequest(dmRequest.id, currentUserId);
    setRequestBusy(false);
    if (result.ok) {
      setActionMsg('Request declined.');
      void loadProfileData();
    } else {
      setActionError(result.errorMessage || 'Could not decline request.');
    }
  };

  const handleOpenExistingChat = () => {
    const chatId = chatIdForUsers(currentUserId, userId);
    onClose();
    onOpenChat?.(chatId);
  };

  const handleBlock = () => {
    if (!profile || !currentUserProfile) return;
    setShowBlockModal(true);
  };

  const handleBlocked = () => {
    setShowBlockModal(false);
    onBlockListChanged?.();
    onClose();
  };

  const handleUnblock = async () => {
    setBlockBusy(true);
    setActionError('');
    const result = await unblockUser(currentUserId, userId);
    setBlockBusy(false);
    if (result.ok) {
      setActionMsg('Neighbor unblocked.');
      onBlockListChanged?.();
      void loadProfileData();
    } else {
      setActionError(result.errorMessage || 'Could not unblock user.');
    }
  };

  const ROLE_OPTIONS = ASSIGNABLE_ROLE_OPTIONS;

  const joinedLabel = profile?.createdAt
    ? new Date(
        typeof profile.createdAt === 'object' && 'seconds' in profile.createdAt
          ? (profile.createdAt as { seconds: number }).seconds * 1000
          : profile.createdAt,
      ).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const showMessageButton = dmRequest?.status === 'accepted';
  const pendingOutgoing =
    dmRequest?.status === 'pending' && dmRequest.fromUserId === currentUserId;
  const pendingIncoming =
    dmRequest?.status === 'pending' && dmRequest.toUserId === currentUserId;
  const areFriends = friendRequest?.status === 'accepted';
  const friendPendingOutgoing =
    friendRequest?.status === 'pending' && friendRequest.fromUserId === currentUserId;
  const friendPendingIncoming =
    friendRequest?.status === 'pending' && friendRequest.toUserId === currentUserId;
  const canSendFriendRequest = !areFriends && !friendPendingOutgoing && !friendPendingIncoming;
  const neighborPosts = listingHints
    .filter((item) => item.userId === userId)
    .slice()
    .sort((a, b) => new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime());

  const panel = (
    <div
      className={`sbn-app-sheet ${nested ? 'sbn-app-sheet-nested' : ''} flex flex-col min-h-0 font-sans`}
      role="dialog"
      aria-modal="true"
      id="neighbor_profile_overlay"
    >
      <header className="shrink-0 sbn-glass-nav sbn-safe-top border-b border-app px-4 min-h-14 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-inset text-app"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-base text-app flex-1">Neighbor profile</h1>
        {!isSelf && showMessageButton && onOpenChat && (
          <button type="button" onClick={handleOpenExistingChat} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
            <MessageSquare className="w-4 h-4" />
            Message
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden sbn-safe-bottom">
      <div className="sbn-page-content pb-12">
        {loading && !profile && !blockStatus.theyBlockedMe ? (
          <p className="text-center text-sm text-muted py-16">Loading profile…</p>
        ) : blockStatus.theyBlockedMe || (blockStatus.isHidden && !blockStatus.iBlockedThem) ? (
          <div className="text-center py-16 space-y-3">
            <UserX className="w-12 h-12 text-muted mx-auto" />
            <p className="text-sm text-muted">This neighbor profile is not available.</p>
          </div>
        ) : !profile ? (
          <p className="text-center text-sm text-muted py-16">This neighbor profile is not available.</p>
        ) : (
          <div className="space-y-5">
            <div className="sbn-card p-6 flex flex-col items-center text-center">
              <UserAvatar
                uid={profile.uid}
                src={profile.photoURL}
                name={profile.displayName}
                size="xl"
                lastActiveAt={profile.lastActiveAt}
                borderClassName="border-accent"
              />
              <h2 className="font-display text-xl font-bold text-app mt-4">{profile.displayName}</h2>
              <p className="text-[11px] font-semibold text-emerald-400 mt-1">
                {formatLastActive(profile.lastActiveAt)}
              </p>
              <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-accent" />
                {profile.neighborhood}
              </p>
              {joinedLabel && (
                <p className="text-xs text-subtle mt-2">Neighbor since {joinedLabel}</p>
              )}
              {profile.role && profile.role !== 'user' && (
                <div className="mt-3">
                  <RoleBadge role={profile.role} />
                </div>
              )}

              <ProfileAwardsRow
                userId={profile.uid}
                viewerIsStaff={isStaffRole(currentUserProfile?.role)}
              />

              <ProfileFriendsRow
                userId={profile.uid}
                viewerUserId={currentUserId}
                isOwnProfile={isSelf}
                onViewProfile={onViewNeighborProfile}
              />
            </div>

            {!isSelf && !blockStatus.iBlockedThem && (
              <div className="sbn-card p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Connect</h3>

                {friendPendingIncoming && friendRequest && (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3 space-y-2">
                    <p className="text-sm font-semibold text-app">
                      {friendRequest.fromUserName} wants to be friends
                    </p>
                    {friendRequest.message && (
                      <p className="text-xs text-muted italic">&ldquo;{friendRequest.message}&rdquo;</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAcceptFriendRequest}
                        disabled={friendBusy}
                        className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={handleDeclineFriendRequest}
                        disabled={friendBusy}
                        className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {areFriends && (
                  <p className="text-xs font-semibold text-emerald-400 text-center py-1">
                    You are friends with {profile.displayName}.
                  </p>
                )}

                {canSendFriendRequest && (
                  <>
                    <p className="text-xs text-muted leading-relaxed">
                      Send a friend request to see their posts in your Friends feed and stay connected.
                    </p>
                    <textarea
                      value={friendNote}
                      onChange={(e) => setFriendNote(e.target.value)}
                      placeholder="Optional: say why you'd like to connect…"
                      className="sbn-input w-full text-sm min-h-[3.5rem] resize-y"
                      maxLength={280}
                    />
                    <button
                      type="button"
                      onClick={handleSendFriendRequest}
                      disabled={friendSending}
                      className="sbn-btn sbn-btn-secondary w-full"
                    >
                      <UserPlus className="w-4 h-4" />
                      {friendSending ? 'Sending…' : 'Send friend request'}
                    </button>
                  </>
                )}

                {friendPendingOutgoing && (
                  <p className="text-xs text-muted text-center py-1">
                    Friend request sent — waiting for {profile.displayName} to accept.
                  </p>
                )}

                {pendingIncoming && dmRequest && (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3 space-y-2">
                    <p className="text-sm font-semibold text-app">
                      {dmRequest.fromUserName} wants to message you
                    </p>
                    {dmRequest.message && (
                      <p className="text-xs text-muted italic">&ldquo;{dmRequest.message}&rdquo;</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAcceptRequest}
                        disabled={requestBusy}
                        className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={handleDeclineRequest}
                        disabled={requestBusy}
                        className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {showMessageButton && (
                  <button type="button" onClick={handleOpenExistingChat} className="sbn-btn sbn-btn-primary w-full">
                    <MessageSquare className="w-4 h-4" />
                    Open messages
                  </button>
                )}

                {!showMessageButton && !pendingIncoming && !pendingOutgoing && (
                  <>
                    <p className="text-xs text-muted leading-relaxed">
                      Send a message request. They choose whether to start a private chat.
                    </p>
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      placeholder="Optional: say hello or mention what you're reaching out about…"
                      className="sbn-input w-full text-sm min-h-[4.5rem] resize-y"
                      maxLength={280}
                    />
                    <button
                      type="button"
                      onClick={handleSendRequest}
                      disabled={requestSending}
                      className="sbn-btn sbn-btn-primary w-full"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {requestSending ? 'Sending…' : 'Request to message'}
                    </button>
                  </>
                )}

                {pendingOutgoing && (
                  <p className="text-xs text-muted text-center py-2">
                    Message request sent — waiting for {profile.displayName} to accept.
                  </p>
                )}

                {actionMsg && <p className="text-xs text-emerald-400 font-semibold">{actionMsg}</p>}
                {actionError && <p className="text-xs text-red-400 font-semibold">{actionError}</p>}
              </div>
            )}

            {!isSelf && currentUserProfile && (
              <div className="sbn-card p-4 space-y-2">
                {blockStatus.iBlockedThem ? (
                  <button
                    type="button"
                    onClick={handleUnblock}
                    disabled={blockBusy}
                    className="sbn-btn sbn-btn-secondary w-full text-sm"
                  >
                    Unblock {profile.displayName}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-app text-app text-sm font-semibold hover:bg-inset transition-colors"
                    >
                      <Flag className="w-4 h-4 text-red-400" />
                      Report neighbor
                    </button>
                    <button
                      type="button"
                      onClick={handleBlock}
                      disabled={blockBusy}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-900/50 text-red-400 text-sm font-semibold hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      Block neighbor
                    </button>
                    <p className="text-[10px] text-muted leading-snug text-center">
                      Reports go to staff for review. Blocking requires a reason and hides you from each other.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="sbn-card p-4 text-center">
                  <Gift className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-app">{stats?.itemsGiven ?? 0}</p>
                  <p className="text-xs text-muted mt-0.5">Items given</p>
                </div>
                <div className="sbn-card p-4 text-center">
                  <Package className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-app">{stats?.itemsClaimed ?? 0}</p>
                  <p className="text-xs text-muted mt-0.5">Items claimed</p>
                </div>
                <div className="sbn-card p-4 text-center">
                  <Repeat2 className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-app">{stats?.tradesCompleted ?? 0}</p>
                  <p className="text-xs text-muted mt-0.5">Trades</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="sbn-card p-4 text-center">
                  <ChevronUp className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-app">{stats?.upvotesReceived ?? 0}</p>
                  <p className="text-xs text-muted mt-0.5">Upvotes received</p>
                </div>
                <div className="sbn-card p-4 text-center">
                  <ChevronDown className="w-6 h-6 text-muted mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-app">{stats?.downvotesReceived ?? 0}</p>
                  <p className="text-xs text-muted mt-0.5">Downvotes received</p>
                </div>
              </div>
            </div>

            {profile.bio ? (
              <div className="sbn-card p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">About</h3>
                <p className="text-sm text-app leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}

            <div className="sbn-card p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {isSelf ? 'Your posts' : `${profile.displayName}'s posts`}
                </h3>
                <span className="text-xs text-muted">{neighborPosts.length}</span>
              </div>
              <ProfilePostList
                posts={neighborPosts}
                emptyMessage="No posts to show."
                onViewPost={onViewPost}
                onRepostPost={isSelf ? onRepostPost : undefined}
                onDeletePost={isSelf ? onDeletePost : undefined}
              />
            </div>

            {canManageTeamRoles && (
              <div className="sbn-card p-5 border border-accent/25 bg-accent/5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                  <h3 className="text-xs font-bold text-accent uppercase tracking-widest">
                    Team Management
                  </h3>
                </div>

                <p className="text-xs text-muted mb-3 leading-relaxed">
                  Set {profile.displayName}'s role. Changes take effect immediately.
                </p>

                <div className="space-y-2 mb-4">
                  {ROLE_OPTIONS.map(({ value, label, description }) => (
                    <label
                      key={value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedRole === value
                          ? 'border-accent/50 bg-accent/10'
                          : 'border-app hover:border-app/60 hover:bg-inset'
                      }`}
                    >
                      <input
                        type="radio"
                        name="neighbor_role"
                        value={value}
                        checked={selectedRole === value}
                        onChange={() => {
                          setSelectedRole(value);
                          setRoleMsg('');
                        }}
                        className="mt-0.5 accent-accent"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-app">{label}</p>
                        <p className="text-xs text-muted mt-0.5">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {roleMsg && (
                  <p className={`text-xs font-semibold mb-3 ${roleMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {roleMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleRoleSave}
                  disabled={roleSaving || selectedRole === profile.role}
                  className="sbn-btn sbn-btn-primary sbn-btn-sm w-full disabled:opacity-50"
                >
                  {roleSaving ? 'Saving…' : selectedRole === profile.role ? 'Role unchanged' : `Set as ${ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}`}
                </button>
              </div>
            )}

            <p className="text-[11px] text-subtle text-center leading-relaxed px-2">
              Email and private details are never shown. Give, claim, and fulfill counts are private totals —
              not linked to specific listings in Stuff.
            </p>
          </div>
        )}
      </div>

      {showBlockModal && profile && currentUserProfile && (
        <BlockNeighborModal
          blocker={currentUserProfile}
          blockedUserId={userId}
          blockedUserName={profile.displayName}
          onClose={() => setShowBlockModal(false)}
          onBlocked={handleBlocked}
        />
      )}

      {showReportModal && currentUserProfile && profile && (
        <ReportNeighborModal
          reporter={currentUserProfile}
          reportedUserId={userId}
          reportedUserName={profile.displayName}
          onClose={() => setShowReportModal(false)}
          onSubmitted={() => {
            setShowReportModal(false);
            setActionMsg('Report sent to staff for review.');
          }}
        />
      )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
