import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Gift, MapPin, MessageSquare, Package, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { getNeighborStats, getPublicNeighborProfile, NeighborStats, profileFromListingAuthor, setUserRole } from '../supabase';
import { ItemPost } from '../types';
import RoleBadge from './RoleBadge';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

interface NeighborProfileViewProps {
  userId: string;
  currentUserId: string;
  currentUserProfile?: UserProfile;
  listingHints?: ItemPost[];
  onClose: () => void;
  onMessage?: () => void;
}

export default function NeighborProfileView({
  userId,
  currentUserId,
  currentUserProfile,
  listingHints = [],
  onClose,
  onMessage,
}: NeighborProfileViewProps) {
  const hintListing = listingHints.find((item) => item.userId === userId);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<NeighborStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isSelf = userId === currentUserId;
  const isDirector = currentUserProfile?.role === 'director';

  const [selectedRole, setSelectedRole] = useState<UserProfile['role']>('user');
  const [roleMsg, setRoleMsg] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const localSeed: UserProfile | null =
      userId === currentUserId && currentUserProfile
        ? currentUserProfile
        : hintListing
          ? profileFromListingAuthor(userId, hintListing)
          : null;

    setProfile(localSeed);
    setLoading(true);

    (async () => {
      const [loadedProfile, loadedStats] = await Promise.all([
        getPublicNeighborProfile(userId),
        getNeighborStats(userId),
      ]);
      if (!active) return;
      const resolved = loadedProfile ?? localSeed;
      setProfile(resolved);
      setSelectedRole(resolved?.role ?? 'user');
      setStats(loadedStats);
      setLoading(false);
    })();

    const reload = debounceRealtime(() => {
      if (!active) return;
      void Promise.all([getPublicNeighborProfile(userId), getNeighborStats(userId)]).then(
        ([loadedProfile, loadedStats]) => {
          if (!active) return;
          setProfile(loadedProfile ?? localSeed);
          setStats(loadedStats);
        },
      );
    }, 250);

    const unsubItems = subscribePostgresChanges(
      { channelName: `live-profile-items-${userId}`, table: 'items', event: '*' },
      () => reload(),
    );
    const unsubVotes = subscribePostgresChanges(
      { channelName: `live-profile-votes-${userId}`, table: 'item_votes', event: '*' },
      () => reload(),
    );
    const unsubClaims = subscribePostgresChanges(
      { channelName: `live-profile-claims-${userId}`, table: 'item_claims', event: '*' },
      () => reload(),
    );

    return () => {
      active = false;
      unsubItems();
      unsubVotes();
      unsubClaims();
    };
  }, [userId, currentUserId, currentUserProfile, hintListing?.id]);

  const handleRoleSave = async () => {
    if (!profile || !selectedRole) return;
    setRoleSaving(true);
    setRoleMsg('');
    const result = await setUserRole(profile.uid, selectedRole);
    setRoleSaving(false);
    if (result.ok) {
      setProfile((prev) => prev ? { ...prev, role: selectedRole } : prev);
      setRoleMsg('Role updated successfully.');
    } else {
      setRoleMsg(result.errorMessage || 'Failed to update role.');
    }
  };

  const ROLE_OPTIONS: { value: UserProfile['role']; label: string; description: string }[] = [
    { value: 'user',      label: '🏡 Local Neighbor',        description: 'Standard community member' },
    { value: 'moderator', label: '🤝 Community Moderator',   description: 'Can help manage listings & community' },
    { value: 'admin',     label: '🛡️ Circle Admin',          description: 'Trusted admin with elevated access' },
    { value: 'director',  label: '🌻 Sunflower Director',    description: 'Full owner-level access' },
  ];

  const joinedLabel = profile?.createdAt
    ? new Date(
        typeof profile.createdAt === 'object' && 'seconds' in profile.createdAt
          ? (profile.createdAt as { seconds: number }).seconds * 1000
          : profile.createdAt,
      ).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-app overflow-y-auto"
      role="dialog"
      aria-modal="true"
      id="neighbor_profile_overlay"
    >
      <header className="sticky top-0 z-10 sbn-glass-nav px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-inset text-app"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-base text-app flex-1">Neighbor profile</h1>
        {!isSelf && onMessage && (
          <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
            <MessageSquare className="w-4 h-4" />
            Message
          </button>
        )}
      </header>

      <div className="max-w-md mx-auto p-6 pb-12">
        {loading && !profile ? (
          <p className="text-center text-sm text-muted py-16">Loading profile…</p>
        ) : !profile ? (
          <p className="text-center text-sm text-muted py-16">This neighbor profile is not available.</p>
        ) : (
          <div className="space-y-5">
            <div className="sbn-card p-6 flex flex-col items-center text-center">
              <img
                src={
                  profile.photoURL ||
                  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(profile.displayName)}`
                }
                alt=""
                className="w-24 h-24 rounded-full border-2 border-accent object-cover"
                referrerPolicy="no-referrer"
              />
              <h2 className="font-display text-xl font-bold text-app mt-4">{profile.displayName}</h2>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            {profile.bio ? (
              <div className="sbn-card p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">About</h3>
                <p className="text-sm text-app leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}

            {/* Director-only team management panel */}
            {isDirector && !isSelf && (
              <div className="sbn-card p-5 border border-amber-500/25 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
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
                          ? 'border-amber-500/50 bg-amber-500/10'
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
                        className="mt-0.5 accent-amber-500"
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
                  {roleSaving ? 'Saving…' : selectedRole === profile.role ? 'Role unchanged' : `Set as ${ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}`}
                </button>
              </div>
            )}

            <p className="text-[11px] text-subtle text-center leading-relaxed px-2">
              Email and private details are never shown. Give, claim, and fulfill counts are private totals —
              not linked to specific listings on the feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
