import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Gift, MapPin, MessageSquare, Package } from 'lucide-react';
import { UserProfile } from '../types';
import { getNeighborStats, getSupabaseProfile, NeighborStats } from '../supabase';

interface NeighborProfileViewProps {
  userId: string;
  currentUserId: string;
  onClose: () => void;
  onMessage?: () => void;
}

export default function NeighborProfileView({
  userId,
  currentUserId,
  onClose,
  onMessage,
}: NeighborProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<NeighborStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isSelf = userId === currentUserId;

  useEffect(() => {
    let active = true;
    setLoading(true);

    (async () => {
      const [loadedProfile, loadedStats] = await Promise.all([
        getSupabaseProfile(userId),
        getNeighborStats(userId),
      ]);
      if (!active) return;
      setProfile(loadedProfile);
      setStats(loadedStats);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

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
        {loading ? (
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

            <p className="text-[11px] text-subtle text-center leading-relaxed px-2">
              Email and private details are never shown. Claimed items are only counted here — not linked to
              specific listings on the feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
