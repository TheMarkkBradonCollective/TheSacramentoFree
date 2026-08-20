import { createClient } from '@supabase/supabase-js';
import { UserProfile, ItemPost, Chat, Message, ItemVote, ItemComment, MessageRequest, FriendRequest, ProfileFriend, AccountStatus, ModerationAuditEntry, StaffUserRow, UserReport, SupportTicket, SupportTicketMessage, ListingSubItem, ItemClaimRequest, CommunityEvent, EventRsvp, EventComment, DirectorMessageContent, StaffMessageContent, AppReview, AppUpdateInput, AppUpdateRecord, AppUpdateComment, CommunityContentVote, CommunityContentVoteTarget, HelpAnnouncementComment, HelpAnnouncementInput, HelpAnnouncementRecord, UserNotificationItem } from './types';
import { DIRECTOR_MESSAGE, STAFF_MESSAGE_DEFAULT } from './siteContent';
import { compressImageIfNeeded, guessImageContentType } from './lib/imageUrl';
import { formatItemClaimedChatMessage, formatItemFulfilledChatMessage, formatSelfClaimRequestMessage, formatSelfDropOffRequestMessage } from './lib/claims';
import { blockReasonLabel } from './lib/blockReasons';
import { normalizeItemMedia, plainListingDescription } from './lib/listingContent';
import { CHANGELOG_AUTHOR_UID } from '../shared/changelogAuthor';
import { listingExpiresAtIso } from '../shared/listingExpiry';
import { mergeByIdNewestFirst, SEEDED_APP_UPDATES, SEEDED_HELP_ANNOUNCEMENTS } from '../shared/changelogSeed';
import { filterNews, filterUpdates } from '../shared/changelogFilters';
import { CLIENT_PUSH_DISPATCH_ENABLED } from './lib/pushConfig';
import type { AppPreferences, PickupAvailabilitySchedule } from './types';
import { normalizeGoGetRingDuration, normalizeGoGetRingPattern } from './lib/goGetRing';
import { normalizePickupAvailability } from './lib/pickupAvailability';
import { mergeGoGetPrefsIntoProfile } from './lib/goGetPrefs';
import { mergeNavigationPrefsIntoProfile } from './lib/navPrefs';
import { normalizeNavigationSettings, type NavigationSettings } from './lib/navigationSettings';
import { normalizeAppPreferences } from './lib/appPreferences';
import type { PickupAttributionInput, PickupNeighborCandidate } from './lib/pickupAttribution';
import { getEventsUnlockStatus } from './lib/eventsApi';
import {
  EVENT_PAST_GRACE_MS,
  isEventEditable,
  normalizeStoredEventStatus,
  resolveEventStatus,
} from './lib/eventRsvp';
import {
  VOTE_COOLDOWN_MAX_NEW_VOTES,
  VOTE_COOLDOWN_WINDOW_MS,
} from './lib/voteCooldown';
import { normalizeUserRole, type UserRole, canDeleteChatMessage, canDeleteDirectChat, canDeleteSupportTicket, canEditAnnouncement, canEditOwnStaffMessage, canUnsendSupportTicketMessage, isDirectorRole, isEventPostChatReadOnly, isListingOpenForCoordination, isListingPostChatReadOnly, canManageAppUpdates, canPostAnnouncements, canStaffBan, canStaffDeleteAccount, canStaffEditUser, canStaffSuspend, canViewAuditLog, canViewerAccessTicket, isStaffRole, minStaffRankForTicket, roleLabel, roleRank, ROLE_RANK, STAFF_ROLE_SLOTS, staffRoleSlotMessage } from './lib/roles';
import {
  deriveApplicantStaffApplyState,
  isStaffApplyRole,
  isStaffApplySeatFilled,
  parseStaffApplySeatCounts,
  staffApplicationDecisionNotice,
  type ApplicantStaffApplyState,
  type StaffApplication,
  type StaffApplicationDecision,
  type StaffApplyRole,
  type StaffApplySeatCounts,
} from './lib/staffApplications';
import { notifyAccountUpdate } from './lib/pushEvents';

// Read values from environment or fall back to the provided strings.
const metaEnv = (import.meta as any).env || {};
const supabaseUrl =
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const supabaseKey =
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Set them in your environment before building.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseKey || 'invalid-key',
);

import {
  GLOBAL_COMMUNITY_CHAT_ID,
  STAFF_COMMUNITY_CHAT_ID,
  buildGlobalCommunityChatRow,
  buildStaffCommunityChatRow,
  isCommunityChat,
  isGlobalCommunityChat,
  isStaffCommunityChat,
  sortChatsForInbox,
} from './lib/communityChats';

async function runPushTask(task: () => Promise<unknown>): Promise<void> {
  if (!CLIENT_PUSH_DISPATCH_ENABLED) return;
  try {
    await task();
  } catch (err) {
    console.warn('[push]', err);
  }
}

// SQL Setup script to help users prepare their Supabase PostgreSQL database
export const SQL_SETUP_SCRIPT = `-- =========================================================
-- SACRAMENTO BUY_NOTHING SUPABASE SCHEMAS
-- Copy and paste this script into your Supabase SQL Editor
-- =========================================================

-- 1. Create Users profiles
CREATE TABLE IF NOT EXISTS public.users (
  uid TEXT PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "photoURL" TEXT,
  email TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- user | city_moderator | city_administrator | city_manager | director
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable select policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert and update" ON public.users;
CREATE POLICY "Allow insert and update" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 2. Create Items listings
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userDisplayName" TEXT NOT NULL,
  "userPhotoURL" TEXT,
  neighborhood TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read items" ON public.items;
CREATE POLICY "Allow public read items" ON public.items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write operations" ON public.items;
CREATE POLICY "Allow write operations" ON public.items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- 3. Create Chats metadata
CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY,
  "participantIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "participantNames" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "participantPhotos" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "lastMessageText" TEXT,
  "lastMessageAt" TIMESTAMPTZ DEFAULT NOW(),
  "lastMessageSenderId" TEXT,
  "itemId" TEXT,
  "itemTitle" TEXT
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read chats" ON public.chats;
CREATE POLICY "Allow public read chats" ON public.chats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write chats" ON public.chats;
CREATE POLICY "Allow write chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

-- 4. Create chat Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read messages" ON public.messages;
CREATE POLICY "Allow public read messages" ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;
CREATE POLICY "Allow insert messages" ON public.messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow edit or update" ON public.messages;
CREATE POLICY "Allow edit or update" ON public.messages FOR ALL USING (true);

-- 5. Create item votes
CREATE TABLE IF NOT EXISTS public.item_votes (
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voteType" TEXT NOT NULL CHECK ("voteType" IN ('up', 'down')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("itemId", "userId")
);

ALTER TABLE public.item_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read item votes" ON public.item_votes;
CREATE POLICY "Allow read item votes" ON public.item_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write item votes" ON public.item_votes;
CREATE POLICY "Allow write item votes" ON public.item_votes FOR ALL USING (true);

-- 6. Create item comments
CREATE TABLE IF NOT EXISTS public.item_comments (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read item comments" ON public.item_comments;
CREATE POLICY "Allow read item comments" ON public.item_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write item comments" ON public.item_comments;
CREATE POLICY "Allow write item comments" ON public.item_comments FOR ALL USING (true);

-- 7. Community events (free gatherings only)
CREATE TABLE IF NOT EXISTS public.community_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  "eventStartAt" TIMESTAMPTZ NOT NULL,
  "eventEndAt" TIMESTAMPTZ,
  "userId" TEXT NOT NULL,
  "userDisplayName" TEXT NOT NULL,
  "userPhotoURL" TEXT,
  "hostedBy" TEXT,
  "locationLat" DOUBLE PRECISION,
  "locationLng" DOUBLE PRECISION,
  "isFree" BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "seriesId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "seriesId" TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "hostedBy" TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_free_only;
ALTER TABLE public.community_events ADD CONSTRAINT community_events_free_only CHECK ("isFree" = true);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read community events" ON public.community_events;
CREATE POLICY "Allow read community events" ON public.community_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write community events" ON public.community_events;
CREATE POLICY "Allow write community events" ON public.community_events FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rsvpStatus" TEXT NOT NULL CHECK ("rsvpStatus" IN ('going', 'maybe', 'not_going', 'gone', 'missed')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("eventId", "userId")
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read event rsvps" ON public.event_rsvps;
CREATE POLICY "Allow read event rsvps" ON public.event_rsvps FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write event rsvps" ON public.event_rsvps;
CREATE POLICY "Allow write event rsvps" ON public.event_rsvps FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.event_comments (
  id TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read event comments" ON public.event_comments;
CREATE POLICY "Allow read event comments" ON public.event_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write event comments" ON public.event_comments;
CREATE POLICY "Allow write event comments" ON public.event_comments FOR ALL USING (true);
`;

// Helper states to track connection warnings on UI
let isSupabaseConfigured = true;
let connectionErrorDetails: string | null = null;
let listeners: Array<(state: { isConfigured: boolean; error: string | null }) => void> = [];

export function subscribeToSupabaseState(callback: (state: { isConfigured: boolean; error: string | null }) => void) {
  listeners.push(callback);
  callback({ isConfigured: isSupabaseConfigured, error: connectionErrorDetails });
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners() {
  const state = { isConfigured: isSupabaseConfigured, error: connectionErrorDetails };
  listeners.forEach(callback => callback(state));
}

export function setSupabaseConfigurationState(working: boolean, error?: string) {
  isSupabaseConfigured = working;
  connectionErrorDetails = error || null;
  notifyListeners();
}

export function getSupabaseConfigurationState() {
  return {
    isConfigured: isSupabaseConfigured,
    error: connectionErrorDetails
  };
}

// Intercepts connection/table errors and updates active state dynamically
export function handleSupabaseError(err: any, tableName: string) {
  const m = String(err?.message || err || '').toLowerCase();
  if (m.includes('failed to fetch') || m.includes('fetch') || m.includes('networkerror') || m.includes('unreachable') || m.includes('load failed')) {
    setSupabaseConfigurationState(false, 'Supabase connection offline (Failed to Fetch). A browser privacy extension or firewall might be blocking requests. Full offline local-fallback is actively managing your session.');
  } else if (err?.code === '42P01') {
    setSupabaseConfigurationState(false, `Table "${tableName}" is missing in Supabase. Run SQL Setup Script in your console to build it.`);
  } else {
    setSupabaseConfigurationState(false, err?.message || 'Database transaction warning.');
  }
}

/** Accept ISO strings, epoch ms, Date, or legacy { seconds } timestamps. */
export function coerceToIsoDate(value: unknown): string {
  if (value == null || value === '') {
    return new Date().toISOString();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds: number }).seconds);
    if (!Number.isNaN(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

/** Only persist remote URLs — never multi-MB data URLs in Postgres. */
function sanitizePhotoUrlForDb(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return null;
}

function normalizeAccountStatus(
  row: Record<string, unknown>,
): { accountStatus: AccountStatus; suspendedUntil: string | null } {
  let accountStatus = (String(row.accountStatus ?? row.account_status ?? 'active') ||
    'active') as AccountStatus;
  let suspendedUntil =
    typeof row.suspendedUntil === 'string'
      ? row.suspendedUntil
      : typeof row.suspended_until === 'string'
        ? row.suspended_until
        : null;

  if (accountStatus === 'suspended' && suspendedUntil) {
    if (new Date(suspendedUntil).getTime() <= Date.now()) {
      accountStatus = 'active';
      suspendedUntil = null;
      void supabase
        .from('users')
        .update({ accountStatus: 'active', suspendedUntil: null })
        .eq('uid', String(row.uid ?? ''));
    }
  }

  if (
    accountStatus !== 'active' &&
    accountStatus !== 'suspended' &&
    accountStatus !== 'banned' &&
    accountStatus !== 'locked'
  ) {
    accountStatus = 'active';
  }

  return { accountStatus, suspendedUntil };
}

function parsePickupAvailabilityColumn(raw: unknown): PickupAvailabilitySchedule | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return normalizePickupAvailability(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }
  return normalizePickupAvailability(raw);
}

function normalizeUserProfileRow(row: Record<string, unknown> | null): UserProfile | null {
  if (!row) return null;
  const uid = String(row.uid ?? '');
  if (!uid) return null;

  const photoRaw =
    row.photoURL ?? row.photo_url ?? row.photourl ?? row['photoURL'] ?? null;
  const photoURL =
    typeof photoRaw === 'string' && photoRaw.trim() ? sanitizePhotoUrlForDb(photoRaw) : undefined;

  const { accountStatus, suspendedUntil } = normalizeAccountStatus(row);

  return {
    uid,
    displayName: String(row.displayName ?? row.display_name ?? 'Neighbor'),
    photoURL: photoURL ?? undefined,
    email: String(row.email ?? ''),
    neighborhood: String(row.neighborhood ?? 'Sacramento'),
    bio: typeof row.bio === 'string' ? row.bio : undefined,
    role: normalizeUserRole(row.role),
    accountStatus,
    suspendedUntil,
    // Default off until neighbor opts in explicitly.
    goGetEnabled: row.goGetEnabled === true || row.go_get_enabled === true,
    pickupAvailability: parsePickupAvailabilityColumn(row.pickupAvailability ?? row.pickup_availability),
    goGetRingDurationSeconds: normalizeGoGetRingDuration(
      row.goGetRingDurationSeconds ?? row.go_get_ring_duration_seconds,
    ),
    goGetRingPattern: normalizeGoGetRingPattern(row.goGetRingPattern ?? row.go_get_ring_pattern),
    navigationSettings: normalizeNavigationSettings(
      row.navigationSettings ?? row.navigation_settings,
    ),
    appPreferences: normalizeAppPreferences(row.appPreferences ?? row.app_preferences),
    staffInteractionMode:
      row.staffInteractionMode === 'neighbor' || row.staff_interaction_mode === 'neighbor'
        ? 'neighbor'
        : 'staff',
    joinRank:
      typeof row.joinRank === 'number'
        ? row.joinRank
        : typeof row.join_rank === 'number'
          ? row.join_rank
          : null,
    createdAt: row.createdAt ?? row.created_at,
    lastActiveAt:
      typeof row.lastActiveAt === 'string'
        ? row.lastActiveAt
        : typeof row.last_active_at === 'string'
          ? row.last_active_at
          : null,
  };
}

/** Push avatar URL onto listings, comments, and chat headers so neighbors see the latest photo. */
export async function syncProfilePhotoAcrossApp(
  uid: string,
  photoURL: string | null,
  displayName?: string,
): Promise<void> {
  const safePhoto = sanitizePhotoUrlForDb(photoURL);
  const trimmedName = displayName?.trim();

  try {
    const listingPatch: Record<string, string | null> = { userPhotoURL: safePhoto };
    if (trimmedName) listingPatch.userDisplayName = trimmedName;
    await supabase.from('items').update(listingPatch).eq('userId', uid);

    const eventPatch: Record<string, string | null> = { userPhotoURL: safePhoto };
    if (trimmedName) eventPatch.userDisplayName = trimmedName;
    await supabase.from('events').update(eventPatch).eq('userId', uid);

    const feedPatch: Record<string, string | null> = { userPhotoURL: safePhoto };
    if (trimmedName) feedPatch.userDisplayName = trimmedName;
    await supabase.from('feed_posts').update(feedPatch).eq('userId', uid);

    const commentPhotoPatch = { userPhoto: safePhoto };
    await Promise.all([
      supabase.from('item_comments').update(commentPhotoPatch).eq('userId', uid),
      supabase.from('event_comments').update(commentPhotoPatch).eq('userId', uid),
      supabase.from('feed_post_comments').update(commentPhotoPatch).eq('userId', uid),
      supabase.from('app_reviews').update(commentPhotoPatch).eq('userId', uid),
      supabase.from('app_update_comments').update(commentPhotoPatch).eq('userId', uid),
      supabase.from('help_announcement_comments').update(commentPhotoPatch).eq('userId', uid),
    ]);

    await supabase.from('message_requests').update({ fromUserPhoto: safePhoto }).eq('fromUserId', uid);

    const { data: chats } = await supabase.from('chats').select('id, participantIds, participantPhotos');
    for (const chat of chats ?? []) {
      const ids = Array.isArray(chat.participantIds) ? chat.participantIds : [];
      if (!ids.includes(uid)) continue;
      const photos = {
        ...((chat.participantPhotos ?? {}) as Record<string, string>),
        [uid]: safePhoto ?? '',
      };
      await supabase.from('chats').update({ participantPhotos: photos }).eq('id', chat.id);
    }
  } catch (err) {
    console.warn('syncProfilePhotoAcrossApp failed (profile row may still be saved):', err);
  }
}

/**
 * --- PROFILES ---
 */

function normalizeAppUpdatePostedByUserId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'director') {
    return CHANGELOG_AUTHOR_UID;
  }
  return trimmed;
}

async function getDirectorDisplayName(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('displayName')
      .eq('role', 'director')
      .limit(1)
      .maybeSingle();
    if (error || !data) return DIRECTOR_MESSAGE.name;
    return String((data as { displayName?: string }).displayName || '').trim() || DIRECTOR_MESSAGE.name;
  } catch {
    return DIRECTOR_MESSAGE.name;
  }
}

async function assertStaffRoleSlotAvailable(
  targetUserId: string,
  role: UserRole,
): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const limit = STAFF_ROLE_SLOTS[role];
  if (limit === undefined) return { ok: true };

  const { count, error } = await supabase
    .from('users')
    .select('uid', { count: 'exact', head: true })
    .eq('role', role)
    .neq('uid', targetUserId);

  if (error) {
    return { ok: false, errorMessage: error.message || 'Could not verify role limits.' };
  }
  if ((count ?? 0) >= limit) {
    return { ok: false, errorMessage: staffRoleSlotMessage(role, limit) };
  }
  return { ok: true };
}

/** Instant profile from Supabase auth — never blocks on the database. */
export function profileFromAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  const email = user.email?.trim() || '';
  const meta = user.user_metadata ?? {};
  const providerPhoto =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : undefined;
  const photoURL =
    providerPhoto && sanitizePhotoUrlForDb(providerPhoto)
      ? sanitizePhotoUrlForDb(providerPhoto)!
      : `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.id)}`;

  return {
    uid: user.id,
    displayName: String(meta.displayName || email.split('@')[0] || 'Sacramento Neighbor'),
    photoURL,
    email: email || 'neighbor@sacramentobuynothing.org',
    neighborhood: String(meta.neighborhood || 'Midtown'),
    bio: typeof meta.bio === 'string' ? meta.bio : undefined,
    createdAt: new Date().toISOString(),
    role: 'user',
  };
}

export async function getSupabaseProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUid = sessionData.session?.user?.id || '';
    const table = currentUid && currentUid === uid ? 'users' : 'users_public';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('uid', uid)
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, 'users');
      return null;
    }
    
    setSupabaseConfigurationState(true);
    return normalizeUserProfileRow(data as Record<string, unknown>);
  } catch (err: any) {
    console.warn('Supabase profile fetch failed:', err);
    handleSupabaseError(err, 'users');
    return null;
  }
}

function listingRowToProfile(uid: string, row: Record<string, unknown>): UserProfile {
  return {
    uid,
    displayName: String(row.userDisplayName || 'Neighbor'),
    photoURL: row.userPhotoURL ? String(row.userPhotoURL) : undefined,
    email: '',
    neighborhood: String(row.neighborhood || 'Sacramento'),
    bio: undefined,
    role: 'user',
    goGetEnabled: false,
    createdAt: row.createdAt,
  };
}

async function buildProfileFromLatestListing(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('items')
    .select('userId, userDisplayName, userPhotoURL, neighborhood, createdAt')
    .eq('userId', uid)
    .order('createdAt', { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  return listingRowToProfile(uid, data[0] as Record<string, unknown>);
}

async function buildProfileFromLatestComment(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('item_comments')
    .select('userId, userName, userPhoto, userNeighborhood, createdAt')
    .eq('userId', uid)
    .order('createdAt', { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;
  const row = data[0] as Record<string, unknown>;
  return {
    uid,
    displayName: String(row.userName || 'Neighbor'),
    photoURL: row.userPhoto ? String(row.userPhoto) : undefined,
    email: '',
    neighborhood: String(row.userNeighborhood || 'Sacramento'),
    bio: undefined,
    role: 'user',
    createdAt: row.createdAt,
  };
}

async function buildProfileFromChats(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('chats').select('participantIds, participantNames, participantPhotos');

  if (error || !data?.length) return null;

  for (const chat of data) {
    const ids = Array.isArray(chat.participantIds) ? chat.participantIds : [];
    if (!ids.includes(uid)) continue;

    const names = (chat.participantNames ?? {}) as Record<string, string>;
    const photos = (chat.participantPhotos ?? {}) as Record<string, string>;

    return {
      uid,
      displayName: names[uid] || 'Neighbor',
      photoURL: photos[uid],
      email: '',
      neighborhood: 'Sacramento',
      bio: undefined,
      role: 'user',
      createdAt: undefined,
    };
  }

  return null;
}

/** Public neighbor card — users table first, then listings, comments, or chat metadata. */
export async function getPublicNeighborProfile(
  uid: string,
  viewerId?: string,
): Promise<UserProfile | null> {
  if (viewerId && viewerId !== uid) {
    const hidden = await areUsersBlocked(viewerId, uid);
    if (hidden) return null;
  }

  const fromUsers = await getSupabaseProfile(uid);
  if (fromUsers) return fromUsers;

  const fromListing = await buildProfileFromLatestListing(uid);
  if (fromListing) return fromListing;

  const fromComment = await buildProfileFromLatestComment(uid);
  if (fromComment) return fromComment;

  return buildProfileFromChats(uid);
}

export function profileFromListingAuthor(
  uid: string,
  listing: Pick<ItemPost, 'userDisplayName' | 'userPhotoURL' | 'neighborhood' | 'createdAt'>,
): UserProfile {
  return {
    uid,
    displayName: listing.userDisplayName || 'Neighbor',
    photoURL: listing.userPhotoURL,
    email: '',
    neighborhood: listing.neighborhood || 'Sacramento',
    bio: undefined,
    role: 'user',
    createdAt: listing.createdAt,
  };
}

export async function upsertSupabaseProfile(
  profile: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const email = profile.email?.trim();
    if (!email) {
      return { ok: false, errorMessage: 'Profile email is missing. Sign out and sign in again.' };
    }

    const photoURL = sanitizePhotoUrlForDb(profile.photoURL);
    const profileForSave = mergeNavigationPrefsIntoProfile(mergeGoGetPrefsIntoProfile(profile));

    const payload = {
      uid: profileForSave.uid,
      displayName: profileForSave.displayName.trim(),
      photoURL,
      email,
      neighborhood: profileForSave.neighborhood,
      bio: profileForSave.bio?.trim() || null,
      goGetEnabled: profileForSave.goGetEnabled === true,
      pickupAvailability: profileForSave.pickupAvailability ?? null,
      goGetRingDurationSeconds: normalizeGoGetRingDuration(profileForSave.goGetRingDurationSeconds),
      goGetRingPattern: normalizeGoGetRingPattern(profileForSave.goGetRingPattern),
      navigationSettings: profileForSave.navigationSettings ?? null,
      appPreferences: profileForSave.appPreferences ?? null,
      staffInteractionMode:
        profileForSave.staffInteractionMode === 'neighbor' ? 'neighbor' : 'staff',
      createdAt: coerceToIsoDate(profileForSave.createdAt),
    };

    let { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'uid' })
      .select('uid, photoURL, displayName, email, neighborhood, bio, role, goGetEnabled, staffInteractionMode, pickupAvailability, goGetRingDurationSeconds, goGetRingPattern, navigationSettings, appPreferences, createdAt')
      .single();

    // Older DBs may not have optional profile columns yet — retry without missing columns.
    if (error && /goGetEnabled|staffInteractionMode|pickupAvailability|goGetRing|navigationSettings|appPreferences|schema cache|PGRST204/i.test(`${error.code || ''} ${error.message || ''}`)) {
      const wantsGoGetPrefs =
        payload.goGetEnabled === true ||
        payload.pickupAvailability != null ||
        payload.goGetRingDurationSeconds !== 140 ||
        payload.goGetRingPattern !== 'ring';
      if (/pickupAvailability|goGetRing/i.test(`${error.code || ''} ${error.message || ''}`) && wantsGoGetPrefs) {
        return {
          ok: false,
          errorMessage:
            'Go Get settings could not be saved. Run scripts/supabase-migration-aug-20-2026-go-get-ring-availability.sql in the Supabase SQL editor, then try again.',
        };
      }
      if (/navigationSettings/i.test(`${error.code || ''} ${error.message || ''}`) && payload.navigationSettings != null) {
        return {
          ok: false,
          errorMessage:
            'Navigation settings could not be saved. Run scripts/supabase-migration-aug-20-2026-user-prefs-native-session.sql in the Supabase SQL editor, then try again.',
        };
      }
      const {
        goGetEnabled: _goGet,
        staffInteractionMode: _mode,
        pickupAvailability: _avail,
        goGetRingDurationSeconds: _ringDur,
        goGetRingPattern: _ringPat,
        navigationSettings: _nav,
        appPreferences: _prefs,
        ...legacyPayload
      } = payload;
      ({ data, error } = await supabase
        .from('users')
        .upsert(legacyPayload, { onConflict: 'uid' })
        .select('uid, photoURL, displayName, email, neighborhood, bio, role, createdAt')
        .single());
    }

    if (error) {
      handleSupabaseError(error, 'users');
      return { ok: false, errorMessage: error.message };
    }

    const saved = normalizeUserProfileRow(data as Record<string, unknown>);

    if (photoURL && !saved?.photoURL) {
      const { error: patchError } = await supabase
        .from('users')
        .update({ photoURL })
        .eq('uid', profile.uid);
      if (patchError) {
        return {
          ok: false,
          errorMessage:
            patchError.message ||
            'Profile saved but photoURL column could not be updated — check users table schema in Supabase.',
        };
      }
    }

    if (photoURL) {
      void syncProfilePhotoAcrossApp(profile.uid, photoURL, payload.displayName);
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: any) {
    console.error('Supabase profile upsert error:', err);
    handleSupabaseError(err, 'users');
    return { ok: false, errorMessage: String(err?.message || err) };
  }
}

/**
 * --- ITEMS / LISTINGS ---
 */
const ITEM_FEED_COLUMNS =
  'id,title,type,category,userId,userDisplayName,userPhotoURL,neighborhood,status,imageUrl,createdAt,updatedAt,expiresAt,expiryWarnedAt,pickupAttributionType,pickupAttributionUserId,pickupAttributionLabel';

function mapItemRows(rows: unknown[]): ItemPost[] {
  const items: ItemPost[] = [];
  for (const row of rows) {
    try {
      items.push(normalizeItemFromRow(row as ItemPost));
    } catch (rowErr) {
      console.warn('Skipping malformed listing row:', (row as { id?: string })?.id, rowErr);
    }
  }
  return items;
}

let itemFeedDescriptionRpc: boolean | null = null;
let itemFeedImageUrlMapRpc: boolean | null = null;
let cachedPhotoUrlMap: Map<string, string[]> | null = null;
let cachedPhotoUrlMapAt = 0;

async function itemFeedImageUrlMap(force = false): Promise<Map<string, string[]>> {
  const now = Date.now();
  if (!force && cachedPhotoUrlMap && now - cachedPhotoUrlMapAt < 60_000) {
    return cachedPhotoUrlMap;
  }

  const map = new Map<string, string[]>();
  if (itemFeedImageUrlMapRpc === false && cachedPhotoUrlMap) return cachedPhotoUrlMap;

  const { data, error } = await supabase.rpc('item_feed_image_url_map');
  if (error) {
    itemFeedImageUrlMapRpc = false;
    console.warn('Listing photo URL map RPC unavailable:', error.message);
    return cachedPhotoUrlMap ?? map;
  }

  itemFeedImageUrlMapRpc = true;
  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? '');
    const rawUrls = (row as { image_urls?: unknown }).image_urls;
    if (!id || !Array.isArray(rawUrls)) continue;
    const urls = rawUrls
      .map((url) => String(url).trim())
      .filter((url) => url.startsWith('http://') || url.startsWith('https://'));
    if (urls.length > 0) map.set(id, urls);
  }

  cachedPhotoUrlMap = map;
  cachedPhotoUrlMapAt = now;
  return map;
}

async function itemFeedDescription(itemId: string): Promise<string | null> {
  if (!itemId || itemFeedDescriptionRpc === false) return null;
  const { data, error } = await supabase.rpc('item_feed_description', { item_id: itemId });
  if (error) {
    itemFeedDescriptionRpc = false;
    return null;
  }
  itemFeedDescriptionRpc = true;
  return typeof data === 'string' ? data : null;
}

/**
 * Load every listing without pulling multi-megabyte `data:image` camera dumps
 * that some descriptions still store in `[PHOTOS:]`.
 */
async function fetchItemRowsForFeed(): Promise<Record<string, unknown>[]> {
  const { data: heads, error } = await supabase
    .from('items')
    .select(ITEM_FEED_COLUMNS)
    .order('createdAt', { ascending: false });

  if (error) {
    handleSupabaseError(error, 'items');
    throw error;
  }

  const { data: bodies, error: bodyError } = await supabase
    .from('items')
    .select('id,description')
    .not('description', 'ilike', '%data:image%');

  if (bodyError) {
    console.warn('Listing descriptions fetch skipped bloated rows filter:', bodyError);
  }

  const descById = new Map<string, string>();
  for (const row of bodies ?? []) {
    const id = String((row as { id?: string }).id ?? '');
    if (!id) continue;
    descById.set(id, plainListingDescription((row as { description?: string }).description));
  }

  const missing = (heads ?? []).filter((row) => !descById.get(String((row as { id?: string }).id ?? '')));
  if (missing.length > 0) {
    const probeId = String((missing[0] as { id?: string }).id ?? '');
    const probe = await itemFeedDescription(probeId);
    if (probe != null) {
      descById.set(probeId, plainListingDescription(probe));
      await Promise.all(
        missing.slice(1).map(async (row) => {
          const id = String((row as { id?: string }).id ?? '');
          const text = await itemFeedDescription(id);
          if (text != null) descById.set(id, plainListingDescription(text));
        }),
      );
    }
  }

  const photoUrlsById = await itemFeedImageUrlMap();

  return (heads ?? []).map((row) => {
    const id = String((row as { id?: string }).id ?? '');
    const imageUrls = photoUrlsById.get(id);
    return {
      ...(row as Record<string, unknown>),
      description: descById.get(id) || '',
      ...(imageUrls?.length ? { imageUrls } : {}),
    };
  });
}

export async function getSupabaseItems(): Promise<ItemPost[]> {
  try {
    const rows = await fetchItemRowsForFeed();
    setSupabaseConfigurationState(true);
    return mapItemRows(rows);
  } catch (err: any) {
    console.warn('Supabase items fetch failed:', err);
    handleSupabaseError(err, 'items');
    throw err;
  }
}

export async function getSupabaseItemById(itemId: string): Promise<ItemPost | null> {
  if (!itemId) return null;
  try {
    const headQuery = supabase.from('items').select(ITEM_FEED_COLUMNS).eq('id', itemId).maybeSingle();
    const { data: head, error } = await headQuery;
    if (error) {
      handleSupabaseError(error, 'items');
      return null;
    }
    if (!head) return null;

    const { data: body } = await supabase
      .from('items')
      .select('description')
      .eq('id', itemId)
      .not('description', 'ilike', '%data:image%')
      .maybeSingle();

    let description = (body as { description?: string } | null)?.description || '';
    if (!description) {
      description = (await itemFeedDescription(itemId)) || '';
    }

    const photoUrlsById = await itemFeedImageUrlMap();
    const imageUrls = photoUrlsById.get(itemId);

    setSupabaseConfigurationState(true);
    return normalizeItemFromRow({
      ...(head as ItemPost),
      description,
      ...(imageUrls?.length ? { imageUrls } : {}),
    });
  } catch (err: any) {
    console.warn('Supabase item fetch failed:', err);
    handleSupabaseError(err, 'items');
    return null;
  }
}

async function requireAuthUserId(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user?.id ?? null;
}

function sanitizeStorageKey(value: string, maxLen = 120): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen) || 'upload';
}

export async function uploadItemImage(file: File, itemId: string): Promise<string | null> {
  try {
    const userId = await requireAuthUserId();
    if (!userId) {
      console.warn('Listing photo upload failed: not signed in');
      return null;
    }

    const compressed = await compressImageIfNeeded(file);
    const extRaw = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
    const fileExt = /^[a-z0-9]+$/.test(extRaw) ? extRaw : 'jpg';
    const safeItemKey = sanitizeStorageKey(itemId);
    const filePath = `${userId}/listings/${safeItemKey}_${Date.now()}.${fileExt}`;
    const contentType = guessImageContentType(compressed);

    // Upload to 'items' bucket using supabase-js
    const { error } = await supabase.storage
      .from('items')
      .upload(filePath, compressed, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (error) {
      console.warn('Supabase storage upload failed, checking schema or connection:', error);
      throw error;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('items')
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl || null;
    return publicUrl && publicUrl.startsWith('http') ? publicUrl : null;
  } catch (err: any) {
    // Never fall back to a data URL — inlining photos in `items.description`
    // has ballooned a handful of rows to 4–12MB and emptied the community feed.
    console.warn('Listing photo upload failed:', err);
    return null;
  }
}

export async function uploadReportProofImage(file: File, reportId: string): Promise<string | null> {
  try {
    const userId = await requireAuthUserId();
    if (!userId) return null;

    const compressed = await compressImageIfNeeded(file, 1400, 0.8);
    const fileExt = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'jpg';
    const safeReportId = sanitizeStorageKey(reportId);
    const filePath = `${userId}/reports/${safeReportId}_${Date.now()}.${safeExt}`;
    const contentType = guessImageContentType(compressed);

    const { error } = await supabase.storage.from('items').upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

    if (error) throw error;

    const { data: publicData } = supabase.storage.from('items').getPublicUrl(filePath);
    return publicData?.publicUrl || null;
  } catch {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
}

export async function uploadTicketMessageImage(
  file: File,
  ticketId: string,
  messageId: string,
): Promise<string | null> {
  try {
    const userId = await requireAuthUserId();
    if (!userId) return null;

    const compressed = await compressImageIfNeeded(file, 1400, 0.8);
    const fileExt = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'jpg';
    const safeTicketId = sanitizeStorageKey(ticketId);
    const safeMessageId = sanitizeStorageKey(messageId);
    const filePath = `${userId}/tickets/${safeTicketId}/${safeMessageId}.${safeExt}`;
    const contentType = guessImageContentType(compressed);

    const { error } = await supabase.storage.from('items').upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

    if (error) throw error;

    const { data: publicData } = supabase.storage.from('items').getPublicUrl(filePath);
    return publicData?.publicUrl || null;
  } catch {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
}

export async function uploadProfilePhoto(file: File, userId: string): Promise<string | null> {
  const authUserId = await requireAuthUserId();
  if (!authUserId || authUserId !== userId) {
    console.warn('Profile photo upload failed: not signed in as profile owner');
    return null;
  }

  const compressed = await compressImageIfNeeded(file, 512, 0.85);
  const extRaw = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
  const fileExt = /^[a-z0-9]+$/.test(extRaw) ? extRaw : 'jpg';
  const contentType = guessImageContentType(compressed);

  const attempts: { bucket: string; path: string }[] = [
    { bucket: 'avatars', path: `${userId}/avatar.${fileExt}` },
    { bucket: 'items', path: `${userId}/avatar.${fileExt}` },
    { bucket: 'items', path: `${userId}/avatar_${Date.now()}.${fileExt}` },
  ];

  for (const { bucket, path } of attempts) {
    const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

    if (error) {
      console.warn(`Profile photo upload failed (${bucket}/${path}):`, error.message);
      continue;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = publicData?.publicUrl;
    if (publicUrl) {
      return `${publicUrl}?v=${Date.now()}`;
    }
  }

  return null;
}

export function normalizeSupabaseItem(row: ItemPost): ItemPost {
  return normalizeItemMedia(row);
}

function normalizeItemFromRow(row: ItemPost): ItemPost {
  return normalizeSupabaseItem({
    ...row,
    status: row.status || 'active',
    type: row.type || 'giveaway',
  });
}

function isMissingImageUrlColumnError(error: { code?: string; message?: string } | null): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    msg.includes('imageurl') ||
    msg.includes('image_url')
  );
}

function isMissingExpiryColumnError(error: { code?: string; message?: string } | null): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    msg.includes('expiresat') ||
    msg.includes('expirywarnedat')
  );
}

function stripExpiryFields(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  delete next.expiresAt;
  delete next.expiryWarnedAt;
  return next;
}

function buildItemInsertPayload(item: ItemPost, includeImageUrl: boolean) {
  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category,
    userId: item.userId,
    userDisplayName: item.userDisplayName,
    userPhotoURL: item.userPhotoURL || null,
    neighborhood: item.neighborhood,
    status: item.status || 'active',
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : nowIso,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : nowIso,
    expiresAt: listingExpiresAtIso(Date.now()),
    expiryWarnedAt: null,
  };

  if (includeImageUrl && item.imageUrl) {
    // Only persist real URLs — never store multi-MB base64 in the database.
    if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
      payload.imageUrl = item.imageUrl;
    }
  }

  return payload;
}

export async function createSupabaseItem(
  item: ItemPost,
  author?: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    if (author?.email) {
      await upsertSupabaseProfile(author);
    }

    let payload = buildItemInsertPayload(item, true);
    let { error } = await supabase.from('items').insert(payload);

    if (error && isMissingExpiryColumnError(error)) {
      payload = stripExpiryFields(payload);
      ({ error } = await supabase.from('items').insert(payload));
    }

    if (error && isMissingImageUrlColumnError(error) && item.imageUrl?.startsWith('http')) {
      const descriptionWithImage = `${item.description}\n\n[Photo]: ${item.imageUrl}`;
      payload = buildItemInsertPayload({ ...item, description: descriptionWithImage }, false);
      ({ error } = await supabase.from('items').insert(payload));
    }

    if (error) {
      console.error('createSupabaseItem error:', error.code, error.message, error.details, error.hint);
      handleSupabaseError(error, 'items');
      const hint = isMissingImageUrlColumnError(error)
        ? ' Database is missing the imageUrl column — run the SQL fix in Supabase (see databaseSQL.txt).'
        : '';
      return { ok: false, errorMessage: (error.message || 'Could not save listing.') + hint };
    }

    setSupabaseConfigurationState(true);
    await runPushTask(() => import('./lib/pushIntegration').then((m) => m.pushAfterItemCreated(item)));
    return { ok: true };
  } catch (err: any) {
    console.error('createSupabaseItem exception:', err);
    handleSupabaseError(err, 'items');
    return { ok: false, errorMessage: err?.message || 'Could not save listing.' };
  }
}

function buildItemUpdatePayload(
  item: ItemPost,
  includeImageUrl: boolean,
  options?: { repost?: boolean },
) {
  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category,
    neighborhood: item.neighborhood,
    userDisplayName: item.userDisplayName,
    userPhotoURL: item.userPhotoURL || null,
    updatedAt: nowIso,
    expiresAt: listingExpiresAtIso(Date.now()),
    expiryWarnedAt: null,
  };

  if (options?.repost) {
    payload.status = 'active';
    payload.createdAt = nowIso;
  }

  if (includeImageUrl && item.imageUrl) {
    if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
      payload.imageUrl = item.imageUrl;
    }
  }

  return payload;
}

export async function updateSupabaseItem(
  item: ItemPost,
  options?: { repost?: boolean },
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const repost = options?.repost === true;
    let payload = buildItemUpdatePayload(item, true, repost ? { repost: true } : undefined);
    let { error } = await supabase.from('items').update(payload).eq('id', item.id);

    if (error && isMissingExpiryColumnError(error)) {
      payload = stripExpiryFields(payload);
      ({ error } = await supabase.from('items').update(payload).eq('id', item.id));
    }

    if (error && isMissingImageUrlColumnError(error) && item.imageUrl?.startsWith('http')) {
      const descriptionWithImage = `${item.description}\n\n[Photo]: ${item.imageUrl}`;
      payload = buildItemUpdatePayload({ ...item, description: descriptionWithImage }, false, repost ? { repost: true } : undefined);
      ({ error } = await supabase.from('items').update(payload).eq('id', item.id));
    }

    if (error) {
      console.error('updateSupabaseItem error:', error.code, error.message);
      handleSupabaseError(error, 'items');
      const hint = isMissingImageUrlColumnError(error)
        ? ' Database is missing the imageUrl column — run the SQL fix in Supabase (see databaseSQL.txt).'
        : '';
      return { ok: false, errorMessage: (error.message || 'Could not update listing.') + hint };
    }

    setSupabaseConfigurationState(true);
    if (repost) {
      await runPushTask(() =>
        import('./lib/pushIntegration').then((m) =>
          m.pushAfterItemReposted({ ...item, status: 'active', createdAt: String(payload.createdAt) }),
        ),
      );
    } else {
      await runPushTask(() => import('./lib/pushIntegration').then((m) => m.pushAfterItemUpdated(item)));
    }
    return { ok: true };
  } catch (err: any) {
    console.error('updateSupabaseItem exception:', err);
    handleSupabaseError(err, 'items');
    return { ok: false, errorMessage: err?.message || 'Could not update listing.' };
  }
}

export async function updateSupabaseItemStatus(
  itemId: string,
  status: string,
  actorUserId?: string,
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('items')
      .select('status')
      .eq('id', itemId)
      .maybeSingle();
    const previousStatus = String((existing as { status?: string } | null)?.status || '');
    const now = new Date().toISOString();
    const isRepost = previousStatus === 'withdrawn' && status === 'active';

    let updatePayload: Record<string, unknown> = {
      status,
      updatedAt: now,
      ...(isRepost
        ? {
            createdAt: now,
            expiresAt: listingExpiresAtIso(Date.now()),
            expiryWarnedAt: null,
          }
        : {}),
    };

    let { error } = await supabase.from('items').update(updatePayload).eq('id', itemId);

    if (error && isMissingExpiryColumnError(error) && isRepost) {
      updatePayload = { status, updatedAt: now, createdAt: now };
      ({ error } = await supabase.from('items').update(updatePayload).eq('id', itemId));
    }

    if (error) {
      handleSupabaseError(error, 'items');
      return false;
    }

    if (previousStatus !== status) {
      await runPushTask(() =>
        import('./lib/pushIntegration').then((m) =>
          isRepost
            ? m.pushAfterItemReposted(itemId)
            : m.pushAfterItemStatusChange(itemId, status, previousStatus),
        ),
      );
    }

    if (status === 'pending_pickup' && actorUserId) {
      await runPushTask(() =>
        import('./lib/pushIntegration').then((m) => m.pushAfterPendingPickup(itemId, actorUserId)),
      );
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase status update failed:', err);
    handleSupabaseError(err, 'items');
    return false;
  }
}

const SAVED_ITEMS_STORAGE_KEY = 'sbn_saved_items_v1';

export async function syncSavedItemBookmark(
  userId: string,
  itemId: string,
  saved: boolean,
): Promise<void> {
  if (!userId || !itemId) return;
  try {
    if (saved) {
      await supabase.from('saved_items').upsert(
        {
          userId,
          itemId,
          createdAt: new Date().toISOString(),
        },
        { onConflict: 'userId,itemId' },
      );
    } else {
      await supabase.from('saved_items').delete().eq('userId', userId).eq('itemId', itemId);
    }
  } catch {
    // saved_items table may not exist yet — local bookmarks still work
  }
}

export async function migrateLocalSavedItemsToDb(userId: string): Promise<void> {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const itemIds = parsed.filter((v): v is string => typeof v === 'string');
    if (!itemIds.length) return;

    const rows = itemIds.map((itemId) => ({
      userId,
      itemId,
      createdAt: new Date().toISOString(),
    }));
    await supabase.from('saved_items').upsert(rows, { onConflict: 'userId,itemId', ignoreDuplicates: true });
  } catch {
    // non-fatal
  }
}

export async function deleteSupabaseItem(itemId: string): Promise<boolean> {
  try {
    await supabase.from('item_claim_requests').delete().eq('itemId', itemId);
    await supabase.from('item_claims').delete().eq('itemId', itemId);
    await supabase.from('listing_subitems').delete().eq('itemId', itemId);

    await supabase
      .from('item_votes')
      .delete()
      .eq('itemId', itemId);

    await supabase
      .from('item_comments')
      .delete()
      .eq('itemId', itemId);

    // 1. Fetch associated chats first to cascade-delete their messages
    const { data: associatedChats, error: selectErr } = await supabase
      .from('chats')
      .select('id')
      .eq('itemId', itemId);

    if (!selectErr && associatedChats && associatedChats.length > 0) {
      const chatIds = associatedChats.map(c => c.id);

      // 2. Clear messages inside those chats
      await supabase
        .from('messages')
        .delete()
        .in('chatId', chatIds);

      // 3. Clear the chats themselves
      await supabase
        .from('chats')
        .delete()
        .eq('itemId', itemId);
    }

    // 4. Delete the item itself
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      handleSupabaseError(error, 'items');
      return false;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase item delete failed:', err);
    handleSupabaseError(err, 'items');
    return false;
  }
}

/**
 * --- CHATS ---
 */
export async function ensureCommunityChatsExist(): Promise<void> {
  const rows = [
    {
      id: GLOBAL_COMMUNITY_CHAT_ID,
      participantIds: [],
      participantNames: {},
      participantPhotos: {},
      lastMessageText: 'Welcome to the community chat — say hello!',
      lastMessageAt: new Date().toISOString(),
      itemId: '',
      itemTitle: '',
    },
    {
      id: STAFF_COMMUNITY_CHAT_ID,
      participantIds: [],
      participantNames: {},
      participantPhotos: {},
      lastMessageText: 'Staff lounge — team coordination.',
      lastMessageAt: new Date().toISOString(),
      itemId: '',
      itemTitle: '',
    },
  ];
  for (const row of rows) {
    const { data: existing } = await supabase.from('chats').select('id').eq('id', row.id).maybeSingle();
    if (!existing) {
      await supabase.from('chats').insert(row);
    }
  }
}

async function fetchCommunityChatRows(includeStaffChat: boolean): Promise<Chat[]> {
  const ids = includeStaffChat
    ? [GLOBAL_COMMUNITY_CHAT_ID, STAFF_COMMUNITY_CHAT_ID]
    : [GLOBAL_COMMUNITY_CHAT_ID];
  const { data, error } = await supabase.from('chats').select('*').in('id', ids);
  if (error || !data?.length) {
    await ensureCommunityChatsExist();
    const fallback = includeStaffChat
      ? [buildGlobalCommunityChatRow(), buildStaffCommunityChatRow()]
      : [buildGlobalCommunityChatRow()];
    const byId = new Map((data as Chat[] | null)?.map((c) => [c.id, c]) ?? []);
    return fallback.map((row) => byId.get(row.id) ?? row);
  }
  const byId = new Map((data as Chat[]).map((c) => [c.id, c]));
  const rows: Chat[] = [];
  if (byId.has(GLOBAL_COMMUNITY_CHAT_ID)) {
    rows.push(byId.get(GLOBAL_COMMUNITY_CHAT_ID)!);
  } else {
    rows.push(buildGlobalCommunityChatRow());
  }
  if (includeStaffChat) {
    if (byId.has(STAFF_COMMUNITY_CHAT_ID)) {
      rows.push(byId.get(STAFF_COMMUNITY_CHAT_ID)!);
    } else {
      rows.push(buildStaffCommunityChatRow());
    }
  }
  return rows;
}

export async function getSupabaseChats(
  userId: string,
  options?: { userRole?: UserProfile['role']; staffInteractionMode?: UserProfile['staffInteractionMode'] },
): Promise<Chat[]> {
  const includeStaffChat =
    isStaffRole(options?.userRole) &&
    (options?.staffInteractionMode === undefined ||
      options.staffInteractionMode !== 'neighbor');
  try {
    // Filter server-side using JSONB containment so we only fetch this user's chats.
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participantIds', JSON.stringify([userId]))
      .order('lastMessageAt', { ascending: false });

    let directChats: Chat[] = [];
    if (error) {
      // Fall back to client-side filtering if the JSONB operator isn't supported on this schema.
      const { data: allData, error: allError } = await supabase.from('chats').select('*');
      if (allError) {
        handleSupabaseError(allError, 'chats');
        directChats = [];
      } else {
        setSupabaseConfigurationState(true);
        directChats = (allData || []).filter((c: Chat) => {
          if (isCommunityChat(c.id)) return false;
          const ids = Array.isArray(c.participantIds) ? c.participantIds : [];
          return ids.includes(userId);
        }) as Chat[];
      }
    } else {
      setSupabaseConfigurationState(true);
      directChats = ((data || []) as Chat[]).filter((c) => !isCommunityChat(c.id));
    }

    const community = await fetchCommunityChatRows(includeStaffChat);
    return sortChatsForInbox([...community, ...directChats], includeStaffChat);
  } catch (err: any) {
    console.warn('Supabase chats fetch failed:', err);
    handleSupabaseError(err, 'chats');
    return [];
  }
}

export async function getUserPickupCoordinationByIds(
  userIds: string[],
): Promise<
  Record<
    string,
    Pick<UserProfile, 'goGetEnabled' | 'pickupAvailability' | 'goGetRingDurationSeconds' | 'goGetRingPattern'>
  >
> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('users')
      .select('uid, goGetEnabled, pickupAvailability, goGetRingDurationSeconds, goGetRingPattern')
      .in('uid', unique);
    if (error || !data) return {};
    const map: Record<
      string,
      Pick<UserProfile, 'goGetEnabled' | 'pickupAvailability' | 'goGetRingDurationSeconds' | 'goGetRingPattern'>
    > = {};
    for (const row of data as Record<string, unknown>[]) {
      const uid = String(row.uid ?? '');
      if (!uid) continue;
      map[uid] = {
        goGetEnabled: row.goGetEnabled === true || row.go_get_enabled === true,
        pickupAvailability: parsePickupAvailabilityColumn(row.pickupAvailability ?? row.pickup_availability),
        goGetRingDurationSeconds: normalizeGoGetRingDuration(
          row.goGetRingDurationSeconds ?? row.go_get_ring_duration_seconds,
        ),
        goGetRingPattern: normalizeGoGetRingPattern(row.goGetRingPattern ?? row.go_get_ring_pattern),
      };
    }
    return map;
  } catch {
    return {};
  }
}

export async function getUserDisplayInfoByIds(
  userIds: string[],
): Promise<Record<string, { displayName: string; photoURL?: string; role?: UserProfile['role'] }>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('users')
      .select('uid, displayName, photoURL, role')
      .in('uid', unique);
    if (error || !data) return {};
    const map: Record<string, { displayName: string; photoURL?: string; role?: UserProfile['role'] }> = {};
    for (const row of data as { uid: string; displayName: string; photoURL?: string; role?: string }[]) {
      map[row.uid] = {
        displayName: row.displayName,
        photoURL: row.photoURL,
        role: (row.role as UserProfile['role']) ?? 'user',
      };
    }
    return map;
  } catch {
    return {};
  }
}

export async function getOrCreateSupabaseChat(chatId: string, initialPayload: any): Promise<boolean> {
  try {
    const itemId = String(initialPayload?.itemId || '').trim();
    if (itemId) {
      const item = await getSupabaseItemById(itemId);
      if (!item || !isListingOpenForCoordination(item.status)) {
        return false;
      }
    }

    const eventId = String(initialPayload?.eventId || '').trim();
    if (eventId) {
      const event = await getSupabaseEventById(eventId);
      if (!event || isEventPostChatReadOnly(resolveEventStatus(event))) {
        return false;
      }
    }

    // Check if chat exists
    const { data: existingChat, error: checkError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      handleSupabaseError(checkError, 'chats');
      return false;
    }

    if (existingChat) {
      // Exist: merges specific post contextual updates
      const { error: updateError } = await supabase
        .from('chats')
        .update({
          lastMessageAt: new Date().toISOString(),
          itemId: initialPayload.itemId || '',
          itemTitle: initialPayload.itemTitle || '',
          eventId: initialPayload.eventId || '',
          eventTitle: initialPayload.eventTitle || '',
        })
        .eq('id', chatId);

      if (updateError) {
        handleSupabaseError(updateError, 'chats');
        throw updateError;
      }
    } else {
      // Create new chat row
      const payload = {
        id: chatId,
        participantIds: initialPayload.participantIds || [],
        participantNames: initialPayload.participantNames || {},
        participantPhotos: initialPayload.participantPhotos || {},
        lastMessageText: initialPayload.lastMessageText || '',
        lastMessageAt: initialPayload.lastMessageAt ? new Date(initialPayload.lastMessageAt).toISOString() : new Date().toISOString(),
        lastMessageSenderId: initialPayload.lastMessageSenderId || '',
        itemId: initialPayload.itemId || '',
        itemTitle: initialPayload.itemTitle || '',
        eventId: initialPayload.eventId || '',
        eventTitle: initialPayload.eventTitle || '',
      };

      const { error: insertError } = await supabase
        .from('chats')
        .insert(payload);

      if (insertError) {
        handleSupabaseError(insertError, 'chats');
        throw insertError;
      }
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase write chat failed:', err);
    handleSupabaseError(err, 'chats');
    return false;
  }
}

/**
 * --- MESSAGES ---
 */
export async function getSupabaseMessages(chatId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatId', chatId)
      .order('createdAt', { ascending: true });

    if (error) {
      handleSupabaseError(error, 'messages');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []).map((row) => ({
      ...(row as Message),
      postedAsNeighbor:
        (row as { postedAsNeighbor?: boolean; posted_as_neighbor?: boolean }).postedAsNeighbor === true ||
        (row as { posted_as_neighbor?: boolean }).posted_as_neighbor === true,
    }));
  } catch (err: any) {
    console.warn('Supabase messages query failed:', err);
    handleSupabaseError(err, 'messages');
    return [];
  }
}

export interface NeighborStats {
  itemsGiven: number;
  /** Giveaways picked up + ISO requests fulfilled (received from a neighbor) */
  itemsClaimed: number;
  /** Completed barter trades (posted or as trade partner) */
  tradesCompleted: number;
  /** Upvotes neighbors cast on this user's listings */
  upvotesReceived: number;
  /** Downvotes neighbors cast on this user's listings */
  downvotesReceived: number;
}

export interface CommunityStats {
  memberCount: number;
  activeListings: number;
  itemsGiven: number;
  requestsFulfilled: number;
}

export interface NeighborAwardClaimRow {
  id: string;
  itemId: string;
  kind: string;
  createdAt: string;
  giverUserId: string;
  claimerUserId: string;
  itemTitle?: string;
  itemType?: ItemPost['type'];
}

export async function getNeighborAwardClaims(uid: string): Promise<NeighborAwardClaimRow[]> {
  try {
    const [asClaimer, asGiver] = await Promise.all([
      supabase
        .from('item_claims')
        .select('id, itemId, kind, createdAt, giverUserId, claimerUserId')
        .eq('claimerUserId', uid)
        .order('createdAt', { ascending: false })
        .limit(80),
      supabase
        .from('item_claims')
        .select('id, itemId, kind, createdAt, giverUserId, claimerUserId')
        .eq('giverUserId', uid)
        .eq('kind', 'request_fulfilled')
        .order('createdAt', { ascending: false })
        .limit(80),
    ]);

    const rows = [...(asClaimer.data ?? []), ...(asGiver.data ?? [])] as NeighborAwardClaimRow[];
    if (rows.length === 0) return [];

    const itemIds = [...new Set(rows.map((r) => r.itemId))];
    const { data: items } = await supabase.from('items').select('id, title, type').in('id', itemIds);
    const itemMap = new Map((items ?? []).map((row) => [String(row.id), row]));

    return rows.map((row) => {
      const item = itemMap.get(row.itemId);
      return {
        ...row,
        createdAt: String(row.createdAt),
        itemTitle: item?.title ? String(item.title) : undefined,
        itemType: item?.type as ItemPost['type'] | undefined,
      };
    });
  } catch {
    return [];
  }
}

/** Director-only: update another user's role (enforced by set_user_role RPC + RLS). */
export async function setUserRole(
  uid: string,
  role: UserRole,
  context?: { actorUserId: string; actorName: string; targetName: string; previousRole?: UserRole },
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    if (!context?.actorUserId) {
      return { ok: false, errorMessage: 'Actor context is required.' };
    }

    const actorProfile = await getSupabaseProfile(context.actorUserId);
    if (!actorProfile || !isDirectorRole(actorProfile.role)) {
      return { ok: false, errorMessage: 'Director access required.' };
    }

    const slotCheck = await assertStaffRoleSlotAvailable(uid, role);
    if (slotCheck.ok === false) {
      return { ok: false, errorMessage: slotCheck.errorMessage };
    }

    const { error } = await supabase.rpc('set_user_role', {
      target_uid: uid,
      new_role: role,
    });

    if (error) {
      handleSupabaseError(error, 'users');
      return { ok: false, errorMessage: error.message };
    }

    if (context) {
      await writeModerationAudit({
        actor: { uid: context.actorUserId, displayName: context.actorName } as UserProfile,
        target: { uid, displayName: context.targetName },
        action: 'set_role',
        detail: `${context.actorName} set ${context.targetName} to ${roleLabel(role)}`,
      });
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, errorMessage: err?.message || 'Could not update role.' };
  }
}

function isMissingRelationOrRpc(error: { code?: string; message?: string } | null | undefined): boolean {
  const blob = `${error?.code || ''} ${error?.message || ''}`;
  return /42P01|42883|PGRST202|PGRST205|schema cache|does not exist|could not find the function/i.test(blob);
}

function parseStaffApplicationRow(raw: unknown): StaffApplication | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const role = String(row.role || '');
  const status = String(row.status || '');
  if (!isStaffApplyRole(role)) return null;
  if (status !== 'pending' && status !== 'yes' && status !== 'no' && status !== 'maybe') return null;
  const id = String(row.id || '').trim();
  const applicantUserId = String(row.applicantUserId || '').trim();
  if (!id || !applicantUserId) return null;
  return {
    id,
    applicantUserId,
    applicantName: String(row.applicantName || 'Neighbor'),
    applicantEmail: String(row.applicantEmail || ''),
    neighborhood: String(row.neighborhood || ''),
    role,
    statement: String(row.statement || ''),
    responseTime: String(row.responseTime || ''),
    otherGroups: String(row.otherGroups || ''),
    otherInfo: String(row.otherInfo || ''),
    status,
    reviewedByUserId: row.reviewedByUserId ? String(row.reviewedByUserId) : null,
    reviewedByName: row.reviewedByName ? String(row.reviewedByName) : null,
    reviewedAt: row.reviewedAt ? String(row.reviewedAt) : null,
    createdAt: String(row.createdAt || new Date().toISOString()),
    updatedAt: String(row.updatedAt || row.createdAt || new Date().toISOString()),
  };
}

export async function getMyStaffApplyState(): Promise<ApplicantStaffApplyState> {
  const empty: ApplicantStaffApplyState = {
    blocked: false,
    pending: null,
    lastDecision: null,
    seatCounts: {},
  };
  try {
    const { data, error } = await supabase.rpc('my_staff_apply_state');
    if (!error && data && typeof data === 'object') {
      const payload = data as {
        blocked?: unknown;
        pending?: unknown;
        lastDecision?: unknown;
        seatCounts?: unknown;
      };
      return {
        blocked: payload.blocked === true,
        pending: parseStaffApplicationRow(payload.pending),
        lastDecision: parseStaffApplicationRow(payload.lastDecision),
        seatCounts: parseStaffApplySeatCounts(payload.seatCounts),
      };
    }
    if (error && !isMissingRelationOrRpc(error)) {
      console.warn('my_staff_apply_state:', error.message);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return empty;
    const { data: rows, error: selectError } = await supabase
      .from('staff_applications')
      .select('*')
      .eq('applicantUserId', uid)
      .order('createdAt', { ascending: false })
      .limit(20);
    if (selectError) {
      if (!isMissingRelationOrRpc(selectError)) {
        console.warn('staff_applications state:', selectError.message);
      }
      return empty;
    }
    const parsed = (rows ?? []).map(parseStaffApplicationRow).filter((row): row is StaffApplication => !!row);
    return deriveApplicantStaffApplyState(parsed);
  } catch (err) {
    console.warn('getMyStaffApplyState failed:', err);
    return empty;
  }
}

export async function submitStaffApplication(params: {
  role: StaffApplyRole;
  statement: string;
  responseTime: string;
  otherGroups: string;
  otherInfo: string;
  seatCounts?: StaffApplySeatCounts;
}): Promise<{ ok: boolean; application?: StaffApplication; errorMessage?: string }> {
  try {
    if (isStaffApplySeatFilled(params.role, params.seatCounts)) {
      return { ok: false, errorMessage: 'That staff seat is filled.' };
    }
    const { data, error } = await supabase.rpc('submit_staff_application', {
      apply_role: params.role,
      statement: params.statement,
      response_time: params.responseTime,
      other_groups: params.otherGroups,
      other_info: params.otherInfo,
    });
    if (!error) {
      const application = parseStaffApplicationRow(data);
      if (application) return { ok: true, application };
    }
    if (error && !isMissingRelationOrRpc(error)) {
      return { ok: false, errorMessage: error.message || 'Could not submit application.' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user?.id) return { ok: false, errorMessage: 'Sign in to apply.' };
    const profile = await getSupabaseProfile(user.id);
    const row = {
      id: `sapp_${crypto.randomUUID().replace(/-/g, '')}`,
      applicantUserId: user.id,
      applicantName: profile?.displayName?.trim() || 'Neighbor',
      applicantEmail: profile?.email || user.email || '',
      neighborhood: profile?.neighborhood || '',
      role: params.role,
      statement: params.statement.trim(),
      responseTime: params.responseTime.trim(),
      otherGroups: params.otherGroups.trim(),
      otherInfo: params.otherInfo.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { data: inserted, error: insertError } = await supabase
      .from('staff_applications')
      .insert(row)
      .select('*')
      .maybeSingle();
    if (insertError) {
      return {
        ok: false,
        errorMessage: isMissingRelationOrRpc(insertError)
          ? 'Staff applications are not set up yet. Run the staff applications SQL in Supabase.'
          : insertError.message || 'Could not submit application.',
      };
    }
    const application = parseStaffApplicationRow(inserted) ?? parseStaffApplicationRow(row);
    if (!application) return { ok: false, errorMessage: 'Could not submit application.' };
    return { ok: true, application };
  } catch (err: any) {
    return { ok: false, errorMessage: err?.message || 'Could not submit application.' };
  }
}

export async function getPendingStaffApplications(): Promise<StaffApplication[]> {
  try {
    const { data, error } = await supabase
      .from('staff_applications')
      .select('*')
      .eq('status', 'pending')
      .order('createdAt', { ascending: true })
      .limit(40);
    if (error) {
      if (!isMissingRelationOrRpc(error)) {
        console.warn('getPendingStaffApplications:', error.message);
      }
      return [];
    }
    return (data ?? []).map(parseStaffApplicationRow).filter((row): row is StaffApplication => !!row);
  } catch (err) {
    console.warn('getPendingStaffApplications failed:', err);
    return [];
  }
}

export async function reviewStaffApplication(params: {
  applicationId: string;
  decision: StaffApplicationDecision;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data, error } = await supabase.rpc('review_staff_application', {
      app_id: params.applicationId,
      decision: params.decision,
    });
    if (!error) {
      const application = parseStaffApplicationRow(data);
      if (application) {
        const notice = staffApplicationDecisionNotice(application);
        void notifyAccountUpdate({
          userId: application.applicantUserId,
          title: notice.title,
          body: notice.body,
          tag: `staff-apply-${application.id}`,
        }).catch((err) => {
          console.warn('staff application notify failed:', err);
        });
      }
      return { ok: true };
    }
    if (!isMissingRelationOrRpc(error)) {
      return { ok: false, errorMessage: error.message || 'Could not save that decision.' };
    }
    return {
      ok: false,
      errorMessage: 'Staff application review is not set up yet. Run the staff applications SQL in Supabase.',
    };
  } catch (err: any) {
    return { ok: false, errorMessage: err?.message || 'Could not save that decision.' };
  }
}

export async function getCommunityStats(): Promise<CommunityStats> {
  try {
    const [membersRes, activeRes, givenRes, fulfilledRes] = await Promise.all([
      supabase.rpc('community_member_count'),
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'giveaway')
        .eq('status', 'completed'),
      supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'looking')
        .eq('status', 'completed'),
    ]);

    return {
      memberCount: membersRes.error ? 0 : Number(membersRes.data ?? 0),
      activeListings: activeRes.count ?? 0,
      itemsGiven: givenRes.count ?? 0,
      requestsFulfilled: fulfilledRes.count ?? 0,
    };
  } catch {
    return { memberCount: 0, activeListings: 0, itemsGiven: 0, requestsFulfilled: 0 };
  }
}

export async function getNeighborStats(uid: string): Promise<NeighborStats> {
  const empty = {
    itemsGiven: 0,
    itemsClaimed: 0,
    tradesCompleted: 0,
    upvotesReceived: 0,
    downvotesReceived: 0,
  };
  try {
    const [givenRes, claimedRes, helpedGiveRes, tradesPostedRes, tradesPartnerRes, itemsRes] =
      await Promise.all([
      supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('userId', uid)
        .eq('type', 'giveaway')
        .eq('status', 'completed'),
      supabase
        .from('item_claims')
        .select('id', { count: 'exact', head: true })
        .eq('claimerUserId', uid)
        .in('kind', ['giveaway', 'request_fulfilled']),
      supabase
        .from('item_claims')
        .select('id', { count: 'exact', head: true })
        .eq('giverUserId', uid)
        .eq('kind', 'request_fulfilled'),
      supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('userId', uid)
        .eq('type', 'trade')
        .eq('status', 'completed'),
      supabase
        .from('item_claims')
        .select('id', { count: 'exact', head: true })
        .eq('claimerUserId', uid)
        .eq('kind', 'trade_completed'),
      supabase.from('items').select('id').eq('userId', uid),
    ]);

    let upvotesReceived = 0;
    let downvotesReceived = 0;
    const itemIds = (itemsRes.data ?? []).map((row) => row.id as string);

    if (itemIds.length > 0) {
      const { data: votes } = await supabase
        .from('item_votes')
        .select('voteType')
        .in('itemId', itemIds);

      for (const vote of votes ?? []) {
        if (vote.voteType === 'up') upvotesReceived += 1;
        else if (vote.voteType === 'down') downvotesReceived += 1;
      }
    }

    const legacyClaimed = claimedRes.error
      ? await supabase
          .from('item_claims')
          .select('id', { count: 'exact', head: true })
          .eq('claimerUserId', uid)
      : null;

    const itemsClaimed = claimedRes.error ? legacyClaimed?.count ?? 0 : (claimedRes.count ?? 0);
    const helpedGive = helpedGiveRes.error ? 0 : (helpedGiveRes.count ?? 0);

    return {
      itemsGiven: (givenRes.count ?? 0) + helpedGive,
      itemsClaimed,
      tradesCompleted: (tradesPostedRes.count ?? 0) + (tradesPartnerRes.count ?? 0),
      upvotesReceived,
      downvotesReceived,
    };
  } catch {
    return empty;
  }
}

export function buildDmChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function normalizeListingSubItem(row: Record<string, unknown>): ListingSubItem {
  const raw = String(row.status ?? 'available');
  const status: ListingSubItem['status'] =
    raw === 'claimed' ? 'claimed' : raw === 'pending_pickup' ? 'pending_pickup' : 'available';
  return {
    id: String(row.id),
    itemId: String(row.itemId),
    label: String(row.label),
    sortOrder: Number(row.sortOrder ?? 0),
    status,
    claimedAt: row.claimedAt ? String(row.claimedAt) : null,
  };
}

function normalizeClaimRequest(row: Record<string, unknown>): ItemClaimRequest {
  let subItemIds: string[] = [];
  try {
    const parsed = JSON.parse(String(row.subItemIds ?? '[]'));
    if (Array.isArray(parsed)) subItemIds = parsed.map(String);
  } catch {
    subItemIds = [];
  }

  return {
    id: String(row.id),
    itemId: String(row.itemId),
    giverUserId: String(row.giverUserId),
    claimerUserId: String(row.claimerUserId),
    claimerName: String(row.claimerName),
    subItemIds,
    status: row.status === 'confirmed' ? 'confirmed' : row.status === 'rejected' ? 'rejected' : 'pending',
    chatId: String(row.chatId),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

export async function getListingSubitems(itemId: string): Promise<ListingSubItem[]> {
  try {
    const { data, error } = await supabase
      .from('listing_subitems')
      .select('*')
      .eq('itemId', itemId)
      .order('sortOrder', { ascending: true });

    if (error) {
      if (error.code === '42P01') return [];
      return [];
    }
    return (data ?? []).map((row) => normalizeListingSubItem(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function replaceListingSubitems(
  itemId: string,
  labels: string[],
): Promise<{ ok: boolean; errorMessage?: string }> {
  const trimmed = labels.map((l) => l.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return { ok: true };
  }

  try {
    const existing = await getListingSubitems(itemId);
    const claimed = existing.filter((s) => s.status === 'claimed');

    const { error: deleteError } = await supabase
      .from('listing_subitems')
      .delete()
      .eq('itemId', itemId)
      .eq('status', 'available');

    if (deleteError && deleteError.code !== '42P01') {
      return { ok: false, errorMessage: deleteError.message };
    }

    const claimedLabels = new Set(claimed.map((c) => c.label.toLowerCase()));
    const rows = trimmed
      .filter((label) => !claimedLabels.has(label.toLowerCase()))
      .map((label, index) => ({
        id: `sub_${itemId}_${index}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        itemId,
        label,
        sortOrder: claimed.length + index,
        status: 'available',
      }));

    if (rows.length === 0) return { ok: true };

    const { error: insertError } = await supabase.from('listing_subitems').insert(rows);
    if (insertError) {
      if (insertError.code === '42P01') {
        return { ok: false, errorMessage: 'Run section 15 in complete-schema.sql (listing_subitems).' };
      }
      return { ok: false, errorMessage: insertError.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not save items.' };
  }
}

async function syncListingCompletionStatus(itemId: string): Promise<boolean> {
  const subitems = await getListingSubitems(itemId);
  if (subitems.length > 0) {
    const allClaimed = subitems.every((s) => s.status === 'claimed');
    if (allClaimed) {
      return updateSupabaseItemStatus(itemId, 'completed');
    }
    return true;
  }

  const { count } = await supabase
    .from('item_claims')
    .select('id', { count: 'exact', head: true })
    .eq('itemId', itemId)
    .is('subItemId', null);

  if ((count ?? 0) > 0) {
    return updateSupabaseItemStatus(itemId, 'completed');
  }
  return true;
}

async function recordPartialItemClaims(params: {
  itemId: string;
  itemTitle: string;
  giverUserId: string;
  claimerUserId: string;
  chatId: string;
  subItemIds: string[] | null;
  claimRequestId?: string;
  claimMessage: string;
  actorUserId: string;
}): Promise<{ ok: boolean; errorMessage?: string; confirmedLabels?: string[] }> {
  const subitems = await getListingSubitems(params.itemId);
  const now = new Date().toISOString();
  const confirmedLabels: string[] = [];

  try {
    if (subitems.length > 0) {
      const ids = params.subItemIds ?? [];
      if (ids.length === 0) {
        return { ok: false, errorMessage: 'Select at least one item to confirm.' };
      }

      for (const subId of ids) {
        const sub = subitems.find((s) => s.id === subId);
        if (!sub) return { ok: false, errorMessage: 'One of the selected items was not found.' };
        if (sub.status === 'claimed') {
          return { ok: false, errorMessage: `"${sub.label}" was already claimed.` };
        }
        if (sub.status !== 'available' && sub.status !== 'pending_pickup') {
          return { ok: false, errorMessage: `"${sub.label}" is not available to confirm.` };
        }
      }

      for (const subId of ids) {
        const sub = subitems.find((s) => s.id === subId)!;
        const claimId = `claim_${params.itemId}_${subId}_${Date.now()}`;

        const { error: claimError } = await supabase.from('item_claims').insert({
          id: claimId,
          itemId: params.itemId,
          subItemId: subId,
          claimRequestId: params.claimRequestId || null,
          giverUserId: params.giverUserId,
          claimerUserId: params.claimerUserId,
          chatId: params.chatId,
          kind: 'giveaway',
          createdAt: now,
        });

        if (claimError) {
          const msg = String(claimError.message || '').toLowerCase();
          if (msg.includes('duplicate') || msg.includes('unique')) {
            return { ok: false, errorMessage: `"${sub.label}" was already claimed.` };
          }
          if (claimError.code === '42P01') {
            return { ok: false, errorMessage: 'Run section 15 in complete-schema.sql (multi-item claims).' };
          }
          return { ok: false, errorMessage: claimError.message };
        }

        await supabase
          .from('listing_subitems')
          .update({ status: 'claimed', claimedAt: now })
          .eq('id', subId);

        confirmedLabels.push(sub.label);
      }
    } else {
      const claimId = `claim_${params.itemId}_${Date.now()}`;
      const { error: claimError } = await supabase.from('item_claims').insert({
        id: claimId,
        itemId: params.itemId,
        subItemId: null,
        claimRequestId: params.claimRequestId || null,
        giverUserId: params.giverUserId,
        claimerUserId: params.claimerUserId,
        chatId: params.chatId,
        kind: 'giveaway',
        createdAt: now,
      });

      if (claimError) {
        const msg = String(claimError.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) {
          return { ok: false, errorMessage: 'This item was already marked as claimed.' };
        }
        return { ok: false, errorMessage: claimError.message };
      }
      confirmedLabels.push(params.itemTitle);
    }

    await syncListingCompletionStatus(params.itemId);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const msgOk = await createSupabaseMessage(
      params.chatId,
      params.claimMessage,
      params.actorUserId,
      messageId,
      { skipPush: true },
    );

    if (!msgOk) {
      return { ok: false, errorMessage: 'Pickup recorded but chat message failed to send.' };
    }

    await runPushTask(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAfterClaimConfirmed({
          itemId: params.itemId,
          itemTitle: params.itemTitle,
          posterUserId: params.giverUserId,
          claimerUserId: params.claimerUserId,
          claimerName: '',
        }),
      ),
    );

    return { ok: true, confirmedLabels };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not record pickup.' };
  }
}

export async function submitSelfClaimRequest(params: {
  item: ItemPost;
  claimer: UserProfile;
  subItemIds: string[];
}): Promise<{ ok: boolean; chatId?: string; errorMessage?: string }> {
  return submitSelfHandoffRequest({
    item: params.item,
    actor: params.claimer,
    subItemIds: params.subItemIds,
    kind: 'pickup',
  });
}

/** PWA / web handoff — claimer says "I picked up" or helper says "I dropped off"; poster confirms in chat. */
export async function submitSelfHandoffRequest(params: {
  item: ItemPost;
  actor: UserProfile;
  subItemIds: string[];
  kind: 'pickup' | 'dropoff';
}): Promise<{ ok: boolean; chatId?: string; errorMessage?: string }> {
  const { item, actor, kind } = params;

  if (kind === 'pickup') {
    if (item.type !== 'giveaway' || item.status !== 'active') {
      return { ok: false, errorMessage: 'This listing is not available to claim.' };
    }
  } else {
    if (item.type !== 'looking' || item.status !== 'active') {
      return { ok: false, errorMessage: 'This request is not open for drop-off confirmation.' };
    }
  }

  if (item.userId === actor.uid) {
    return { ok: false, errorMessage: 'You cannot confirm your own listing.' };
  }

  const subitems = await getListingSubitems(item.id);
  let targetIds = params.subItemIds;

  if (kind === 'pickup' && subitems.length > 0) {
    const available = subitems.filter((s) => s.status === 'available');
    if (targetIds.length !== 1) {
      return { ok: false, errorMessage: 'Pick exactly one item you picked up.' };
    }
    const subId = targetIds[0];
    const sub = available.find((s) => s.id === subId);
    if (!sub) {
      return { ok: false, errorMessage: 'That item is no longer available to claim.' };
    }
    targetIds = [subId];
  } else if (kind === 'pickup') {
    targetIds = [];
  } else {
    targetIds = [];
  }

  const posterUserId = item.userId;
  const chatId = buildDmChatId(actor.uid, posterUserId);
  const chatPayload = {
    id: chatId,
    participantIds: [actor.uid, posterUserId].sort(),
    participantNames: {
      [actor.uid]: actor.displayName,
      [posterUserId]: item.userDisplayName,
    },
    participantPhotos: {
      [actor.uid]: actor.photoURL || '',
      [posterUserId]: item.userPhotoURL || '',
    },
    lastMessageAt: new Date().toISOString(),
    lastMessageText: '',
    lastMessageSenderId: actor.uid,
    itemId: item.id,
    itemTitle: item.title,
  };

  const chatOk = await getOrCreateSupabaseChat(chatId, chatPayload);
  if (!chatOk) {
    return { ok: false, errorMessage: 'Could not open chat with the poster.' };
  }

  const requestId = `clreq_${item.id}_${Date.now()}`;
  const { error: reqError } = await supabase.from('item_claim_requests').insert({
    id: requestId,
    itemId: item.id,
    giverUserId: posterUserId,
    claimerUserId: actor.uid,
    claimerName: actor.displayName,
    subItemIds: JSON.stringify(targetIds),
    status: 'pending',
    chatId,
    createdAt: new Date().toISOString(),
  });

  if (reqError) {
    if (reqError.code === '42P01') {
      return { ok: false, errorMessage: 'Run section 15 in complete-schema.sql (item_claim_requests).' };
    }
    return { ok: false, errorMessage: reqError.message };
  }

  if (kind === 'pickup' && targetIds.length === 1) {
    const { error: holdError } = await supabase
      .from('listing_subitems')
      .update({ status: 'pending_pickup' })
      .eq('id', targetIds[0])
      .eq('status', 'available');
    if (holdError) {
      await supabase.from('item_claim_requests').delete().eq('id', requestId);
      return { ok: false, errorMessage: 'Could not reserve that item — someone else may have claimed it.' };
    }
  }

  const labels =
    kind === 'pickup' && subitems.length > 0
      ? subitems.filter((s) => targetIds.includes(s.id)).map((s) => s.label)
      : [item.title];

  const handoffMessage =
    kind === 'dropoff'
      ? formatSelfDropOffRequestMessage(actor.displayName, item.title)
      : formatSelfClaimRequestMessage(actor.displayName, labels);

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const msgOk = await createSupabaseMessage(chatId, handoffMessage, actor.uid, messageId);

  if (!msgOk) {
    return { ok: false, errorMessage: 'Handoff request saved but message failed to send.' };
  }

  await runPushTask(() =>
    import('./lib/pushIntegration').then((m) =>
      m.pushAfterClaimRequest({
        item,
        claimerName: actor.displayName,
        requestId,
      }),
    ),
  );

  return { ok: true, chatId };
}

export async function getClaimRequestById(requestId: string): Promise<ItemClaimRequest | null> {
  try {
    const { data, error } = await supabase
      .from('item_claim_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (error || !data) return null;
    return normalizeClaimRequest(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getPendingClaimRequestsForChat(chatId: string): Promise<ItemClaimRequest[]> {
  try {
    const { data, error } = await supabase
      .from('item_claim_requests')
      .select('*')
      .eq('chatId', chatId)
      .eq('status', 'pending')
      .order('createdAt', { ascending: true });

    if (error) return [];
    return (data ?? []).map((row) => normalizeClaimRequest(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function confirmClaimRequest(params: {
  requestId: string;
  actor: UserProfile;
  subItemIds?: string[];
  itemTitle: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data, error } = await supabase
      .from('item_claim_requests')
      .select('*')
      .eq('id', params.requestId)
      .maybeSingle();

    if (error || !data) return { ok: false, errorMessage: 'Claim request not found.' };
    const request = normalizeClaimRequest(data as Record<string, unknown>);

    if (request.status !== 'pending') {
      return { ok: false, errorMessage: 'This claim request was already handled.' };
    }
    if (request.giverUserId !== params.actor.uid) {
      return { ok: false, errorMessage: 'Only the poster can confirm handoffs.' };
    }

    const { data: itemRow } = await supabase.from('items').select('type, title').eq('id', request.itemId).maybeSingle();
    const itemType = itemRow?.type as ItemPost['type'] | undefined;
    const itemTitle = params.itemTitle || String(itemRow?.title ?? '');

    if (itemType === 'looking') {
      const fulfillResult = await markItemFulfilledFromChat({
        itemId: request.itemId,
        ownerUserId: request.giverUserId,
        helperUserId: request.claimerUserId,
        chatId: request.chatId,
        message: formatItemFulfilledChatMessage(itemTitle, request.claimerName),
      });
      if (!fulfillResult.ok) return fulfillResult;

      await supabase.from('item_claim_requests').update({ status: 'confirmed' }).eq('id', request.id);
      return { ok: true };
    }

    const ids = params.subItemIds ?? request.subItemIds;
    const subitems = await getListingSubitems(request.itemId);
    const labels =
      subitems.length > 0
        ? subitems.filter((s) => ids.includes(s.id)).map((s) => s.label)
        : [params.itemTitle];

    const result = await recordPartialItemClaims({
      itemId: request.itemId,
      itemTitle: params.itemTitle,
      giverUserId: request.giverUserId,
      claimerUserId: request.claimerUserId,
      chatId: request.chatId,
      subItemIds: subitems.length > 0 ? ids : null,
      claimRequestId: request.id,
      claimMessage: formatItemClaimedChatMessage(params.itemTitle, labels),
      actorUserId: params.actor.uid,
    });

    if (!result.ok) return result;

    await supabase
      .from('item_claim_requests')
      .update({ status: 'confirmed' })
      .eq('id', request.id);

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not confirm claim.' };
  }
}

export async function rejectClaimRequest(params: {
  requestId: string;
  actor: UserProfile;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data, error } = await supabase
      .from('item_claim_requests')
      .select('*')
      .eq('id', params.requestId)
      .maybeSingle();

    if (error || !data) return { ok: false, errorMessage: 'Claim request not found.' };
    const request = normalizeClaimRequest(data as Record<string, unknown>);
    if (request.status !== 'pending') {
      return { ok: false, errorMessage: 'This claim request was already handled.' };
    }
    if (request.giverUserId !== params.actor.uid) {
      return { ok: false, errorMessage: 'Only the poster can reject pickups.' };
    }

    const { error: updateError } = await supabase
      .from('item_claim_requests')
      .update({ status: 'rejected' })
      .eq('id', params.requestId);
    if (updateError) return { ok: false, errorMessage: updateError.message };

    const subitems = await getListingSubitems(request.itemId);
    const releasedLabels =
      subitems.length > 0 && request.subItemIds.length > 0
        ? subitems.filter((s) => request.subItemIds.includes(s.id)).map((s) => s.label)
        : [];

    for (const subId of request.subItemIds) {
      await supabase
        .from('listing_subitems')
        .update({ status: 'available', claimedAt: null })
        .eq('id', subId)
        .eq('status', 'pending_pickup');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const releaseNote =
      releasedLabels.length > 0
        ? ` ${releasedLabels.join(', ')} ${releasedLabels.length === 1 ? 'is' : 'are'} available again.`
        : '';
    await createSupabaseMessage(
      request.chatId,
      `That wasn't them — the poster marked the wrong neighbor.${releaseNote}`,
      params.actor.uid,
      messageId,
    );

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not reject claim.' };
  }
}

export async function recordItemClaimInChat(params: {
  itemId: string;
  itemTitle: string;
  giverUserId: string;
  claimerUserId: string;
  chatId: string;
  claimMessage: string;
  subItemIds?: string[];
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const subitems = await getListingSubitems(params.itemId);

  if (subitems.length > 0 && (params.subItemIds?.length ?? 0) !== 1) {
    return { ok: false, errorMessage: 'Select exactly one item they picked up.' };
  }

  const ids = subitems.length > 0 ? params.subItemIds ?? [] : null;
  const labels =
    subitems.length > 0 && ids
      ? subitems.filter((s) => ids.includes(s.id)).map((s) => s.label)
      : [params.itemTitle];

  const result = await recordPartialItemClaims({
    itemId: params.itemId,
    itemTitle: params.itemTitle,
    giverUserId: params.giverUserId,
    claimerUserId: params.claimerUserId,
    chatId: params.chatId,
    subItemIds: ids,
    claimMessage: formatItemClaimedChatMessage(params.itemTitle, labels),
    actorUserId: params.giverUserId,
  });

  return result;
}

/** Go Get handoff — marks giveaway claimed, listing completed, and profile stats for both neighbors. */
export async function recordGiveawayPickupFromGoGet(params: {
  itemId: string;
  itemTitle: string;
  giverUserId: string;
  claimerUserId: string;
  chatId: string;
  claimMessage: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const subitems = await getListingSubitems(params.itemId);
  const availableIds =
    subitems.length > 0
      ? subitems
          .filter((s) => s.status === 'available' || s.status === 'pending_pickup')
          .map((s) => s.id)
      : null;

  if (subitems.length > 0 && (availableIds?.length ?? 0) === 0) {
    return { ok: false, errorMessage: 'This listing was already marked as picked up.' };
  }

  return recordPartialItemClaims({
    itemId: params.itemId,
    itemTitle: params.itemTitle,
    giverUserId: params.giverUserId,
    claimerUserId: params.claimerUserId,
    chatId: params.chatId,
    subItemIds: availableIds,
    claimMessage: params.claimMessage,
    actorUserId: params.giverUserId,
  });
}

function buildPickupAttributionPayload(input: PickupAttributionInput | null): Record<string, unknown> {
  if (!input) {
    return {
      pickupAttributionType: null,
      pickupAttributionUserId: null,
      pickupAttributionLabel: null,
    };
  }

  let label: string | null = null;
  if (input.type === 'facebook_group' || input.type === 'other') {
    label = input.label?.trim() || (input.type === 'other' ? 'Other' : null);
  } else if (input.type === 'reddit') {
    label = 'r/SacramentoBuyNothing';
  } else if (input.type === 'buynothing_project') {
    label = 'BuyNothing Project';
  } else if (input.type === 'app_user') {
    label = input.userDisplayName?.trim() || null;
  }

  return {
    pickupAttributionType: input.type,
    pickupAttributionUserId: input.type === 'app_user' ? input.userId || null : null,
    pickupAttributionLabel: label,
  };
}

async function markAllSubitemsClaimed(itemId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('listing_subitems')
    .update({ status: 'claimed', claimedAt: now })
    .eq('itemId', itemId)
    .eq('status', 'available');
}

export async function itemHasRecordedAppClaim(itemId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('item_claims')
    .select('id', { count: 'exact', head: true })
    .eq('itemId', itemId);

  if (error) {
    handleSupabaseError(error, 'item_claims');
    return false;
  }
  return (count ?? 0) > 0;
}

export async function getAppClaimsForItem(
  itemId: string,
): Promise<{ claimerUserId: string; giverUserId: string; kind: string }[]> {
  try {
    const { data, error } = await supabase
      .from('item_claims')
      .select('claimerUserId, giverUserId, kind')
      .eq('itemId', itemId);

    if (error) return [];
    return (data ?? []).map((row) => ({
      claimerUserId: String((row as Record<string, unknown>).claimerUserId),
      giverUserId: String((row as Record<string, unknown>).giverUserId),
      kind: String((row as Record<string, unknown>).kind ?? 'giveaway'),
    }));
  } catch {
    return [];
  }
}

export async function submitClaimDisputeSupportTicket(params: {
  opener: UserProfile;
  item: ItemPost;
  chatId: string;
  note?: string;
}): Promise<{ ok: boolean; ticketId?: string; errorMessage?: string }> {
  const claims = await getAppClaimsForItem(params.item.id);
  const claimSummary =
    claims.length > 0
      ? claims.map((c) => `• recorded claimer uid: ${c.claimerUserId} (${c.kind})`).join('\n')
      : '• no in-app claim record yet';

  const message = [
    `Listing: "${params.item.title}" (${params.item.id})`,
    `Type: ${params.item.type} · Status: ${params.item.status}`,
    `Chat: ${params.chatId}`,
    '',
    'I believe the wrong neighbor was marked or someone else picked up / dropped off.',
    claimSummary,
    '',
    params.note?.trim() || '(Neighbor did not add extra details.)',
    '',
    'Please review the listing claim record and adjust if needed.',
  ].join('\n');

  return createSupportTicket({
    opener: params.opener,
    subject: `Wrong pickup claim — ${params.item.title}`.slice(0, 120),
    message,
  });
}

/** Staff: mark listing completed with off-app / unnamed attribution (no specific neighbor credited). */
export async function staffCompleteListingWithoutClaimer(
  item: Pick<ItemPost, 'id' | 'title' | 'userId' | 'userDisplayName'>,
  actor: Pick<UserProfile, 'uid' | 'displayName' | 'role'>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!isStaffRole(actor.role)) {
    return { ok: false, errorMessage: 'Staff only.' };
  }

  const { error } = await supabase
    .from('items')
    .update({
      status: 'completed',
      pickupAttributionType: 'other',
      pickupAttributionUserId: null,
      pickupAttributionLabel: 'Claimed (corrected by staff — no app user named)',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', item.id);

  if (error) {
    handleSupabaseError(error, 'items');
    return { ok: false, errorMessage: error.message };
  }

  await markAllSubitemsClaimed(item.id);
  await writeModerationAudit({
    actor: actor as UserProfile,
    target: { uid: item.userId, displayName: item.userDisplayName },
    action: 'complete_listing_staff',
    detail: `"${item.title}" marked completed without naming a claimer`,
  });

  return { ok: true };
}

export async function getFacebookPickupGroups(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('facebook_pickup_groups')
      .select('name')
      .order('useCount', { ascending: false })
      .order('lastUsedAt', { ascending: false })
      .limit(40);

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'facebook_pickup_groups');
      return [];
    }

    return (data || []).map((row) => String((row as { name: string }).name));
  } catch {
    return [];
  }
}

export async function rememberFacebookPickupGroup(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const { data: existing } = await supabase
      .from('facebook_pickup_groups')
      .select('id, useCount')
      .eq('name', trimmed)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      await supabase
        .from('facebook_pickup_groups')
        .update({
          useCount: Number((existing as { useCount?: number }).useCount ?? 0) + 1,
          lastUsedAt: now,
        })
        .eq('id', String((existing as { id: string }).id));
      return;
    }

    await supabase.from('facebook_pickup_groups').insert({
      name: trimmed,
      useCount: 1,
      lastUsedAt: now,
      createdAt: now,
    });
  } catch (err) {
    console.warn('Could not remember Facebook pickup group:', err);
  }
}

function mergePickupCandidates(
  lists: PickupNeighborCandidate[][],
): PickupNeighborCandidate[] {
  const seen = new Set<string>();
  const merged: PickupNeighborCandidate[] = [];
  for (const list of lists) {
    for (const candidate of list) {
      if (seen.has(candidate.userId)) continue;
      seen.add(candidate.userId);
      merged.push(candidate);
    }
  }
  return merged;
}

export async function getPickupNeighborCandidates(
  itemId: string,
  ownerUserId: string,
): Promise<PickupNeighborCandidate[]> {
  const chatCandidates: PickupNeighborCandidate[] = [];
  const voteCandidates: PickupNeighborCandidate[] = [];

  try {
    const { data: chats } = await supabase.from('chats').select('participantIds, participantNames, participantPhotos').eq('itemId', itemId);
    for (const chat of chats || []) {
      const ids = Array.isArray((chat as { participantIds?: unknown }).participantIds)
        ? ((chat as { participantIds: string[] }).participantIds)
        : [];
      const names = ((chat as { participantNames?: Record<string, string> }).participantNames) || {};
      const photos = ((chat as { participantPhotos?: Record<string, string> }).participantPhotos) || {};
      for (const uid of ids) {
        if (!uid || uid === ownerUserId) continue;
        chatCandidates.push({
          userId: uid,
          displayName: names[uid] || 'Neighbor',
          photoURL: photos[uid] || undefined,
          source: 'chat',
        });
      }
    }

    const { data: votes } = await supabase
      .from('item_votes')
      .select('userId')
      .eq('itemId', itemId)
      .eq('voteType', 'up');

    const voterIds = [...new Set((votes || []).map((row) => String((row as { userId: string }).userId)).filter((uid) => uid && uid !== ownerUserId))];
    if (voterIds.length > 0) {
      const { data: users } = await supabase
        .from('users_public')
        .select('uid, displayName, photoURL, neighborhood, role')
        .in('uid', voterIds);

      for (const row of users || []) {
        voteCandidates.push({
          userId: String((row as { uid: string }).uid),
          displayName: String((row as { displayName?: string }).displayName || 'Neighbor'),
          photoURL: (row as { photoURL?: string }).photoURL || undefined,
          neighborhood: (row as { neighborhood?: string }).neighborhood || undefined,
          role: (row as { role?: UserProfile['role'] }).role,
          source: 'interest',
        });
      }
    }
  } catch (err) {
    console.warn('Could not load pickup neighbor candidates:', err);
  }

  return mergePickupCandidates([chatCandidates, voteCandidates]);
}

export async function searchPickupNeighbors(
  query: string,
  ownerUserId: string,
  limit = 12,
): Promise<PickupNeighborCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('users_public')
      .select('uid, displayName, photoURL, neighborhood, role')
      .neq('uid', ownerUserId)
      .ilike('displayName', `%${trimmed}%`)
      .limit(limit);

    if (error) {
      handleSupabaseError(error, 'users_public');
      return [];
    }

    return (data || []).map((row) => ({
      userId: String((row as { uid: string }).uid),
      displayName: String((row as { displayName?: string }).displayName || 'Neighbor'),
      photoURL: (row as { photoURL?: string }).photoURL || undefined,
      neighborhood: (row as { neighborhood?: string }).neighborhood || undefined,
      role: (row as { role?: UserProfile['role'] }).role,
      source: 'search' as const,
    }));
  } catch {
    return [];
  }
}

async function recordAppUserPickupClaim(params: {
  item: ItemPost;
  owner: UserProfile;
  claimerUserId: string;
  claimerDisplayName: string;
  claimerPhotoURL?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const chatId = buildDmChatId(params.claimerUserId, params.owner.uid);
  const chatPayload = {
    id: chatId,
    participantIds: [params.claimerUserId, params.owner.uid].sort(),
    participantNames: {
      [params.claimerUserId]: params.claimerDisplayName,
      [params.owner.uid]: params.owner.displayName,
    },
    participantPhotos: {
      [params.claimerUserId]: params.claimerPhotoURL || '',
      [params.owner.uid]: params.owner.photoURL || '',
    },
    lastMessageAt: new Date().toISOString(),
    lastMessageText: '',
    lastMessageSenderId: params.owner.uid,
    itemId: params.item.id,
    itemTitle: params.item.title,
  };

  const chatOk = await getOrCreateSupabaseChat(chatId, chatPayload);
  if (!chatOk) {
    return { ok: false, errorMessage: 'Could not open chat with that neighbor.' };
  }

  const subitems = await getListingSubitems(params.item.id);
  const subItemIds =
    subitems.length > 0 ? subitems.filter((s) => s.status === 'available').map((s) => s.id) : undefined;

  if (subitems.length > 0 && (!subItemIds || subItemIds.length === 0)) {
    const hasClaim = await itemHasRecordedAppClaim(params.item.id);
    if (hasClaim) {
      return { ok: true };
    }
    return { ok: false, errorMessage: 'All items on this listing are already marked claimed.' };
  }

  const result = await recordPartialItemClaims({
    itemId: params.item.id,
    itemTitle: params.item.title,
    giverUserId: params.owner.uid,
    claimerUserId: params.claimerUserId,
    chatId,
    subItemIds: subitems.length > 0 ? subItemIds ?? [] : null,
    claimMessage: formatItemClaimedChatMessage(
      params.item.title,
      subitems.length > 0
        ? subitems.filter((s) => (subItemIds ?? []).includes(s.id)).map((s) => s.label)
        : [params.item.title],
    ),
    actorUserId: params.owner.uid,
  });

  return result;
}

export async function completeItemWithPickupAttribution(params: {
  item: ItemPost;
  owner: UserProfile;
  attribution: PickupAttributionInput | null;
  markCompleted: boolean;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { item, owner, attribution, markCompleted } = params;

  if (item.userId !== owner.uid) {
    return { ok: false, errorMessage: 'Only the listing owner can update pickup attribution.' };
  }

  try {
    if (attribution?.type === 'app_user' && attribution.userId) {
      const claimResult = await recordAppUserPickupClaim({
        item,
        owner,
        claimerUserId: attribution.userId,
        claimerDisplayName: attribution.userDisplayName || 'Neighbor',
      });
      if (!claimResult.ok) return claimResult;

      const { error } = await supabase
        .from('items')
        .update({
          ...buildPickupAttributionPayload(attribution),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) {
        handleSupabaseError(error, 'items');
        return { ok: false, errorMessage: error.message };
      }

      return { ok: true };
    }

    const itemUpdate: Record<string, unknown> = {
      ...buildPickupAttributionPayload(attribution),
      updatedAt: new Date().toISOString(),
    };
    if (markCompleted) {
      itemUpdate.status = 'completed';
    }

    const { error: itemError } = await supabase.from('items').update(itemUpdate).eq('id', item.id);
    if (itemError) {
      handleSupabaseError(itemError, 'items');
      return { ok: false, errorMessage: itemError.message };
    }

    if (markCompleted) {
      await markAllSubitemsClaimed(item.id);
      await runPushTask(() =>
        import('./lib/pushIntegration').then((m) =>
          m.pushAfterItemStatusChange(item.id, 'completed', item.status),
        ),
      );
    }

    if (attribution?.type === 'facebook_group' && attribution.label) {
      await rememberFacebookPickupGroup(attribution.label);
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not save pickup attribution.',
    };
  }
}

export async function markItemFulfilledFromChat(params: {
  itemId: string;
  ownerUserId: string;
  helperUserId: string;
  chatId: string;
  message: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const claimId = `fulfill_${params.itemId}_${Date.now()}`;

    const { error: claimError } = await supabase.from('item_claims').insert({
      id: claimId,
      itemId: params.itemId,
      giverUserId: params.helperUserId,
      claimerUserId: params.ownerUserId,
      chatId: params.chatId,
      kind: 'request_fulfilled',
      createdAt: new Date().toISOString(),
    });

    if (claimError) {
      const msg = String(claimError.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return { ok: false, errorMessage: 'This request was already marked as fulfilled.' };
      }
      if (claimError.code === 'PGRST204' || claimError.code === '42P01' || msg.includes('item_claims')) {
        return {
          ok: false,
          errorMessage: 'Claims table missing — run the item_claims SQL in Supabase (see complete-schema.sql).',
        };
      }
      if (msg.includes('kind') || msg.includes('column')) {
        return {
          ok: false,
          errorMessage:
            'Claims table needs the kind column — re-run section 7 in complete-schema.sql (request_fulfilled support).',
        };
      }
      return { ok: false, errorMessage: claimError.message || 'Could not record fulfillment.' };
    }

    const statusOk = await updateSupabaseItemStatus(params.itemId, 'completed');
    if (!statusOk) {
      return { ok: false, errorMessage: 'Fulfillment saved but listing status could not be updated.' };
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const msgOk = await createSupabaseMessage(
      params.chatId,
      params.message,
      params.ownerUserId,
      messageId,
      { skipPush: true },
    );
    if (!msgOk) {
      return { ok: false, errorMessage: 'Request marked fulfilled but chat message failed.' };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not mark as fulfilled.';
    return { ok: false, errorMessage: message };
  }
}

export async function markTradeCompletedFromChat(params: {
  itemId: string;
  posterUserId: string;
  partnerUserId: string;
  chatId: string;
  message: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const claimId = `trade_${params.itemId}_${Date.now()}`;

    const { error: claimError } = await supabase.from('item_claims').insert({
      id: claimId,
      itemId: params.itemId,
      giverUserId: params.posterUserId,
      claimerUserId: params.partnerUserId,
      chatId: params.chatId,
      kind: 'trade_completed',
      createdAt: new Date().toISOString(),
    });

    if (claimError) {
      const msg = String(claimError.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return { ok: false, errorMessage: 'This trade was already marked as completed.' };
      }
      if (claimError.code === 'PGRST204' || claimError.code === '42P01' || msg.includes('item_claims')) {
        return {
          ok: false,
          errorMessage: 'Claims table missing — run the item_claims SQL in Supabase (see complete-schema.sql).',
        };
      }
      if (msg.includes('kind') || msg.includes('column')) {
        return {
          ok: false,
          errorMessage:
            'Claims table needs trade_completed support — re-run section 7 in complete-schema.sql.',
        };
      }
      return { ok: false, errorMessage: claimError.message || 'Could not record trade.' };
    }

    const statusOk = await updateSupabaseItemStatus(params.itemId, 'completed', params.posterUserId);
    if (!statusOk) {
      return { ok: false, errorMessage: 'Trade saved but listing status could not be updated.' };
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const msgOk = await createSupabaseMessage(
      params.chatId,
      params.message,
      params.posterUserId,
      messageId,
      { skipPush: true },
    );
    if (!msgOk) {
      return { ok: false, errorMessage: 'Trade marked complete but chat message failed.' };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not mark trade as completed.';
    return { ok: false, errorMessage: message };
  }
}

export async function createSupabaseMessage(
  chatId: string,
  text: string,
  senderId: string,
  messageId: string,
  options?: { skipPush?: boolean; postedAsNeighbor?: boolean },
): Promise<boolean> {
  try {
    const timeIso = new Date().toISOString();

    // 1. Insert message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        chatId: chatId,
        senderId: senderId,
        text: text,
        postedAsNeighbor: options?.postedAsNeighbor === true,
        createdAt: timeIso
      });

    if (msgError) {
      handleSupabaseError(msgError, 'messages');
      return false;
    }

    // 2. Update chat header
    const { error: chatUpdateError } = await supabase
      .from('chats')
      .update({
        lastMessageText: text,
        lastMessageSenderId: senderId,
        lastMessageAt: timeIso
      })
      .eq('id', chatId);

    if (chatUpdateError) {
      handleSupabaseError(chatUpdateError, 'chats');
      throw chatUpdateError;
    }

    setSupabaseConfigurationState(true);
    if (!options?.skipPush) {
      if (isCommunityChat(chatId)) {
        await runPushTask(() =>
          import('./lib/pushIntegration').then((m) =>
            m.pushAfterCommunityMessage(chatId, senderId, text, messageId),
          ),
        );
      } else {
        await runPushTask(() =>
          import('./lib/pushIntegration').then((m) => m.pushAfterMessage(chatId, senderId, text, messageId)),
        );
      }
    }
    return true;
  } catch (err: any) {
    console.error('Supabase write message failed:', err);
    handleSupabaseError(err, 'messages');
    return false;
  }
}

export async function deleteSupabaseMessage(
  messageId: string,
  chatId: string,
  actor: Pick<UserProfile, 'uid' | 'role'>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('id, senderId, chatId')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError) {
      handleSupabaseError(fetchError, 'messages');
      return { ok: false, errorMessage: fetchError.message };
    }
    if (!msg) {
      return { ok: false, errorMessage: 'Message not found or already removed.' };
    }
    if (msg.chatId !== chatId) {
      return { ok: false, errorMessage: 'Message not in this chat.' };
    }
    if (!canDeleteChatMessage(actor, msg, chatId)) {
      return { ok: false, errorMessage: 'You cannot delete this message.' };
    }

    const { error: deleteError, count } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('id', messageId);

    if (deleteError) {
      handleSupabaseError(deleteError, 'messages');
      return { ok: false, errorMessage: deleteError.message };
    }
    if (count === 0) {
      return { ok: false, errorMessage: 'Message not found or already removed.' };
    }

    const { data: latestMsgs, error: latestError } = await supabase
      .from('messages')
      .select('text, senderId, createdAt')
      .eq('chatId', chatId)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (latestError) {
      handleSupabaseError(latestError, 'messages');
    } else if (latestMsgs?.length) {
      const latest = latestMsgs[0];
      const { error: chatUpdateError } = await supabase
        .from('chats')
        .update({
          lastMessageText: latest.text,
          lastMessageSenderId: latest.senderId,
          lastMessageAt: latest.createdAt,
        })
        .eq('id', chatId);

      if (chatUpdateError) {
        handleSupabaseError(chatUpdateError, 'chats');
      }
    } else {
      let lastMessageText = '';
      if (isGlobalCommunityChat(chatId)) {
        lastMessageText = 'Welcome to the community chat — say hello!';
      } else if (isStaffCommunityChat(chatId)) {
        lastMessageText = 'Staff lounge — team coordination.';
      }

      const { error: chatClearError } = await supabase
        .from('chats')
        .update({
          lastMessageText,
          lastMessageSenderId: '',
          lastMessageAt: new Date().toISOString(),
        })
        .eq('id', chatId);

      if (chatClearError) {
        handleSupabaseError(chatClearError, 'chats');
      }
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete message.' };
  }
}

/**
 * --- ITEM VOTES ---
 */
export async function getSupabaseItemVotes(itemIds: string[]): Promise<ItemVote[]> {
  if (itemIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('item_votes')
      .select('*')
      .in('itemId', itemIds);

    if (error) {
      handleSupabaseError(error, 'item_votes');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []) as ItemVote[];
  } catch (err: any) {
    handleSupabaseError(err, 'item_votes');
    return [];
  }
}

export type VoteWriteResult =
  | { ok: true }
  | { ok: false; reason: 'vote_cooldown' | 'error' };

async function userHasItemVote(itemId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('item_votes')
    .select('itemId')
    .eq('itemId', itemId)
    .eq('userId', userId)
    .maybeSingle();
  return !!data;
}

async function countRecentItemVotes(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - VOTE_COOLDOWN_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('item_votes')
    .select('itemId', { count: 'exact', head: true })
    .eq('userId', userId)
    .gte('createdAt', cutoff);
  if (error) {
    handleSupabaseError(error, 'item_votes');
    return 0;
  }
  return count ?? 0;
}

async function userHasCommunityContentVote(
  targetType: CommunityContentVoteTarget,
  targetId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('community_content_votes')
    .select('id')
    .eq('targetType', targetType)
    .eq('targetId', targetId)
    .eq('userId', userId)
    .maybeSingle();
  return !!data;
}

async function countRecentCommunityContentVotes(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - VOTE_COOLDOWN_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('community_content_votes')
    .select('id', { count: 'exact', head: true })
    .eq('userId', userId)
    .gte('createdAt', cutoff);
  if (error) {
    handleSupabaseError(error, 'community_content_votes');
    return 0;
  }
  return count ?? 0;
}

export async function setSupabaseItemVote(
  itemId: string,
  userId: string,
  voteType: 'up' | 'down' | null,
): Promise<VoteWriteResult> {
  try {
    if (!voteType) {
      const { error: deleteError } = await supabase
        .from('item_votes')
        .delete()
        .eq('itemId', itemId)
        .eq('userId', userId);

      if (deleteError) {
        handleSupabaseError(deleteError, 'item_votes');
        return { ok: false, reason: 'error' };
      }
      setSupabaseConfigurationState(true);
      return { ok: true };
    }

    const alreadyVoted = await userHasItemVote(itemId, userId);
    if (!alreadyVoted) {
      const recentVotes = await countRecentItemVotes(userId);
      if (recentVotes >= VOTE_COOLDOWN_MAX_NEW_VOTES) {
        return { ok: false, reason: 'vote_cooldown' };
      }
    }

    const { error } = await supabase
      .from('item_votes')
      .upsert(
        { itemId, userId, voteType, createdAt: new Date().toISOString() },
        { onConflict: 'itemId,userId' }
      );

    if (error) {
      handleSupabaseError(error, 'item_votes');
      return { ok: false, reason: 'error' };
    }

    await runPushTask(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAfterItemVote({ itemId, voterUserId: userId, voteType }),
      ),
    );

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: any) {
    handleSupabaseError(err, 'item_votes');
    return { ok: false, reason: 'error' };
  }
}

/**
 * --- ITEM COMMENTS ---
 */
export async function getSupabaseItemComments(itemIds: string[]): Promise<ItemComment[]> {
  if (itemIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('item_comments')
      .select('*')
      .in('itemId', itemIds)
      .order('createdAt', { ascending: true });

    if (error) {
      handleSupabaseError(error, 'item_comments');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []) as ItemComment[];
  } catch (err: any) {
    handleSupabaseError(err, 'item_comments');
    return [];
  }
}

export async function createSupabaseItemComment(comment: ItemComment): Promise<boolean> {
  try {
    const payload = {
      ...comment,
      createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : new Date().toISOString()
    };
    const { error } = await supabase
      .from('item_comments')
      .insert(payload);

    if (error) {
      handleSupabaseError(error, 'item_comments');
      return false;
    }

    setSupabaseConfigurationState(true);
    await runPushTask(() => import('./lib/pushIntegration').then((m) => m.pushAfterComment(comment)));
    return true;
  } catch (err: any) {
    handleSupabaseError(err, 'item_comments');
    return false;
  }
}

export async function deleteSupabaseItemComment(
  commentId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error, count } = await supabase
      .from('item_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('userId', userId);

    if (error) {
      handleSupabaseError(error, 'item_comments');
      return { ok: false, errorMessage: error.message };
    }
    if (count === 0) {
      return { ok: false, errorMessage: 'Comment not found or already removed.' };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete comment.' };
  }
}

/**
 * --- COMMUNITY EVENTS ---
 */
export async function getSupabaseEventById(eventId: string): Promise<CommunityEvent | null> {
  if (!eventId) return null;
  try {
    const { data, error } = await supabase.from('community_events').select('*').eq('id', eventId).maybeSingle();
    if (error) {
      handleSupabaseError(error, 'community_events');
      return null;
    }
    if (!data) return null;
    setSupabaseConfigurationState(true);
    return normalizeSupabaseEvent(data as CommunityEvent);
  } catch (err: unknown) {
    handleSupabaseError(err, 'community_events');
    return null;
  }
}

export function normalizeSupabaseEvent(row: CommunityEvent): CommunityEvent {
  return {
    ...row,
    hostedBy: row.hostedBy?.trim() || null,
    seriesId: row.seriesId?.trim() || null,
    locationLat:
      typeof row.locationLat === 'number' && Number.isFinite(row.locationLat) ? row.locationLat : null,
    locationLng:
      typeof row.locationLng === 'number' && Number.isFinite(row.locationLng) ? row.locationLng : null,
    isFree: true as const,
    status: resolveEventStatus(row),
    eventStartAt: coerceToIsoDate(row.eventStartAt),
    eventEndAt: row.eventEndAt ? coerceToIsoDate(row.eventEndAt) : null,
    createdAt: coerceToIsoDate(row.createdAt),
    updatedAt: coerceToIsoDate(row.updatedAt),
  };
}

async function syncPastEventStatuses(rows: CommunityEvent[]): Promise<void> {
  const cutoff = Date.now() - EVENT_PAST_GRACE_MS;
  const ids = rows
    .filter((row) => {
      const stored = normalizeStoredEventStatus(row.status);
      return (stored === 'active' || stored === 'upcoming') && new Date(row.eventStartAt).getTime() < cutoff;
    })
    .map((row) => row.id);

  if (ids.length === 0) return;

  try {
    await supabase
      .from('community_events')
      .update({ status: 'past', updatedAt: new Date().toISOString() })
      .in('id', ids)
      .in('status', ['active', 'upcoming']);
  } catch (err: unknown) {
    console.warn('[community_events] Could not sync past event statuses:', err);
  }
}

export async function getSupabaseEvents(): Promise<CommunityEvent[]> {
  try {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .order('eventStartAt', { ascending: true });

    if (error) {
      handleSupabaseError(error, 'community_events');
      return [];
    }

    setSupabaseConfigurationState(true);
    const rows = (data || []) as CommunityEvent[];
    void syncPastEventStatuses(rows);
    return rows.map((row) => normalizeSupabaseEvent(row));
  } catch (err: unknown) {
    handleSupabaseError(err, 'community_events');
    return [];
  }
}

export async function createSupabaseEvent(
  event: CommunityEvent,
  author?: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    if (!event.isFree) {
      return { ok: false, errorMessage: 'Only free community events are allowed.' };
    }

    if (author && !isStaffRole(author.role)) {
      const unlockStatus = await getEventsUnlockStatus();
      if (!unlockStatus.unlocked) {
        return {
          ok: false,
          errorMessage:
            'Community events unlock at 500 neighbors. Share the invite link to help us get there!',
        };
      }
    }

    if (author?.email) {
      await upsertSupabaseProfile(author);
    }

    const payload = buildCommunityEventInsertPayload(event);
    const { error } = await supabase.from('community_events').insert(payload);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not save event.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    handleSupabaseError(err, 'community_events');
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not save event.',
    };
  }
}

function buildCommunityEventInsertPayload(event: CommunityEvent) {
  return {
    ...event,
    seriesId: event.seriesId?.trim() || null,
    isFree: true,
    status: 'upcoming' as const,
    eventStartAt: new Date(event.eventStartAt).toISOString(),
    eventEndAt: event.eventEndAt ? new Date(event.eventEndAt).toISOString() : null,
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : new Date().toISOString(),
    imageUrl:
      event.imageUrl?.startsWith('http://') || event.imageUrl?.startsWith('https://')
        ? event.imageUrl
        : null,
  };
}

/** Post multiple occurrences at the same location (shared seriesId). */
export async function createSupabaseEventSeries(
  events: CommunityEvent[],
  author?: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string; count?: number }> {
  if (events.length === 0) {
    return { ok: false, errorMessage: 'Add at least one date.' };
  }

  try {
    for (const event of events) {
      if (!event.isFree) {
        return { ok: false, errorMessage: 'Only free community events are allowed.' };
      }
    }

    if (author && !isStaffRole(author.role)) {
      const unlockStatus = await getEventsUnlockStatus();
      if (!unlockStatus.unlocked) {
        return {
          ok: false,
          errorMessage:
            'Community events unlock at 500 neighbors. Share the invite link to help us get there!',
        };
      }
    }

    if (author?.email) {
      await upsertSupabaseProfile(author);
    }

    const payloads = events.map((event) => buildCommunityEventInsertPayload(event));
    const { error } = await supabase.from('community_events').insert(payloads);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not save events.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true, count: events.length };
  } catch (err: unknown) {
    handleSupabaseError(err, 'community_events');
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not save events.',
    };
  }
}

/** Update map pin on all upcoming rows in a series (same venue). */
export async function updateSupabaseEventSeriesLocation(
  seriesId: string,
  userId: string,
  locationLat: number,
  locationLng: number,
  neighborhood: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase
      .from('community_events')
      .update({
        locationLat,
        locationLng,
        neighborhood,
        updatedAt: new Date().toISOString(),
      })
      .eq('seriesId', seriesId)
      .eq('userId', userId)
      .eq('status', 'upcoming');

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not update series locations.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not update series locations.',
    };
  }
}

/** Sync shared listing fields across every upcoming row in a repeat series. */
export async function updateSupabaseEventSeriesMetadata(
  seriesId: string,
  userId: string,
  patch: {
    title: string;
    description: string;
    location: string;
    neighborhood: string;
    hostedBy: string | null;
    locationLat: number | null;
    locationLng: number | null;
    imageUrl: string | null;
  },
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase
      .from('community_events')
      .update({
        title: patch.title,
        description: patch.description,
        location: patch.location,
        neighborhood: patch.neighborhood,
        hostedBy: patch.hostedBy,
        locationLat: patch.locationLat,
        locationLng: patch.locationLng,
        imageUrl: patch.imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .eq('seriesId', seriesId)
      .eq('userId', userId)
      .eq('status', 'upcoming');

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not update series details.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not update series details.',
    };
  }
}

/** Link an existing event row into a repeat series (e.g. when adding dates later). */
export async function assignSupabaseEventSeriesId(
  eventId: string,
  userId: string,
  seriesId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase
      .from('community_events')
      .update({ seriesId, updatedAt: new Date().toISOString() })
      .eq('id', eventId)
      .eq('userId', userId);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not link event to series.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not link event to series.',
    };
  }
}

export async function updateSupabaseEvent(
  event: CommunityEvent,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    if (!event.isFree) {
      return { ok: false, errorMessage: 'Only free community events are allowed.' };
    }

    if (!isEventEditable(event)) {
      return { ok: false, errorMessage: 'Past and cancelled events cannot be edited.' };
    }

    const { error } = await supabase
      .from('community_events')
      .update({
        title: event.title,
        description: event.description,
        location: event.location,
        neighborhood: event.neighborhood,
        eventStartAt: new Date(event.eventStartAt).toISOString(),
        eventEndAt: event.eventEndAt ? new Date(event.eventEndAt).toISOString() : null,
        status: 'upcoming',
        hostedBy: event.hostedBy?.trim() || null,
        locationLat: event.locationLat ?? null,
        locationLng: event.locationLng ?? null,
        seriesId: event.seriesId?.trim() || null,
        imageUrl:
          event.imageUrl?.startsWith('http://') || event.imageUrl?.startsWith('https://')
            ? event.imageUrl
            : null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', event.id)
      .eq('userId', event.userId);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not update event.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not update event.',
    };
  }
}

export async function cancelSupabaseEvent(
  eventId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data, error: fetchError } = await supabase
      .from('community_events')
      .select('status, eventStartAt')
      .eq('id', eventId)
      .eq('userId', userId)
      .maybeSingle();

    if (fetchError || !data) {
      return { ok: false, errorMessage: fetchError?.message || 'Event not found.' };
    }

    if (!isEventEditable(data as CommunityEvent)) {
      return { ok: false, errorMessage: 'Only upcoming events can be cancelled.' };
    }

    const { error } = await supabase
      .from('community_events')
      .update({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .eq('id', eventId)
      .eq('userId', userId)
      .in('status', ['active', 'upcoming']);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not cancel event.' };
    }

    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not cancel event.',
    };
  }
}

export async function deleteSupabaseEvent(eventId: string): Promise<void> {
  await supabase.from('event_rsvps').delete().eq('eventId', eventId);
  await supabase.from('event_comments').delete().eq('eventId', eventId);
  await supabase.from('community_events').delete().eq('id', eventId);
}

export async function getSupabaseEventRsvps(eventIds: string[]): Promise<EventRsvp[]> {
  if (eventIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*')
      .in('eventId', eventIds);

    if (error) {
      handleSupabaseError(error, 'event_rsvps');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []) as EventRsvp[];
  } catch (err: unknown) {
    handleSupabaseError(err, 'event_rsvps');
    return [];
  }
}

export async function setSupabaseEventRsvp(
  eventId: string,
  userId: string,
  rsvpStatus: EventRsvp['rsvpStatus'] | null,
): Promise<boolean> {
  try {
    if (!rsvpStatus) {
      const { error: deleteError } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('eventId', eventId)
        .eq('userId', userId);

      if (deleteError) {
        handleSupabaseError(deleteError, 'event_rsvps');
        return false;
      }
      return true;
    }

    const { error } = await supabase.from('event_rsvps').upsert(
      {
        eventId,
        userId,
        rsvpStatus,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'eventId,userId' },
    );

    if (error) {
      handleSupabaseError(error, 'event_rsvps');
      return false;
    }

    setSupabaseConfigurationState(true);
    await runPushTask(async () => {
      const [{ data: event }, { data: rsvpUser }] = await Promise.all([
        supabase.from('community_events').select('userId, title').eq('id', eventId).maybeSingle(),
        supabase.from('users').select('displayName').eq('uid', userId).maybeSingle(),
      ]);
      const hostUserId = String((event as { userId?: string } | null)?.userId || '');
      if (!hostUserId || hostUserId === userId) return;
      const statusLabel =
        rsvpStatus === 'going'
          ? 'is going'
          : rsvpStatus === 'maybe'
            ? 'might go'
            : rsvpStatus === 'not_going'
              ? "can't go"
              : rsvpStatus === 'gone'
                ? 'went'
                : rsvpStatus === 'missed'
                  ? 'missed'
                  : `RSVP’d (${rsvpStatus})`;
      const { notifyEventRsvp } = await import('./lib/pushEvents');
      await notifyEventRsvp({
        eventId,
        eventTitle: String((event as { title?: string } | null)?.title || 'your event'),
        hostUserId,
        rsvpUserId: userId,
        rsvpName: String((rsvpUser as { displayName?: string } | null)?.displayName || 'A neighbor'),
        statusLabel,
        rsvpStatus,
      });
    });
    return true;
  } catch (err: unknown) {
    handleSupabaseError(err, 'event_rsvps');
    return false;
  }
}

export async function getSupabaseEventComments(eventIds: string[]): Promise<EventComment[]> {
  if (eventIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('event_comments')
      .select('*')
      .in('eventId', eventIds)
      .order('createdAt', { ascending: true });

    if (error) {
      handleSupabaseError(error, 'event_comments');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []) as EventComment[];
  } catch (err: unknown) {
    handleSupabaseError(err, 'event_comments');
    return [];
  }
}

export async function createSupabaseEventComment(comment: EventComment): Promise<boolean> {
  try {
    const payload = {
      ...comment,
      createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabase.from('event_comments').insert(payload);

    if (error) {
      handleSupabaseError(error, 'event_comments');
      return false;
    }

    setSupabaseConfigurationState(true);
    await runPushTask(async () => {
      const { data: event } = await supabase
        .from('community_events')
        .select('userId, title')
        .eq('id', comment.eventId)
        .maybeSingle();
      const hostUserId = String((event as { userId?: string } | null)?.userId || '');
      if (!hostUserId) return;
      const { notifyEventComment } = await import('./lib/pushEvents');
      const eventTitle = String((event as { title?: string } | null)?.title || 'your event');
      const commenterName = comment.userName || 'A neighbor';
      const preview = String(comment.text || '').trim();
      if (hostUserId !== comment.userId) {
        await notifyEventComment({
          eventId: comment.eventId,
          eventTitle,
          hostUserId,
          commenterName,
          commenterUserId: comment.userId,
          preview,
          commentId: comment.id,
        });
      }
      const [{ data: rsvpRows }, { data: commentRows }] = await Promise.all([
        supabase.from('event_rsvps').select('userId, rsvpStatus').eq('eventId', comment.eventId),
        supabase.from('event_comments').select('userId').eq('eventId', comment.eventId),
      ]);
      const exclude = new Set([comment.userId, hostUserId]);
      const threadIds = [
        ...new Set(
          [
            ...(rsvpRows || [])
              .filter((row) => {
                const status = String((row as { rsvpStatus?: string }).rsvpStatus || '');
                return status === 'going' || status === 'maybe';
              })
              .map((row) => String((row as { userId?: string }).userId || '')),
            ...(commentRows || []).map((row) => String((row as { userId?: string }).userId || '')),
          ].filter((id) => id && !exclude.has(id)),
        ),
      ];
      if (threadIds.length) {
        await notifyEventComment({
          eventId: comment.eventId,
          eventTitle,
          hostUserId,
          commenterName,
          commenterUserId: comment.userId,
          preview,
          commentId: comment.id,
          recipientUserIds: threadIds,
          title: 'New comment on an event you follow',
          tagSuffix: 'thread',
        });
      }
    });
    return true;
  } catch (err: unknown) {
    handleSupabaseError(err, 'event_comments');
    return false;
  }
}

export async function deleteSupabaseEventComment(
  commentId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error, count } = await supabase
      .from('event_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('userId', userId);

    if (error) {
      handleSupabaseError(error, 'event_comments');
      return { ok: false, errorMessage: error.message };
    }
    if (count === 0) {
      return { ok: false, errorMessage: 'Comment not found or already removed.' };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete comment.' };
  }
}

/**
 * --- DIRECTOR MESSAGE & APP REVIEWS ---
 */
export function defaultDirectorMessageContent(): DirectorMessageContent {
  return {
    id: 'main',
    directorName: DIRECTOR_MESSAGE.name,
    directorTitle: DIRECTOR_MESSAGE.title,
    headline: DIRECTOR_MESSAGE.headline,
    goal: DIRECTOR_MESSAGE.goal,
    promises: [...DIRECTOR_MESSAGE.promises],
    closing: DIRECTOR_MESSAGE.closing,
    updatedAt: new Date().toISOString(),
    updatedByUserId: null,
  };
}

function normalizeDirectorMessageRow(
  row: Record<string, unknown>,
  directorDisplayName?: string,
): DirectorMessageContent {
  const rawPromises = row.promises;
  const promises = Array.isArray(rawPromises)
    ? rawPromises.map(String).filter(Boolean)
    : defaultDirectorMessageContent().promises;

  return {
    id: String(row.id || 'main'),
    directorName: directorDisplayName?.trim() || String(row.directorName || DIRECTOR_MESSAGE.name),
    directorTitle: String(row.directorTitle || DIRECTOR_MESSAGE.title),
    headline: String(row.headline || DIRECTOR_MESSAGE.headline),
    goal: String(row.goal || DIRECTOR_MESSAGE.goal),
    promises,
    closing: String(row.closing || DIRECTOR_MESSAGE.closing),
    updatedAt: coerceToIsoDate(row.updatedAt),
    updatedByUserId: row.updatedByUserId ? String(row.updatedByUserId) : null,
  };
}

export async function getSupabaseDirectorMessage(): Promise<DirectorMessageContent> {
  const directorDisplayName = await getDirectorDisplayName();

  try {
    const { data, error } = await supabase
      .from('director_message')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return normalizeDirectorMessageRow({}, directorDisplayName);
      }
      handleSupabaseError(error, 'director_message');
      return normalizeDirectorMessageRow({}, directorDisplayName);
    }

    if (!data) {
      return normalizeDirectorMessageRow({}, directorDisplayName);
    }
    setSupabaseConfigurationState(true);
    return normalizeDirectorMessageRow(data as Record<string, unknown>, directorDisplayName);
  } catch {
    return normalizeDirectorMessageRow({}, directorDisplayName);
  }
}

export async function updateSupabaseDirectorMessage(
  content: DirectorMessageContent,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!isDirectorRole(actor.role)) {
    return { ok: false, errorMessage: 'Only the director can edit this message.' };
  }

  try {
    const directorName =
      actor.displayName.trim() || (await getDirectorDisplayName());
    const payload = {
      id: 'main',
      directorName,
      directorTitle: content.directorTitle.trim() || DIRECTOR_MESSAGE.title,
      headline: content.headline.trim(),
      goal: content.goal.trim(),
      promises: content.promises.map((p) => p.trim()).filter(Boolean),
      closing: content.closing.trim(),
      updatedAt: new Date().toISOString(),
      updatedByUserId: actor.uid,
    };

    const { error } = await supabase.from('director_message').upsert(payload, { onConflict: 'id' });

    if (error) {
      handleSupabaseError(error, 'director_message');
      return { ok: false, errorMessage: error.message || 'Could not save director message.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not save director message.',
    };
  }
}

export function defaultStaffMessageContent(
  userId: string,
  profile?: Pick<UserProfile, 'displayName' | 'role'> | null,
): StaffMessageContent {
  return {
    userId,
    staffName: profile?.displayName?.trim() || STAFF_MESSAGE_DEFAULT.name,
    staffTitle: profile?.role ? roleLabel(profile.role) : STAFF_MESSAGE_DEFAULT.title,
    headline: STAFF_MESSAGE_DEFAULT.headline,
    goal: STAFF_MESSAGE_DEFAULT.goal,
    promises: [...STAFF_MESSAGE_DEFAULT.promises],
    closing: STAFF_MESSAGE_DEFAULT.closing,
    updatedAt: new Date().toISOString(),
    updatedByUserId: null,
  };
}

function normalizeStaffMessageRow(
  row: Record<string, unknown>,
  fallback?: StaffMessageContent,
): StaffMessageContent {
  const base = fallback ?? defaultStaffMessageContent(String(row.userId || ''));
  const rawPromises = row.promises;
  const promises = Array.isArray(rawPromises)
    ? rawPromises.map(String).filter(Boolean)
    : base.promises;

  return {
    userId: String(row.userId || base.userId),
    staffName: String(row.staffName || base.staffName),
    staffTitle: String(row.staffTitle || base.staffTitle),
    headline: String(row.headline || base.headline),
    goal: String(row.goal || base.goal),
    promises,
    closing: String(row.closing || base.closing),
    updatedAt: coerceToIsoDate(row.updatedAt),
    updatedByUserId: row.updatedByUserId ? String(row.updatedByUserId) : null,
  };
}

export async function getSupabaseStaffMessage(
  userId: string,
  profile?: Pick<UserProfile, 'displayName' | 'role'> | null,
): Promise<StaffMessageContent> {
  const fallback = defaultStaffMessageContent(userId, profile);
  try {
    const { data, error } = await supabase
      .from('staff_messages')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') return fallback;
      handleSupabaseError(error, 'staff_messages');
      return fallback;
    }

    if (!data) return fallback;
    setSupabaseConfigurationState(true);
    return normalizeStaffMessageRow(data as Record<string, unknown>, fallback);
  } catch {
    return fallback;
  }
}

export async function getSupabasePublishedStaffMessages(): Promise<StaffMessageContent[]> {
  try {
    const { data, error } = await supabase
      .from('staff_messages')
      .select('*')
      .not('updatedByUserId', 'is', null)
      .order('updatedAt', { ascending: false });

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'staff_messages');
      return [];
    }

    if (!data?.length) return [];
    setSupabaseConfigurationState(true);
    return (data as Record<string, unknown>[]).map((row) => normalizeStaffMessageRow(row));
  } catch {
    return [];
  }
}

export async function updateSupabaseStaffMessage(
  content: StaffMessageContent,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canEditOwnStaffMessage(actor.role)) {
    return { ok: false, errorMessage: 'Only staff can publish a team message.' };
  }
  if (actor.uid !== content.userId) {
    return { ok: false, errorMessage: 'You can only edit your own message.' };
  }

  try {
    const payload = {
      userId: actor.uid,
      staffName: content.staffName.trim(),
      staffTitle: content.staffTitle.trim(),
      headline: content.headline.trim(),
      goal: content.goal.trim(),
      promises: content.promises.map((p) => p.trim()).filter(Boolean),
      closing: content.closing.trim(),
      updatedAt: new Date().toISOString(),
      updatedByUserId: actor.uid,
    };

    const { error } = await supabase.from('staff_messages').upsert(payload, { onConflict: 'userId' });

    if (error) {
      handleSupabaseError(error, 'staff_messages');
      return { ok: false, errorMessage: error.message || 'Could not save your team message.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not save your team message.',
    };
  }
}

function normalizeAppUpdateRow(
  row: Record<string, unknown>,
  authorDisplayName?: string,
): AppUpdateRecord {
  const rawDate = row.date;
  const date =
    typeof rawDate === 'string'
      ? rawDate.slice(0, 10)
      : rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

  const postedByUserId = normalizeAppUpdatePostedByUserId(String(row.postedByUserId || ''));
  const directorName =
    authorDisplayName?.trim() ||
    String(row.directorName || '').trim() ||
    DIRECTOR_MESSAGE.name;

  return {
    id: String(row.id),
    date,
    title: String(row.title || ''),
    body: String(row.body || ''),
    detail: row.detail ? String(row.detail) : null,
    directorName,
    directorTitle: String(row.directorTitle || DIRECTOR_MESSAGE.title),
    postedByUserId,
    createdAt: coerceToIsoDate(row.createdAt),
    updatedAt: coerceToIsoDate(row.updatedAt),
  };
}

async function enrichAppUpdatesWithAuthorProfiles(
  rows: Record<string, unknown>[],
): Promise<AppUpdateRecord[]> {
  const userIds = rows.map((row) =>
    normalizeAppUpdatePostedByUserId(String(row.postedByUserId || '')),
  );
  const displayInfo = await getUserDisplayInfoByIds(userIds);
  return rows.map((row) => {
    const uid = normalizeAppUpdatePostedByUserId(String(row.postedByUserId || ''));
    const profileName = displayInfo[uid]?.displayName;
    return normalizeAppUpdateRow(row, profileName);
  });
}

export async function getSupabaseAppUpdates(): Promise<AppUpdateRecord[]> {
  try {
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .order('date', { ascending: false })
      .order('updatedAt', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return filterUpdates(mergeByIdNewestFirst(SEEDED_APP_UPDATES, []) as AppUpdateRecord[]);
      }
      handleSupabaseError(error, 'app_updates');
      return filterUpdates(mergeByIdNewestFirst(SEEDED_APP_UPDATES, []) as AppUpdateRecord[]);
    }

    setSupabaseConfigurationState(true);
    const live = data?.length
      ? await enrichAppUpdatesWithAuthorProfiles(data as Record<string, unknown>[])
      : [];
    return filterUpdates(mergeByIdNewestFirst(SEEDED_APP_UPDATES, live) as AppUpdateRecord[]);
  } catch {
    return filterUpdates(mergeByIdNewestFirst(SEEDED_APP_UPDATES, []) as AppUpdateRecord[]);
  }
}

export async function createSupabaseAppUpdate(
  input: AppUpdateInput,
  actor: UserProfile,
): Promise<{ ok: boolean; update?: AppUpdateRecord; errorMessage?: string }> {
  if (!canManageAppUpdates(actor.role)) {
    return { ok: false, errorMessage: 'Only the director can post updates.' };
  }

  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id,
      date: input.date,
      title: input.title.trim(),
      body: input.body.trim(),
      detail: input.detail?.trim() || null,
      directorName: actor.displayName.trim() || (await getDirectorDisplayName()),
      directorTitle: roleLabel(actor.role),
      postedByUserId: actor.uid,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase.from('app_updates').insert(payload).select('*').single();

    if (error) {
      handleSupabaseError(error, 'app_updates');
      return { ok: false, errorMessage: error.message || 'Could not post update.' };
    }

    setSupabaseConfigurationState(true);
    const update = normalizeAppUpdateRow(data as Record<string, unknown>);
    await runPushTask(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAppUpdate(update.title, `${update.body}`.slice(0, 180), update.id),
      ),
    );
    return { ok: true, update };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not post update.' };
  }
}

export async function updateSupabaseAppUpdate(
  id: string,
  input: AppUpdateInput,
  actor: UserProfile,
): Promise<{ ok: boolean; update?: AppUpdateRecord; errorMessage?: string }> {
  if (!canManageAppUpdates(actor.role)) {
    return { ok: false, errorMessage: 'Only the director can edit updates.' };
  }

  try {
    const payload = {
      date: input.date,
      title: input.title.trim(),
      body: input.body.trim(),
      detail: input.detail?.trim() || null,
      directorName: actor.displayName.trim() || (await getDirectorDisplayName()),
      directorTitle: roleLabel(actor.role),
      postedByUserId: actor.uid,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('app_updates').update(payload).eq('id', id).select('*').single();

    if (error) {
      handleSupabaseError(error, 'app_updates');
      return { ok: false, errorMessage: error.message || 'Could not save update.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true, update: normalizeAppUpdateRow(data as Record<string, unknown>) };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not save update.' };
  }
}

export async function deleteSupabaseAppUpdate(
  id: string,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canManageAppUpdates(actor.role)) {
    return { ok: false, errorMessage: 'Only the director can delete updates.' };
  }

  try {
    await supabase.from('community_content_votes').delete().eq('targetType', 'update').eq('targetId', id);
    await supabase.from('app_update_comments').delete().eq('updateId', id);
    const { error } = await supabase.from('app_updates').delete().eq('id', id);

    if (error) {
      handleSupabaseError(error, 'app_updates');
      return { ok: false, errorMessage: error.message || 'Could not delete update.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete update.' };
  }
}

export async function getSupabaseAppUpdateComments(updateIds: string[]): Promise<AppUpdateComment[]> {
  if (!updateIds.length) return [];
  try {
    const { data, error } = await supabase
      .from('app_update_comments')
      .select('*')
      .in('updateId', updateIds)
      .order('createdAt', { ascending: true });

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'app_update_comments');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []) as AppUpdateComment[];
  } catch (err) {
    handleSupabaseError(err, 'app_update_comments');
    return [];
  }
}

export async function createSupabaseAppUpdateComment(comment: AppUpdateComment): Promise<boolean> {
  try {
    const payload = {
      ...comment,
      userPhoto: sanitizePhotoUrlForDb(comment.userPhoto) ?? null,
    };
    const { error } = await supabase.from('app_update_comments').insert(payload);

    if (error) {
      handleSupabaseError(error, 'app_update_comments');
      return false;
    }

    setSupabaseConfigurationState(true);
    await runPushTask(async () => {
      const { data } = await supabase
        .from('app_updates')
        .select('postedByUserId, title')
        .eq('id', comment.updateId)
        .maybeSingle();
      const authorUserId = String((data as { postedByUserId?: string } | null)?.postedByUserId || '');
      if (!authorUserId) return;
      const { notifyUpdateComment } = await import('./lib/pushEvents');
      const title = String((data as { title?: string } | null)?.title || 'your update');
      const commenterName = comment.userName || 'A neighbor';
      const preview = String(comment.text || '').trim();
      if (authorUserId !== comment.userId) {
        await notifyUpdateComment({
          updateId: comment.updateId,
          title,
          authorUserId,
          commenterName,
          commenterUserId: comment.userId,
          preview,
          commentId: comment.id,
        });
      }
      const { data: commentRows } = await supabase
        .from('app_update_comments')
        .select('userId')
        .eq('updateId', comment.updateId);
      const threadIds = [
        ...new Set(
          (commentRows || [])
            .map((row) => String((row as { userId?: string }).userId || ''))
            .filter((id) => id && id !== comment.userId && id !== authorUserId),
        ),
      ];
      if (threadIds.length) {
        await notifyUpdateComment({
          updateId: comment.updateId,
          title,
          authorUserId,
          commenterName,
          commenterUserId: comment.userId,
          preview,
          commentId: comment.id,
          recipientUserIds: threadIds,
          notificationTitle: 'New reply on an update you commented on',
          tagSuffix: 'thread',
        });
      }
    });
    return true;
  } catch (err) {
    handleSupabaseError(err, 'app_update_comments');
    return false;
  }
}

export async function deleteSupabaseAppUpdateComment(
  commentId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error, count } = await supabase
      .from('app_update_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('userId', userId);

    if (error) {
      handleSupabaseError(error, 'app_update_comments');
      return { ok: false, errorMessage: error.message };
    }
    if (count === 0) {
      return { ok: false, errorMessage: 'Comment not found or already removed.' };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete comment.' };
  }
}

function normalizeHelpAnnouncementRow(row: Record<string, unknown>): HelpAnnouncementRecord {
  return {
    id: String(row.id),
    date: String(row.date).slice(0, 10),
    title: String(row.title || ''),
    body: String(row.body || ''),
    detail: row.detail ? String(row.detail) : null,
    authorName: String(row.authorName || 'Staff'),
    authorTitle: String(row.authorTitle || 'Community team'),
    postedByUserId: String(row.postedByUserId || ''),
    createdAt: coerceToIsoDate(row.createdAt),
    updatedAt: coerceToIsoDate(row.updatedAt),
  };
}

function normalizeUserNotificationRow(row: Record<string, unknown>): UserNotificationItem {
  return {
    id: String(row.id || ''),
    kind: String(row.kind || 'listing_status') as UserNotificationItem['kind'],
    title: String(row.title || 'Notification'),
    body: String(row.body || ''),
    at: coerceToIsoDate(row.createdAt),
    readAt: row.readAt ? coerceToIsoDate(row.readAt) : null,
    itemId: row.itemId ? String(row.itemId) : undefined,
    itemTitle: row.itemTitle ? String(row.itemTitle) : undefined,
    actorName: row.actorName ? String(row.actorName) : undefined,
    url: row.url ? String(row.url) : undefined,
  };
}

export async function getUnreadUserNotificationCount(
  userId: string,
  options?: { excludeKinds?: string[] },
): Promise<number> {
  try {
    let query = supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId)
      .is('readAt', null);

    const excludeKinds = options?.excludeKinds?.filter(Boolean) || [];
    if (excludeKinds.length) {
      const quoted = excludeKinds.map((kind) => `"${kind.replace(/"/g, '\\"')}"`).join(',');
      query = query.not('kind', 'in', `(${quoted})`);
    }

    const { count, error } = await query;

    if (error) {
      if (error.code === '42P01') return 0;
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function userHasStaffApplyInviteNotification(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('kind', 'staff_apply');

    if (error) {
      if (error.code === '42P01') return false;
      return false;
    }
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function markSupabaseNotificationsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ readAt: new Date().toISOString() })
      .eq('userId', userId)
      .is('readAt', null);

    if (error && error.code !== '42P01') {
      console.warn('[notifications] mark read:', error.message);
      return false;
    }
    return true;
  } catch {
    // table may not exist yet
    return false;
  }
}

export async function getSupabaseUserNotifications(userId: string): Promise<UserNotificationItem[]> {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      if (error.code === '42P01') return [];
      return [];
    }

    if (!data?.length) return [];
    setSupabaseConfigurationState(true);
    return (data as Record<string, unknown>[]).map(normalizeUserNotificationRow);
  } catch {
    return [];
  }
}

export async function getSupabaseHelpAnnouncements(): Promise<HelpAnnouncementRecord[]> {
  try {
    const { data, error } = await supabase
      .from('help_announcements')
      .select('*')
      .order('date', { ascending: false })
      .order('updatedAt', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return filterNews(mergeByIdNewestFirst(SEEDED_HELP_ANNOUNCEMENTS, []) as HelpAnnouncementRecord[]);
      }
      handleSupabaseError(error, 'help_announcements');
      return filterNews(mergeByIdNewestFirst(SEEDED_HELP_ANNOUNCEMENTS, []) as HelpAnnouncementRecord[]);
    }

    setSupabaseConfigurationState(true);
    const live = (data || []).map((row) => normalizeHelpAnnouncementRow(row as Record<string, unknown>));
    return filterNews(mergeByIdNewestFirst(SEEDED_HELP_ANNOUNCEMENTS, live) as HelpAnnouncementRecord[]);
  } catch {
    return filterNews(mergeByIdNewestFirst(SEEDED_HELP_ANNOUNCEMENTS, []) as HelpAnnouncementRecord[]);
  }
}

export async function createSupabaseHelpAnnouncement(
  input: HelpAnnouncementInput,
  actor: UserProfile,
): Promise<{ ok: boolean; announcement?: HelpAnnouncementRecord; errorMessage?: string }> {
  if (!canPostAnnouncements(actor.role)) {
    return { ok: false, errorMessage: 'Only staff can post announcements.' };
  }

  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id,
      date: input.date,
      title: input.title.trim(),
      body: input.body.trim(),
      detail: input.detail?.trim() || null,
      authorName: actor.displayName.trim() || 'Staff',
      authorTitle: roleLabel(actor.role),
      postedByUserId: actor.uid,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase.from('help_announcements').insert(payload).select('*').single();

    if (error) {
      handleSupabaseError(error, 'help_announcements');
      return { ok: false, errorMessage: error.message || 'Could not post announcement.' };
    }

    setSupabaseConfigurationState(true);
    const announcement = normalizeHelpAnnouncementRow(data as Record<string, unknown>);
    await runPushTask(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushHelpAnnouncement(announcement.title, `${announcement.body}`.slice(0, 180), announcement.id),
      ),
    );
    return { ok: true, announcement };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not post announcement.' };
  }
}

export async function updateSupabaseHelpAnnouncement(
  id: string,
  input: HelpAnnouncementInput,
  actor: UserProfile,
): Promise<{ ok: boolean; announcement?: HelpAnnouncementRecord; errorMessage?: string }> {
  try {
    const { data: existing, error: readError } = await supabase
      .from('help_announcements')
      .select('postedByUserId')
      .eq('id', id)
      .maybeSingle();

    if (readError || !existing) {
      return { ok: false, errorMessage: 'Announcement not found.' };
    }

    const postedByUserId = String((existing as { postedByUserId?: string }).postedByUserId || '');
    if (!canEditAnnouncement(actor, postedByUserId)) {
      return { ok: false, errorMessage: 'You can only edit your own announcements.' };
    }

    const payload = {
      date: input.date,
      title: input.title.trim(),
      body: input.body.trim(),
      detail: input.detail?.trim() || null,
      authorName: actor.displayName.trim() || 'Staff',
      authorTitle: roleLabel(actor.role),
      postedByUserId: actor.uid,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('help_announcements').update(payload).eq('id', id).select('*').single();

    if (error) {
      handleSupabaseError(error, 'help_announcements');
      return { ok: false, errorMessage: error.message || 'Could not save announcement.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true, announcement: normalizeHelpAnnouncementRow(data as Record<string, unknown>) };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not save announcement.' };
  }
}

export async function deleteSupabaseHelpAnnouncement(
  id: string,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: existing, error: readError } = await supabase
      .from('help_announcements')
      .select('postedByUserId')
      .eq('id', id)
      .maybeSingle();

    if (readError || !existing) {
      return { ok: false, errorMessage: 'Announcement not found.' };
    }

    const postedByUserId = String((existing as { postedByUserId?: string }).postedByUserId || '');
    if (!canEditAnnouncement(actor, postedByUserId)) {
      return { ok: false, errorMessage: 'You can only delete your own announcements.' };
    }

    await supabase.from('community_content_votes').delete().eq('targetType', 'announcement').eq('targetId', id);
    await supabase.from('help_announcement_comments').delete().eq('announcementId', id);
    const { error } = await supabase.from('help_announcements').delete().eq('id', id);

    if (error) {
      handleSupabaseError(error, 'help_announcements');
      return { ok: false, errorMessage: error.message || 'Could not delete announcement.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete announcement.' };
  }
}

export async function getSupabaseHelpAnnouncementComments(
  announcementIds: string[],
): Promise<HelpAnnouncementComment[]> {
  if (announcementIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('help_announcement_comments')
      .select('*')
      .in('announcementId', announcementIds)
      .order('createdAt', { ascending: true });

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'help_announcement_comments');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []) as HelpAnnouncementComment[];
  } catch (err: unknown) {
    handleSupabaseError(err, 'help_announcement_comments');
    return [];
  }
}

export async function createSupabaseHelpAnnouncementComment(comment: HelpAnnouncementComment): Promise<boolean> {
  try {
    const payload = {
      ...comment,
      createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : new Date().toISOString(),
    };
    const { error } = await supabase.from('help_announcement_comments').insert(payload);

    if (error) {
      handleSupabaseError(error, 'help_announcement_comments');
      return false;
    }

    setSupabaseConfigurationState(true);
    await runPushTask(async () => {
      const { data } = await supabase
        .from('help_announcements')
        .select('postedByUserId, title')
        .eq('id', comment.announcementId)
        .maybeSingle();
      const authorUserId = String((data as { postedByUserId?: string } | null)?.postedByUserId || '');
      if (!authorUserId) return;
      const { notifyAnnouncementComment } = await import('./lib/pushEvents');
      const title = String((data as { title?: string } | null)?.title || 'your announcement');
      const commenterName = comment.userName || 'A neighbor';
      const preview = String(comment.text || '').trim();
      if (authorUserId !== comment.userId) {
        await notifyAnnouncementComment({
          announcementId: comment.announcementId,
          title,
          authorUserId,
          commenterName,
          commenterUserId: comment.userId,
          preview,
          commentId: comment.id,
        });
      }
      const { data: commentRows } = await supabase
        .from('help_announcement_comments')
        .select('userId')
        .eq('announcementId', comment.announcementId);
      const threadIds = [
        ...new Set(
          (commentRows || [])
            .map((row) => String((row as { userId?: string }).userId || ''))
            .filter((id) => id && id !== comment.userId && id !== authorUserId),
        ),
      ];
      if (threadIds.length) {
        await notifyAnnouncementComment({
          announcementId: comment.announcementId,
          title,
          authorUserId,
          commenterName,
          commenterUserId: comment.userId,
          preview,
          commentId: comment.id,
          recipientUserIds: threadIds,
          notificationTitle: 'New reply on a news post you commented on',
          tagSuffix: 'thread',
        });
      }
    });
    return true;
  } catch (err: unknown) {
    handleSupabaseError(err, 'help_announcement_comments');
    return false;
  }
}

export async function deleteSupabaseHelpAnnouncementComment(
  commentId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error, count } = await supabase
      .from('help_announcement_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('userId', userId);

    if (error) {
      handleSupabaseError(error, 'help_announcement_comments');
      return { ok: false, errorMessage: error.message };
    }

    if (!count) {
      return { ok: false, errorMessage: 'Comment not found or already removed.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete comment.' };
  }
}

export function snapReviewRating(value: number): number {
  const snapped = Math.round(value * 2) / 2;
  return Math.max(0, Math.min(5, snapped));
}

function normalizeAppReviewRow(row: Record<string, unknown>): AppReview {
  return {
    id: String(row.id),
    userId: String(row.userId),
    userName: String(row.userName),
    userPhoto: row.userPhoto ? String(row.userPhoto) : undefined,
    userNeighborhood: String(row.userNeighborhood || 'Sacramento'),
    rating: snapReviewRating(Number(row.rating)),
    text: row.text ? String(row.text) : null,
    createdAt: coerceToIsoDate(row.createdAt),
    updatedAt: coerceToIsoDate(row.updatedAt),
  };
}

export async function getSupabaseAppReviews(limit = 50): Promise<AppReview[]> {
  try {
    const { data, error } = await supabase
      .from('app_reviews')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'app_reviews');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []).map((row) => normalizeAppReviewRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function upsertSupabaseAppReview(
  review: AppReview,
  author: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const rating = snapReviewRating(review.rating);
  if (rating < 0 || rating > 5) {
    return { ok: false, errorMessage: 'Rating must be between 0 and 5 stars.' };
  }

  try {
    if (author.email) {
      await upsertSupabaseProfile(author);
    }

    const payload = {
      id: review.id || `review_${author.uid}`,
      userId: author.uid,
      userName: author.displayName,
      userPhoto: author.photoURL || null,
      userNeighborhood: author.neighborhood || 'Sacramento',
      rating,
      text: review.text?.trim() || null,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('app_reviews').upsert(payload, { onConflict: 'userId' });

    if (error) {
      handleSupabaseError(error, 'app_reviews');
      return { ok: false, errorMessage: error.message || 'Could not save review.' };
    }

    setSupabaseConfigurationState(true);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not save review.' };
  }
}

export async function deleteSupabaseAppReview(
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase.from('app_reviews').delete().eq('userId', userId);
    if (error) {
      handleSupabaseError(error, 'app_reviews');
      return { ok: false, errorMessage: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete review.' };
  }
}

/**
 * --- COMMUNITY CONTENT VOTES (updates, reviews, staff messages) ---
 */

function normalizeCommunityContentVoteRow(row: Record<string, unknown>): CommunityContentVote {
  return {
    id: String(row.id),
    targetType: String(row.targetType) as CommunityContentVoteTarget,
    targetId: String(row.targetId),
    userId: String(row.userId),
    voteType: row.voteType === 'down' ? 'down' : 'up',
    createdAt: coerceToIsoDate(row.createdAt),
  };
}

export async function getSupabaseCommunityContentVotes(
  targetType: CommunityContentVoteTarget,
  targetIds: string[],
): Promise<CommunityContentVote[]> {
  if (targetIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('community_content_votes')
      .select('*')
      .eq('targetType', targetType)
      .in('targetId', targetIds);

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'community_content_votes');
      return [];
    }

    setSupabaseConfigurationState(true);
    return (data || []).map((row) => normalizeCommunityContentVoteRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function setSupabaseCommunityContentVote(
  targetType: CommunityContentVoteTarget,
  targetId: string,
  userId: string,
  voteType: 'up' | 'down' | null,
): Promise<VoteWriteResult> {
  try {
    if (!voteType) {
      const { error } = await supabase
        .from('community_content_votes')
        .delete()
        .eq('targetType', targetType)
        .eq('targetId', targetId)
        .eq('userId', userId);
      if (error) {
        handleSupabaseError(error, 'community_content_votes');
        return { ok: false, reason: 'error' };
      }
      return { ok: true };
    }

    const alreadyVoted = await userHasCommunityContentVote(targetType, targetId, userId);
    if (!alreadyVoted) {
      const recentVotes = await countRecentCommunityContentVotes(userId);
      if (recentVotes >= VOTE_COOLDOWN_MAX_NEW_VOTES) {
        return { ok: false, reason: 'vote_cooldown' };
      }
    }

    const id = `${targetType}_${targetId}_${userId}`;
    const { error } = await supabase.from('community_content_votes').upsert(
      {
        id,
        targetType,
        targetId,
        userId,
        voteType,
        createdAt: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (error) {
      handleSupabaseError(error, 'community_content_votes');
      return { ok: false, reason: 'error' };
    }

    setSupabaseConfigurationState(true);
    if (targetType === 'feed_post') {
      void import('./lib/pushFeedIntegration').then((m) =>
        m.pushAfterFeedVote({ postId: targetId, voterUserId: userId, voteType }),
      );
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * --- BLOCKS & DM REQUESTS ---
 */

export function chatIdForUsers(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function areUsersBlocked(userId: string, otherUserId: string): Promise<boolean> {
  if (!userId || !otherUserId || userId === otherUserId) return false;
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blockerUserId')
      .or(
        `and(blockerUserId.eq.${userId},blockedUserId.eq.${otherUserId}),and(blockerUserId.eq.${otherUserId},blockedUserId.eq.${userId})`,
      )
      .limit(1);

    if (error) {
      if (error.code === '42P01') return false;
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function getHiddenUserIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const [blockedByMe, blockedMe] = await Promise.all([
      supabase.from('user_blocks').select('blockedUserId').eq('blockerUserId', userId),
      supabase.from('user_blocks').select('blockerUserId').eq('blockedUserId', userId),
    ]);

    if (blockedByMe.error?.code === '42P01' || blockedMe.error?.code === '42P01') {
      return [];
    }

    const ids = new Set<string>();
    for (const row of blockedByMe.data ?? []) {
      if (row.blockedUserId) ids.add(String(row.blockedUserId));
    }
    for (const row of blockedMe.data ?? []) {
      if (row.blockerUserId) ids.add(String(row.blockerUserId));
    }
    return [...ids];
  } catch {
    return [];
  }
}

export async function getBlockStatus(
  viewerId: string,
  otherUserId: string,
): Promise<{ isHidden: boolean; iBlockedThem: boolean; theyBlockedMe: boolean }> {
  if (!viewerId || !otherUserId || viewerId === otherUserId) {
    return { isHidden: false, iBlockedThem: false, theyBlockedMe: false };
  }

  try {
    const [iBlockedRes, theyBlockedRes] = await Promise.all([
      supabase
        .from('user_blocks')
        .select('blockerUserId')
        .eq('blockerUserId', viewerId)
        .eq('blockedUserId', otherUserId)
        .maybeSingle(),
      supabase
        .from('user_blocks')
        .select('blockerUserId')
        .eq('blockerUserId', otherUserId)
        .eq('blockedUserId', viewerId)
        .maybeSingle(),
    ]);

    const iBlockedThem = !!iBlockedRes.data;
    const theyBlockedMe = !!theyBlockedRes.data;
    return { isHidden: iBlockedThem || theyBlockedMe, iBlockedThem, theyBlockedMe };
  } catch {
    return { isHidden: false, iBlockedThem: false, theyBlockedMe: false };
  }
}

export async function blockUser(params: {
  blocker: UserProfile;
  blockedUserId: string;
  blockedUserName: string;
  reasonCode: string;
  details?: string;
  proofFile?: File | null;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { blocker, blockedUserId, blockedUserName, reasonCode, details, proofFile } = params;

  if (blocker.uid === blockedUserId) {
    return { ok: false, errorMessage: 'You cannot block yourself.' };
  }
  if (!reasonCode.trim()) {
    return { ok: false, errorMessage: 'Please select a reason for blocking.' };
  }
  if (reasonCode === 'other' && !details?.trim()) {
    return { ok: false, errorMessage: 'Please describe why you are blocking this neighbor.' };
  }

  const reasonLabel = blockReasonLabel(reasonCode);
  const reportId = `report_block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  let proofImageUrl: string | null = null;

  if (proofFile) {
    proofImageUrl = await uploadReportProofImage(proofFile, reportId);
  }

  const reasonText = details?.trim()
    ? `${reasonLabel}\n\n${details.trim()}`
    : reasonLabel;

  try {
    const { error } = await supabase.from('user_blocks').upsert(
      {
        blockerUserId: blocker.uid,
        blockedUserId,
        reason: reasonText,
        proofImageUrl,
        createdAt: new Date().toISOString(),
      },
      { onConflict: 'blockerUserId,blockedUserId' },
    );

    if (error) {
      if (error.code === '42P01') {
        return { ok: false, errorMessage: 'Blocks table missing — run section 8 in complete-schema.sql.' };
      }
      return { ok: false, errorMessage: error.message };
    }

    const reportBody = [
      `Automatic report — neighbor was blocked.`,
      '',
      `Blocked neighbor: ${blockedUserName}`,
      `Blocked user id: ${blockedUserId}`,
      '',
      `Reason: ${reasonLabel}`,
      details?.trim() ? `\nDetails:\n${details.trim()}` : '',
      proofImageUrl ? '\n\nScreenshot proof attached for staff review.' : '',
    ]
      .filter(Boolean)
      .join('\n');

    const { error: reportError } = await supabase.from('user_reports').insert({
      id: reportId,
      reporterUserId: blocker.uid,
      reporterName: blocker.displayName,
      subject: `Block: ${blockedUserName}`,
      body: reportBody,
      reportedUserId: blockedUserId,
      reportedUserName: blockedUserName,
      proofImageUrl,
      source: 'block',
      status: 'new',
      createdAt: new Date().toISOString(),
    });

    let reportSaved = !reportError;
    if (reportError) {
      if (reportError.code === '42P01') {
        return {
          ok: true,
          errorMessage: 'Neighbor blocked, but reports table is missing — run sections 12 and 16 in complete-schema.sql.',
        };
      }
      const missingColumn =
        String(reportError.message || '').includes('source') ||
        String(reportError.message || '').includes('proofImageUrl');
      if (missingColumn) {
        const { error: retryError } = await supabase.from('user_reports').insert({
          id: reportId,
          reporterUserId: blocker.uid,
          reporterName: blocker.displayName,
          subject: `Block: ${blockedUserName}`,
          body: reportBody,
          reportedUserId: blockedUserId,
          reportedUserName: blockedUserName,
          status: 'new',
          createdAt: new Date().toISOString(),
        });
        reportSaved = !retryError;
      } else {
        console.warn('Block succeeded but staff report failed:', reportError);
      }
    }

    if (reportSaved) {
      try {
        const m = await import('./lib/pushNotifications');
        await m.notifyReportPush(reportId);
      } catch (err) {
        console.warn('[push]', err);
      }
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not block user.' };
  }
}

export async function unblockUser(
  blockerUserId: string,
  blockedUserId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blockerUserId', blockerUserId)
      .eq('blockedUserId', blockedUserId);

    if (error) {
      return { ok: false, errorMessage: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not unblock user.' };
  }
}

export async function getLatestMessageRequestBetween(
  userA: string,
  userB: string,
): Promise<MessageRequest | null> {
  try {
    const { data, error } = await supabase
      .from('message_requests')
      .select('*')
      .or(
        `and(fromUserId.eq.${userA},toUserId.eq.${userB}),and(fromUserId.eq.${userB},toUserId.eq.${userA})`,
      )
      .order('createdAt', { ascending: false })
      .limit(1);

    if (error || !data?.length) return null;
    return data[0] as MessageRequest;
  } catch {
    return null;
  }
}

export async function getIncomingMessageRequests(userId: string): Promise<MessageRequest[]> {
  try {
    const { data, error } = await supabase
      .from('message_requests')
      .select('*')
      .eq('toUserId', userId)
      .eq('status', 'pending')
      .order('createdAt', { ascending: false });

    if (error) return [];
    return (data ?? []) as MessageRequest[];
  } catch {
    return [];
  }
}

export async function sendMessageRequest(params: {
  fromUser: UserProfile;
  toUserId: string;
  message?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { fromUser, toUserId, message } = params;
  if (fromUser.uid === toUserId) {
    return { ok: false, errorMessage: 'You cannot message yourself.' };
  }

  if (await areUsersBlocked(fromUser.uid, toUserId)) {
    return { ok: false, errorMessage: 'This neighbor is not available.' };
  }

  const existing = await getLatestMessageRequestBetween(fromUser.uid, toUserId);
  if (existing?.status === 'pending') {
    return { ok: false, errorMessage: 'A message request is already pending.' };
  }
  if (existing?.status === 'accepted') {
    return { ok: false, errorMessage: 'You can already message this neighbor.' };
  }

  try {
    const requestId = `dmreq_${fromUser.uid}_${toUserId}_${Date.now()}`;
    const { error } = await supabase.from('message_requests').insert({
      id: requestId,
      fromUserId: fromUser.uid,
      toUserId,
      fromUserName: fromUser.displayName,
      fromUserPhoto: fromUser.photoURL ?? null,
      message: message?.trim() || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    if (error) {
      if (error.code === '42P01') {
        return { ok: false, errorMessage: 'Message requests table missing — run section 9 in complete-schema.sql.' };
      }
      return { ok: false, errorMessage: error.message };
    }

    await runPushTask(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAfterMessageRequest({
          requestId,
          toUserId,
          fromUserId: fromUser.uid,
          fromUserName: fromUser.displayName,
          message: message?.trim() || null,
        }),
      ),
    );

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not send request.' };
  }
}

export async function acceptMessageRequest(
  requestId: string,
  accepter: UserProfile,
): Promise<{ ok: boolean; chatId?: string; errorMessage?: string }> {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('message_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return { ok: false, errorMessage: 'Request not found.' };
    }

    const req = request as MessageRequest;
    if (req.toUserId !== accepter.uid) {
      return { ok: false, errorMessage: 'You cannot accept this request.' };
    }
    if (req.status !== 'pending') {
      return { ok: false, errorMessage: 'This request was already handled.' };
    }

    const requesterId = req.fromUserId;
    const chatId = chatIdForUsers(accepter.uid, requesterId);
    const requesterProfile = await getPublicNeighborProfile(requesterId, accepter.uid);

    const payload = {
      id: chatId,
      participantIds: [accepter.uid, requesterId].sort(),
      participantNames: {
        [accepter.uid]: accepter.displayName,
        [requesterId]: requesterProfile?.displayName || req.fromUserName,
      },
      participantPhotos: {
        [accepter.uid]: accepter.photoURL || '',
        [requesterId]: requesterProfile?.photoURL || req.fromUserPhoto || '',
      },
      lastMessageText: req.message || 'Message request accepted — say hello!',
      lastMessageAt: new Date().toISOString(),
      lastMessageSenderId: accepter.uid,
      itemId: '',
      itemTitle: '',
    };

    const chatOk = await getOrCreateSupabaseChat(chatId, payload);
    if (!chatOk) {
      return { ok: false, errorMessage: 'Could not open chat.' };
    }

    const { error: updateError } = await supabase
      .from('message_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      return { ok: false, errorMessage: updateError.message };
    }

    await runPushTask(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAfterMessageRequestAccepted({
          chatId,
          requesterUserId: requesterId,
          accepterName: accepter.displayName,
        }),
      ),
    );

    return { ok: true, chatId };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not accept request.' };
  }
}

export async function declineMessageRequest(
  requestId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: request } = await supabase
      .from('message_requests')
      .select('toUserId, status')
      .eq('id', requestId)
      .maybeSingle();

    if (!request || request.toUserId !== userId) {
      return { ok: false, errorMessage: 'Request not found.' };
    }

    const { error } = await supabase
      .from('message_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not decline request.' };
  }
}

export async function getLatestFriendRequestBetween(
  userA: string,
  userB: string,
): Promise<FriendRequest | null> {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(
        `and(fromUserId.eq.${userA},toUserId.eq.${userB}),and(fromUserId.eq.${userB},toUserId.eq.${userA})`,
      )
      .order('createdAt', { ascending: false })
      .limit(1);

    if (error || !data?.length) return null;
    return data[0] as FriendRequest;
  } catch {
    return null;
  }
}

export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('"fromUserId", "toUserId", status')
      .eq('status', 'accepted')
      .or(`fromUserId.eq.${userId},toUserId.eq.${userId}`);

    if (error || !data?.length) return [];

    return data
      .map((row) => (row.fromUserId === userId ? row.toUserId : row.fromUserId))
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function getProfileFriends(
  profileUserId: string,
  viewerUserId: string,
): Promise<ProfileFriend[]> {
  const friendIds = await getAcceptedFriendIds(profileUserId);
  if (friendIds.length === 0) return [];

  const visibleIds: string[] = [];
  await Promise.all(
    friendIds.map(async (friendId) => {
      if (friendId === viewerUserId) {
        visibleIds.push(friendId);
        return;
      }
      const status = await getBlockStatus(viewerUserId, friendId);
      if (!status.isHidden) visibleIds.push(friendId);
    }),
  );

  if (visibleIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('users')
      .select('uid, displayName, photoURL, neighborhood')
      .in('uid', visibleIds);

    if (error || !data?.length) return [];

    const order = new Map(visibleIds.map((id, index) => [id, index]));
    return (data as Array<{ uid: string; displayName: string; photoURL?: string; neighborhood?: string }>)
      .map((row) => ({
        userId: row.uid,
        displayName: row.displayName || 'Neighbor',
        photoURL: row.photoURL || undefined,
        neighborhood: row.neighborhood || 'Sacramento',
      }))
      .sort((a, b) => (order.get(a.userId) ?? 0) - (order.get(b.userId) ?? 0));
  } catch {
    return [];
  }
}

export async function areFriends(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return true;
  const latest = await getLatestFriendRequestBetween(userA, userB);
  return latest?.status === 'accepted';
}

export async function sendFriendRequest(params: {
  fromUser: UserProfile;
  toUserId: string;
  message?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const { fromUser, toUserId, message } = params;
  if (fromUser.uid === toUserId) {
    return { ok: false, errorMessage: 'You cannot friend yourself.' };
  }

  if (await areUsersBlocked(fromUser.uid, toUserId)) {
    return { ok: false, errorMessage: 'This neighbor is not available.' };
  }

  const existing = await getLatestFriendRequestBetween(fromUser.uid, toUserId);
  if (existing?.status === 'pending') {
    return { ok: false, errorMessage: 'A friend request is already pending.' };
  }
  if (existing?.status === 'accepted') {
    return { ok: false, errorMessage: 'You are already friends.' };
  }

  try {
    const requestId = `frireq_${fromUser.uid}_${toUserId}_${Date.now()}`;
    const { error } = await supabase.from('friend_requests').insert({
      id: requestId,
      fromUserId: fromUser.uid,
      toUserId,
      fromUserName: fromUser.displayName,
      fromUserPhoto: fromUser.photoURL ?? null,
      message: message?.trim() || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    if (error) {
      if (error.code === '42P01') {
        return {
          ok: false,
          errorMessage: 'Friend requests table missing — run scripts/supabase-migration-aug-20-2026-friend-requests.sql.',
        };
      }
      return { ok: false, errorMessage: error.message };
    }

    await runPushTask(() =>
      import('./lib/pushEvents').then((m) =>
        m.notifyFriendRequest({
          requestId,
          toUserId,
          fromUserId: fromUser.uid,
          fromUserName: fromUser.displayName,
        }),
      ),
    );
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not send friend request.' };
  }
}

export async function acceptFriendRequest(
  requestId: string,
  accepter: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return { ok: false, errorMessage: 'Request not found.' };
    }

    const req = request as FriendRequest;
    if (req.toUserId !== accepter.uid) {
      return { ok: false, errorMessage: 'You cannot accept this request.' };
    }
    if (req.status !== 'pending') {
      return { ok: false, errorMessage: 'This request was already handled.' };
    }

    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      return { ok: false, errorMessage: updateError.message };
    }

    await runPushTask(() =>
      import('./lib/pushEvents').then((m) =>
        m.notifyFriendRequestAccepted({
          requestId,
          fromUserId: req.fromUserId,
          accepterUserId: accepter.uid,
          accepterName: accepter.displayName,
        }),
      ),
    );
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not accept request.' };
  }
}

export async function declineFriendRequest(
  requestId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: request } = await supabase
      .from('friend_requests')
      .select('toUserId, status')
      .eq('id', requestId)
      .maybeSingle();

    if (!request || request.toUserId !== userId) {
      return { ok: false, errorMessage: 'Request not found.' };
    }

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not decline request.' };
  }
}

export function filterChatsByBlocked(chats: Chat[], userId: string, hiddenIds: Set<string>): Chat[] {
  return chats.filter((chat) => {
    if (isCommunityChat(chat.id)) return true;
    const otherId = chat.participantIds.find((id) => id !== userId);
    return !otherId || !hiddenIds.has(otherId);
  });
}

/**
 * --- STAFF MODERATION ---
 */

export function isAccountRestricted(profile: UserProfile | null | undefined): {
  restricted: boolean;
  reason: 'banned' | 'suspended' | 'locked' | null;
  suspendedUntil?: string | null;
} {
  if (!profile) return { restricted: false, reason: null };
  if (profile.accountStatus === 'banned') {
    return { restricted: true, reason: 'banned' };
  }
  if (profile.accountStatus === 'locked') {
    return { restricted: true, reason: 'locked' };
  }
  if (profile.accountStatus === 'suspended') {
    if (profile.suspendedUntil && new Date(profile.suspendedUntil).getTime() > Date.now()) {
      return { restricted: true, reason: 'suspended', suspendedUntil: profile.suspendedUntil };
    }
  }
  return { restricted: false, reason: null };
}

async function writeModerationAudit(params: {
  actor: UserProfile;
  target: Pick<UserProfile, 'uid' | 'displayName'>;
  action: string;
  detail?: string;
}): Promise<void> {
  try {
    await supabase.from('moderation_audit_log').insert({
      id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      actorUserId: params.actor.uid,
      actorName: params.actor.displayName,
      actorRole: params.actor.role ?? 'user',
      targetUserId: params.target.uid,
      targetName: params.target.displayName,
      action: params.action,
      detail: params.detail ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to write moderation audit log:', err);
  }
}

export async function getStaffUserDirectory(): Promise<StaffUserRow[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('uid, displayName, photoURL, email, neighborhood, bio, role, accountStatus, suspendedUntil, createdAt')
      .order('displayName', { ascending: true });

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'users');
      return [];
    }

    return (data ?? [])
      .map((row) => normalizeUserProfileRow(row as Record<string, unknown>))
      .filter((p): p is UserProfile => !!p)
      .map((p) => ({
        ...p,
        accountStatus: p.accountStatus ?? 'active',
      }));
  } catch {
    return [];
  }
}

/** Staff: fetch recent comments across all listings (newest first, up to limit). */
export async function staffGetRecentComments(limit = 200): Promise<ItemComment[]> {
  try {
    const { data, error } = await supabase
      .from('item_comments')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      handleSupabaseError(error, 'item_comments');
      return [];
    }

    return (data ?? []) as ItemComment[];
  } catch {
    return [];
  }
}

/** Staff: fetch a single listing by id (any status). */
export async function staffGetListingById(itemId: string): Promise<ItemPost | null> {
  try {
    const { data, error } = await supabase.from('items').select('*').eq('id', itemId).maybeSingle();
    if (error) {
      handleSupabaseError(error, 'items');
      return null;
    }
    if (!data) return null;
    return normalizeItemFromRow(data as ItemPost);
  } catch {
    return null;
  }
}

/** Staff: all direct and listing-linked chats (excludes community channels). */
export async function staffGetAllDirectChats(limit = 500): Promise<Chat[]> {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('lastMessageAt', { ascending: false })
      .limit(limit);

    if (error) {
      handleSupabaseError(error, 'chats');
      return [];
    }

    return ((data ?? []) as Chat[]).filter((chat) => !isCommunityChat(chat.id));
  } catch {
    return [];
  }
}

/** Staff: fetch a chat row by id (for opening oversight threads). */
export async function getSupabaseChatById(chatId: string): Promise<Chat | null> {
  try {
    const { data, error } = await supabase.from('chats').select('*').eq('id', chatId).maybeSingle();
    if (error) {
      handleSupabaseError(error, 'chats');
      return null;
    }
    return (data as Chat) ?? null;
  } catch {
    return null;
  }
}

/** Staff: fetch all listings (any status except physically deleted) ordered by newest first. */
export async function staffGetAllListings(): Promise<{ items: ItemPost[]; errorMessage?: string }> {
  try {
    const rows = await fetchItemRowsForFeed();
    return { items: mapItemRows(rows) };
  } catch (err) {
    console.warn('staffGetAllListings failed:', err);
    return { items: [], errorMessage: 'Could not load listings.' };
  }
}

/** Staff: withdraw (soft-delete) any listing. */
export async function staffWithdrawListing(
  item: Pick<ItemPost, 'id' | 'title' | 'userId' | 'userDisplayName'>,
  actor: Pick<import('./types').UserProfile, 'uid' | 'displayName' | 'role'>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const { isStaffRole } = await import('./lib/roles');
  if (!isStaffRole(actor.role)) return { ok: false, errorMessage: 'Staff only.' };

  const ok = await updateSupabaseItemStatus(item.id, 'withdrawn', actor.uid);
  if (!ok) return { ok: false, errorMessage: 'Could not withdraw listing.' };

  // Audit log with listing owner as target so the webhook notifies them.
  await writeModerationAudit({
    actor: actor as import('./types').UserProfile,
    target: { uid: item.userId, displayName: item.userDisplayName },
    action: 'withdraw_listing',
    detail: `"${item.title}"`,
  });

  return { ok: true };
}

/** Staff: delete a listing permanently (manager+). */
export async function staffDeleteListing(
  item: Pick<ItemPost, 'id' | 'title' | 'userId' | 'userDisplayName'>,
  actor: Pick<import('./types').UserProfile, 'uid' | 'displayName' | 'role'>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const { canStaffDeleteAccount } = await import('./lib/roles');
  if (!canStaffDeleteAccount(actor.role)) return { ok: false, errorMessage: 'City Manager+ only.' };

  const deleted = await deleteSupabaseItem(item.id);
  if (!deleted) return { ok: false, errorMessage: 'Could not delete listing.' };

  // Audit log with listing owner as target so the webhook notifies them.
  await writeModerationAudit({
    actor: actor as import('./types').UserProfile,
    target: { uid: item.userId, displayName: item.userDisplayName },
    action: 'delete_listing',
    detail: `"${item.title}"`,
  });

  return { ok: true };
}

/** Staff: fetch all community events ordered by newest first. */
export async function staffGetAllEvents(): Promise<{ events: CommunityEvent[]; errorMessage?: string }> {
  try {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(1000);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { events: [], errorMessage: String(error.message || 'Could not load events.') };
    }

    const rows = (data ?? []) as CommunityEvent[];
    void syncPastEventStatuses(rows);
    const events = rows.map((row) => normalizeSupabaseEvent(row));
    return { events };
  } catch (err) {
    console.warn('staffGetAllEvents failed:', err);
    return { events: [], errorMessage: 'Could not load events.' };
  }
}

/** Staff: cancel any upcoming community event. */
export async function staffCancelEvent(
  event: Pick<CommunityEvent, 'id' | 'title' | 'userId' | 'userDisplayName' | 'status' | 'eventStartAt'>,
  actor: Pick<import('./types').UserProfile, 'uid' | 'displayName' | 'role'>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!isStaffRole(actor.role)) return { ok: false, errorMessage: 'Staff only.' };

  if (!isEventEditable(event)) {
    return { ok: false, errorMessage: 'Only upcoming events can be cancelled.' };
  }

  try {
    const { error } = await supabase
      .from('community_events')
      .update({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .eq('id', event.id)
      .in('status', ['active', 'upcoming']);

    if (error) {
      handleSupabaseError(error, 'community_events');
      return { ok: false, errorMessage: error.message || 'Could not cancel event.' };
    }

    await writeModerationAudit({
      actor: actor as import('./types').UserProfile,
      target: { uid: event.userId, displayName: event.userDisplayName },
      action: 'cancel_event',
      detail: `"${event.title}"`,
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not cancel event.',
    };
  }
}

/** Staff: delete a community event permanently (manager+). */
export async function staffDeleteEvent(
  event: Pick<CommunityEvent, 'id' | 'title' | 'userId' | 'userDisplayName'>,
  actor: Pick<import('./types').UserProfile, 'uid' | 'displayName' | 'role'>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffDeleteAccount(actor.role)) return { ok: false, errorMessage: 'City Manager+ only.' };

  try {
    await deleteSupabaseEvent(event.id);
    await writeModerationAudit({
      actor: actor as import('./types').UserProfile,
      target: { uid: event.userId, displayName: event.userDisplayName },
      action: 'delete_event',
      detail: `"${event.title}"`,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not delete event.',
    };
  }
}

export async function touchLastActive(): Promise<void> {
  try {
    await supabase.rpc('touch_last_active');
  } catch {
    // non-fatal
  }
}

export async function getUsersLastActive(uids: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(uids.filter(Boolean))];
  if (unique.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('users_public')
      .select('uid, lastActiveAt')
      .in('uid', unique);

    if (error) {
      handleSupabaseError(error, 'users_public');
      return {};
    }

    const map: Record<string, string | null> = {};
    for (const uid of unique) map[uid] = null;
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const uid = String(r.uid ?? '');
      if (!uid) continue;
      const raw = r.lastActiveAt ?? r.last_active_at;
      map[uid] = typeof raw === 'string' ? raw : null;
    }
    return map;
  } catch {
    return {};
  }
}

function countFromHeadResult(result: { count?: number | null; error?: { code?: string } | null }): number {
  if (result.error?.code === '42P01') return 0;
  return result.count ?? 0;
}

export async function getDirectorSiteOverview(): Promise<import('./types').DirectorSiteOverview> {
  const empty: import('./types').DirectorSiteOverview = {
    totalNeighbors: 0,
    neighborsJoinedToday: 0,
    activeOnlineCount: 0,
    activeTodayCount: 0,
    activeNeighbors: [],
    activeListings: 0,
    upcomingEvents: 0,
    openReports: 0,
    openTickets: 0,
    suspendedCount: 0,
    bannedCount: 0,
    downloadDevicesApk: 0,
    downloadDevicesAab: 0,
    downloadDevicesTotal: 0,
    installDevicesCount: 0,
    installDevicesApk: 0,
    installDevicesPwa: 0,
    installDevicesIosPwa: 0,
    recentActivity: [],
  };

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();
    const onlineSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [
      usersRes,
      joinedTodayRes,
      activeOnlineRes,
      activeTodayRes,
      activeNeighborsRes,
      activeListingsRes,
      upcomingEventsRes,
      openReportsRes,
      openTicketsRes,
      suspendedRes,
      bannedRes,
      downloadApkRes,
      downloadAabRes,
      downloadAnyRes,
      installTotalRes,
      installApkRes,
      installPwaRes,
      installIosPwaRes,
      auditRes,
      reportsRes,
      ticketsRes,
      recentUsersRes,
    ] = await Promise.all([
      supabase.from('users').select('uid', { count: 'exact', head: true }),
      supabase.from('users').select('uid', { count: 'exact', head: true }).gte('createdAt', todayIso),
      supabase.rpc('active_neighbor_count', { within_minutes: 5 }),
      supabase
        .from('users')
        .select('uid', { count: 'exact', head: true })
        .eq('accountStatus', 'active')
        .gte('lastActiveAt', todayIso),
      supabase
        .from('users')
        .select('uid, displayName, photoURL, neighborhood, lastActiveAt')
        .eq('accountStatus', 'active')
        .gte('lastActiveAt', onlineSince)
        .order('lastActiveAt', { ascending: false })
        .limit(12),
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase
        .from('community_events')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'upcoming']),
      supabase.from('user_reports').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('users').select('uid', { count: 'exact', head: true }).eq('accountStatus', 'suspended'),
      supabase.from('users').select('uid', { count: 'exact', head: true }).eq('accountStatus', 'banned'),
      supabase
        .from('app_device_downloads')
        .select('deviceId', { count: 'exact', head: true })
        .not('apkDownloadedAt', 'is', null),
      supabase
        .from('app_device_downloads')
        .select('deviceId', { count: 'exact', head: true })
        .not('aabDownloadedAt', 'is', null),
      supabase
        .from('app_device_downloads')
        .select('deviceId', { count: 'exact', head: true })
        .or('apkDownloadedAt.not.is.null,aabDownloadedAt.not.is.null'),
      supabase.from('app_device_installs').select('deviceId', { count: 'exact', head: true }),
      supabase
        .from('app_device_installs')
        .select('deviceId', { count: 'exact', head: true })
        .eq('installKind', 'android-apk'),
      supabase
        .from('app_device_installs')
        .select('deviceId', { count: 'exact', head: true })
        .eq('installKind', 'pwa'),
      supabase
        .from('app_device_installs')
        .select('deviceId', { count: 'exact', head: true })
        .eq('installKind', 'ios-pwa'),
      supabase
        .from('moderation_audit_log')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(12),
      supabase
        .from('user_reports')
        .select('id, reporterName, subject, status, createdAt')
        .order('createdAt', { ascending: false })
        .limit(8),
      supabase
        .from('support_tickets')
        .select('id, openerName, subject, status, createdAt')
        .order('updatedAt', { ascending: false })
        .limit(8),
      supabase
        .from('users')
        .select('uid, displayName, neighborhood, createdAt')
        .order('createdAt', { ascending: false })
        .limit(8),
    ]);

    const activity: import('./types').DirectorActivityItem[] = [];

    for (const row of recentUsersRes.data ?? []) {
      const r = row as Record<string, unknown>;
      activity.push({
        id: `join-${r.uid}`,
        kind: 'join',
        title: `${r.displayName} joined`,
        detail: String(r.neighborhood || 'Sacramento area'),
        at: String(r.createdAt),
      });
    }

    for (const row of auditRes.data ?? []) {
      const r = row as Record<string, unknown>;
      activity.push({
        id: `audit-${r.id}`,
        kind: 'moderation',
        title: `${r.action}: ${r.targetName}`,
        detail: `${r.actorName}${r.detail ? ` — ${r.detail}` : ''}`,
        at: String(r.createdAt),
      });
    }

    for (const row of reportsRes.data ?? []) {
      const r = row as Record<string, unknown>;
      activity.push({
        id: `report-${r.id}`,
        kind: 'report',
        title: `Report: ${r.subject}`,
        detail: `From ${r.reporterName} · ${r.status}`,
        at: String(r.createdAt),
      });
    }

    for (const row of ticketsRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const subject = String(r.subject || 'Help request').trim();
      activity.push({
        id: `ticket-${r.id}`,
        kind: 'ticket',
        title: `${r.openerName}: ${subject}`,
        detail: `Support ticket · ${r.status}`,
        at: String(r.createdAt),
      });
    }

    activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      totalNeighbors: usersRes.count ?? 0,
      neighborsJoinedToday: joinedTodayRes.count ?? 0,
      activeOnlineCount: Number(activeOnlineRes.data ?? 0),
      activeTodayCount: activeTodayRes.count ?? 0,
      activeNeighbors: (activeNeighborsRes.data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          uid: String(r.uid),
          displayName: String(r.displayName ?? 'Neighbor'),
          photoURL: typeof r.photoURL === 'string' ? r.photoURL : undefined,
          neighborhood: String(r.neighborhood ?? 'Sacramento'),
          lastActiveAt: String(r.lastActiveAt ?? new Date().toISOString()),
        };
      }),
      activeListings: activeListingsRes.count ?? 0,
      upcomingEvents: upcomingEventsRes.count ?? 0,
      openReports: openReportsRes.count ?? 0,
      openTickets: openTicketsRes.count ?? 0,
      suspendedCount: suspendedRes.count ?? 0,
      bannedCount: bannedRes.count ?? 0,
      downloadDevicesApk: countFromHeadResult(downloadApkRes),
      downloadDevicesAab: countFromHeadResult(downloadAabRes),
      downloadDevicesTotal: countFromHeadResult(downloadAnyRes),
      installDevicesCount: countFromHeadResult(installTotalRes),
      installDevicesApk: countFromHeadResult(installApkRes),
      installDevicesPwa: countFromHeadResult(installPwaRes),
      installDevicesIosPwa: countFromHeadResult(installIosPwaRes),
      recentActivity: activity.slice(0, 20),
    };
  } catch {
    return empty;
  }
}

export async function getModerationAuditLog(limit = 100): Promise<ModerationAuditEntry[]> {
  try {
    const { data, error } = await supabase
      .from('moderation_audit_log')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') return [];
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String(row.id),
      actorUserId: String(row.actorUserId),
      actorName: String(row.actorName),
      actorRole: row.actorRole ? String(row.actorRole) : null,
      targetUserId: String(row.targetUserId),
      targetName: String(row.targetName),
      action: String(row.action),
      detail: row.detail ? String(row.detail) : null,
      createdAt: String(row.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function staffSuspendUser(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
  durationDays: number;
  note?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffSuspend(params.actor.role)) {
    return { ok: false, errorMessage: 'You do not have permission to suspend users.' };
  }
  if (params.actor.uid === params.targetUserId) {
    return { ok: false, errorMessage: 'You cannot suspend yourself.' };
  }

  const until = new Date();
  until.setDate(until.getDate() + params.durationDays);

  try {
    const { error } = await supabase
      .from('users')
      .update({
        accountStatus: 'suspended',
        suspendedUntil: until.toISOString(),
        moderationNote: params.note?.trim() || null,
      })
      .eq('uid', params.targetUserId);

    if (error) {
      if (error.code === '42703') {
        return { ok: false, errorMessage: 'Run section 10 in complete-schema.sql (account moderation columns).' };
      }
      return { ok: false, errorMessage: error.message };
    }

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'suspend',
      detail: `${params.durationDays} day(s) until ${until.toLocaleString()}${params.note ? ` — ${params.note}` : ''}`,
    });
    // Account + director alerts are dispatched by moderation_audit_log webhook.

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not suspend user.' };
  }
}

export async function staffUnsuspendUser(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffSuspend(params.actor.role)) {
    return { ok: false, errorMessage: 'You do not have permission to unsuspend users.' };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ accountStatus: 'active', suspendedUntil: null, moderationNote: null })
      .eq('uid', params.targetUserId);

    if (error) return { ok: false, errorMessage: error.message };

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'unsuspend',
    });
    // Account + director alerts are dispatched by moderation_audit_log webhook.

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not unsuspend user.' };
  }
}

export async function staffBanUser(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
  note?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffBan(params.actor.role)) {
    return { ok: false, errorMessage: 'You do not have permission to ban users.' };
  }
  if (params.actor.uid === params.targetUserId) {
    return { ok: false, errorMessage: 'You cannot ban yourself.' };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        accountStatus: 'banned',
        suspendedUntil: null,
        moderationNote: params.note?.trim() || null,
      })
      .eq('uid', params.targetUserId);

    if (error) {
      if (error.code === '42703') {
        return { ok: false, errorMessage: 'Run section 10 in complete-schema.sql (account moderation columns).' };
      }
      return { ok: false, errorMessage: error.message };
    }

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'ban',
      detail: params.note?.trim() || 'Platform ban',
    });
    // Account + director alerts are dispatched by moderation_audit_log webhook.

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not ban user.' };
  }
}

export async function staffUnbanUser(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffBan(params.actor.role)) {
    return { ok: false, errorMessage: 'You do not have permission to unban users.' };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ accountStatus: 'active', suspendedUntil: null, moderationNote: null })
      .eq('uid', params.targetUserId);

    if (error) return { ok: false, errorMessage: error.message };

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'unban',
    });
    // Account + director alerts are dispatched by moderation_audit_log webhook.

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not unban user.' };
  }
}

export async function staffUpdateUserProfile(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
  displayName: string;
  neighborhood: string;
  bio?: string;
  role?: UserRole;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffEditUser(params.actor.role)) {
    return { ok: false, errorMessage: 'You do not have permission to edit users.' };
  }

  try {
    const payload: Record<string, unknown> = {
      displayName: params.displayName.trim(),
      neighborhood: params.neighborhood,
      bio: params.bio?.trim() || null,
    };
    if (params.role && isDirectorRole(params.actor.role)) {
      const slotCheck = await assertStaffRoleSlotAvailable(params.targetUserId, params.role);
      if (slotCheck.ok === false) {
        return { ok: false, errorMessage: slotCheck.errorMessage };
      }
      payload.role = params.role;
    }

    const { error } = await supabase.from('users').update(payload).eq('uid', params.targetUserId);
    if (error) return { ok: false, errorMessage: error.message };

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'edit_profile',
      detail: `Updated profile${params.role ? `, role → ${params.role}` : ''}`,
    });

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not update user.' };
  }
}

export { canViewAuditLog };

/**
 * --- REPORTS & SUPPORT TICKETS ---
 */

function normalizeReport(row: Record<string, unknown>): UserReport {
  const sourceRaw = row.source;
  return {
    id: String(row.id),
    reporterUserId: String(row.reporterUserId),
    reporterName: String(row.reporterName),
    subject: String(row.subject),
    body: String(row.body),
    reportedUserId: row.reportedUserId ? String(row.reportedUserId) : null,
    reportedUserName: row.reportedUserName ? String(row.reportedUserName) : null,
    proofImageUrl: row.proofImageUrl ? String(row.proofImageUrl) : null,
    source: sourceRaw === 'block' ? 'block' : 'manual',
    status: (row.status === 'reviewed' ? 'reviewed' : 'new') as UserReport['status'],
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

function normalizeTicket(row: Record<string, unknown>): SupportTicket {
  const ticketSourceRaw = row.ticketSource ?? row.ticket_source;
  const ticketSource =
    ticketSourceRaw === 'staff_listing' || ticketSourceRaw === 'staff_event' || ticketSourceRaw === 'neighbor'
      ? ticketSourceRaw
      : 'neighbor';

  return {
    id: String(row.id),
    openerUserId: String(row.openerUserId),
    openerName: String(row.openerName),
    openerRole: normalizeUserRole(row.openerRole),
    minStaffRank: Number(row.minStaffRank ?? 1),
    subject: String(row.subject),
    status: row.status === 'closed' ? 'closed' : 'open',
    closedByUserId: row.closedByUserId ? String(row.closedByUserId) : null,
    ticketSource,
    relatedItemId: row.relatedItemId ? String(row.relatedItemId) : null,
    relatedItemTitle: row.relatedItemTitle ? String(row.relatedItemTitle) : null,
    relatedEventId: row.relatedEventId ? String(row.relatedEventId) : null,
    relatedEventTitle: row.relatedEventTitle ? String(row.relatedEventTitle) : null,
    initiatedByUserId: row.initiatedByUserId ? String(row.initiatedByUserId) : null,
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  };
}

function normalizeTicketMessage(row: Record<string, unknown>): SupportTicketMessage {
  const imageRaw = row.imageUrl ?? row.image_url;
  const imageUrl =
    typeof imageRaw === 'string' && imageRaw.trim() ? imageRaw.trim() : null;
  let text = String(row.text ?? '');
  if (!imageUrl && text.includes('[Photo]:')) {
    const match = text.match(/\[Photo\]:\s*(\S+)/);
    if (match) {
      return {
        id: String(row.id),
        ticketId: String(row.ticketId),
        senderUserId: String(row.senderUserId),
        senderName: String(row.senderName),
        text: text.replace(/\n\n\[Photo\]:\s*\S+\s*/g, '').trim() || '📷 Photo',
        imageUrl: match[1],
        createdAt: String(row.createdAt ?? row.created_at ?? ''),
      };
    }
  }
  return {
    id: String(row.id),
    ticketId: String(row.ticketId),
    senderUserId: String(row.senderUserId),
    senderName: String(row.senderName),
    text,
    imageUrl,
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

async function insertSupportTicketMessageRow(params: {
  id?: string;
  ticketId: string;
  senderUserId: string;
  senderName: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
}): Promise<{ ok: boolean; messageId?: string; errorMessage?: string }> {
  const id = params.id || `tmsg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const displayText = params.text.trim() || (params.imageUrl ? '📷 Photo' : '');

  const payload: Record<string, unknown> = {
    id,
    ticketId: params.ticketId,
    senderUserId: params.senderUserId,
    senderName: params.senderName,
    text: displayText,
    createdAt: params.createdAt,
  };
  if (params.imageUrl) payload.imageUrl = params.imageUrl;

  let { error } = await supabase.from('support_ticket_messages').insert(payload);

  if (error && isMissingImageUrlColumnError(error) && params.imageUrl) {
    const { imageUrl: _omit, ...fallbackPayload } = payload;
    fallbackPayload.text = `${displayText}\n\n[Photo]: ${params.imageUrl}`.trim();
    ({ error } = await supabase.from('support_ticket_messages').insert(fallbackPayload));
  }

  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, messageId: id };
}

export async function submitUserReport(params: {
  reporter: UserProfile;
  subject: string;
  body: string;
  reportedUserId?: string;
  reportedUserName?: string;
  proofImageUrl?: string | null;
  proofFile?: File | null;
  feedPostId?: string;
  feedCommentId?: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const subject = params.subject.trim();
  const body = params.body.trim();
  if (!subject || !body) {
    return { ok: false, errorMessage: 'Please add a subject and description.' };
  }

  const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  let proofImageUrl = params.proofImageUrl ?? null;

  if (params.proofFile) {
    proofImageUrl = await uploadReportProofImage(params.proofFile, reportId);
  }

  try {
    const { error } = await supabase.from('user_reports').insert({
      id: reportId,
      reporterUserId: params.reporter.uid,
      reporterName: params.reporter.displayName,
      subject,
      body: proofImageUrl ? `${body}\n\nScreenshot attached for staff review.` : body,
      reportedUserId: params.reportedUserId || null,
      reportedUserName: params.reportedUserName || null,
      proofImageUrl,
      source: 'manual',
      status: 'new',
      createdAt: new Date().toISOString(),
      ...(params.feedPostId ? { feedPostId: params.feedPostId } : {}),
      ...(params.feedCommentId ? { feedCommentId: params.feedCommentId } : {}),
    });

    if (error) {
      if (error.code === '42P01') {
        return { ok: false, errorMessage: 'Run section 12 in complete-schema.sql (user_reports).' };
      }
      return { ok: false, errorMessage: error.message };
    }

    try {
      const m = await import('./lib/pushNotifications');
      await m.notifyReportPush(reportId);
    } catch (err) {
      console.warn('[push]', err);
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not send report.' };
  }
}

export async function getStaffUserReports(limit = 100): Promise<UserReport[]> {
  try {
    const { data, error } = await supabase
      .from('user_reports')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') return [];
      return [];
    }
    return (data ?? []).map((row) => normalizeReport(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function markUserReportReviewed(
  reportId: string,
  actor?: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    if (!actor || !isStaffRole(actor.role)) {
      return { ok: false, errorMessage: 'Staff access required.' };
    }

    const { error } = await supabase
      .from('user_reports')
      .update({ status: 'reviewed' })
      .eq('id', reportId);

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not update report.' };
  }
}

export async function createSupportTicket(params: {
  opener: UserProfile;
  subject: string;
  message: string;
  imageFile?: File | null;
}): Promise<{ ok: boolean; ticketId?: string; errorMessage?: string }> {
  const subject = params.subject.trim();
  const message = params.message.trim();
  if (!subject) {
    return { ok: false, errorMessage: 'Please add a subject.' };
  }
  if (!message && !params.imageFile) {
    return { ok: false, errorMessage: 'Please add a message or attach a photo.' };
  }

  const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const openerRole = normalizeUserRole(params.opener.role);
  const minStaffRank = minStaffRankForTicket(openerRole);
  const now = new Date().toISOString();
  const messageId = `tmsg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let imageUrl: string | null = null;
  if (params.imageFile) {
    imageUrl = await uploadTicketMessageImage(params.imageFile, ticketId, messageId);
  }

  try {
    const { error: ticketError } = await supabase.from('support_tickets').insert({
      id: ticketId,
      openerUserId: params.opener.uid,
      openerName: params.opener.displayName,
      openerRole,
      minStaffRank,
      subject,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });

    if (ticketError) {
      if (ticketError.code === '42P01') {
        return { ok: false, errorMessage: 'Run sections 13–14 in complete-schema.sql (support tickets).' };
      }
      return { ok: false, errorMessage: ticketError.message };
    }

    const msgResult = await insertSupportTicketMessageRow({
      ticketId,
      senderUserId: params.opener.uid,
      senderName: params.opener.displayName,
      text: message,
      imageUrl,
      createdAt: now,
    });

    if (!msgResult.ok) return { ok: false, errorMessage: msgResult.errorMessage };

    try {
      const m = await import('./lib/pushNotifications');
      await m.notifySupportTicketPush({
        ticketId,
        event: 'opened',
        messageId: msgResult.messageId,
      });
    } catch (err) {
      console.warn('[push]', err);
    }

    return { ok: true, ticketId };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not open ticket.' };
  }
}

export async function findOrCreateStaffListingOutreachTicket(params: {
  staff: UserProfile;
  item: Pick<import('./types').ItemPost, 'id' | 'title' | 'userId' | 'userDisplayName'>;
}): Promise<{ ok: boolean; ticketId?: string; errorMessage?: string }> {
  if (!isStaffRole(params.staff.role)) {
    return { ok: false, errorMessage: 'Staff only.' };
  }

  try {
    const { data: existing, error: findError } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('openerUserId', params.item.userId)
      .eq('relatedItemId', params.item.id)
      .eq('ticketSource', 'staff_listing')
      .eq('status', 'open')
      .maybeSingle();

    if (findError && findError.code !== '42P01') {
      return { ok: false, errorMessage: findError.message };
    }
    if (existing?.id) return { ok: true, ticketId: String(existing.id) };

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const subject = `Listing: ${params.item.title}`;

    const { error: ticketError } = await supabase.from('support_tickets').insert({
      id: ticketId,
      openerUserId: params.item.userId,
      openerName: params.item.userDisplayName,
      openerRole: 'user',
      minStaffRank: ROLE_RANK.city_moderator,
      subject,
      status: 'open',
      ticketSource: 'staff_listing',
      relatedItemId: params.item.id,
      relatedItemTitle: params.item.title,
      initiatedByUserId: params.staff.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (ticketError) {
      if (ticketError.code === '42P01') {
        return { ok: false, errorMessage: 'Run staff outreach ticket migration in Supabase.' };
      }
      return { ok: false, errorMessage: ticketError.message };
    }

    const msgResult = await insertSupportTicketMessageRow({
      ticketId,
      senderUserId: params.staff.uid,
      senderName: params.staff.displayName,
      text: `${roleLabel(params.staff.role)} opened a staff thread about this listing. Neighbors and staff can coordinate here.`,
      createdAt: now,
    });
    if (!msgResult.ok) return { ok: false, errorMessage: msgResult.errorMessage };

    try {
      const m = await import('./lib/pushNotifications');
      await m.notifySupportTicketPush({ ticketId, event: 'opened', messageId: msgResult.messageId });
    } catch (err) {
      console.warn('[push]', err);
    }

    return { ok: true, ticketId };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not open staff thread.' };
  }
}

export async function findOrCreateStaffEventOutreachTicket(params: {
  staff: UserProfile;
  event: Pick<import('./types').CommunityEvent, 'id' | 'title' | 'userId' | 'userDisplayName'>;
}): Promise<{ ok: boolean; ticketId?: string; errorMessage?: string }> {
  if (!isStaffRole(params.staff.role)) {
    return { ok: false, errorMessage: 'Staff only.' };
  }

  try {
    const { data: existing, error: findError } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('openerUserId', params.event.userId)
      .eq('relatedEventId', params.event.id)
      .eq('ticketSource', 'staff_event')
      .eq('status', 'open')
      .maybeSingle();

    if (findError && findError.code !== '42P01') {
      return { ok: false, errorMessage: findError.message };
    }
    if (existing?.id) return { ok: true, ticketId: String(existing.id) };

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const subject = `Event: ${params.event.title}`;

    const { error: ticketError } = await supabase.from('support_tickets').insert({
      id: ticketId,
      openerUserId: params.event.userId,
      openerName: params.event.userDisplayName,
      openerRole: 'user',
      minStaffRank: ROLE_RANK.city_moderator,
      subject,
      status: 'open',
      ticketSource: 'staff_event',
      relatedEventId: params.event.id,
      relatedEventTitle: params.event.title,
      initiatedByUserId: params.staff.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (ticketError) {
      if (ticketError.code === '42P01') {
        return { ok: false, errorMessage: 'Run staff outreach ticket migration in Supabase.' };
      }
      return { ok: false, errorMessage: ticketError.message };
    }

    const msgResult = await insertSupportTicketMessageRow({
      ticketId,
      senderUserId: params.staff.uid,
      senderName: params.staff.displayName,
      text: `${roleLabel(params.staff.role)} opened a staff thread about this event.`,
      createdAt: now,
    });
    if (!msgResult.ok) return { ok: false, errorMessage: msgResult.errorMessage };

    try {
      const m = await import('./lib/pushNotifications');
      await m.notifySupportTicketPush({ ticketId, event: 'opened', messageId: msgResult.messageId });
    } catch (err) {
      console.warn('[push]', err);
    }

    return { ok: true, ticketId };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not open staff thread.' };
  }
}

async function enrichSupportTicketsWithPhotos(tickets: SupportTicket[]): Promise<SupportTicket[]> {
  if (!tickets.length) return tickets;
  const openerIds = [...new Set(tickets.map((ticket) => ticket.openerUserId).filter(Boolean))];
  const info = await getUserDisplayInfoByIds(openerIds);
  return tickets.map((ticket) => ({
    ...ticket,
    openerPhotoURL: info[ticket.openerUserId]?.photoURL,
  }));
}

export async function getSupportTicketsForUser(userId: string): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('openerUserId', userId)
      .order('updatedAt', { ascending: false });

    if (error) return [];
    const tickets = (data ?? []).map((row) => normalizeTicket(row as Record<string, unknown>));
    return enrichSupportTicketsWithPhotos(tickets);
  } catch {
    return [];
  }
}

export async function getSupportTicketsForStaff(viewer: UserProfile): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (error) return [];

    const tickets = (data ?? [])
      .map((row) => normalizeTicket(row as Record<string, unknown>))
      .filter((ticket) => canViewerAccessTicket(viewer, ticket));
    return enrichSupportTicketsWithPhotos(tickets);
  } catch {
    return [];
  }
}

export async function getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  try {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticketId', ticketId)
      .order('createdAt', { ascending: true });

    if (error) return [];
    return (data ?? []).map((row) => normalizeTicketMessage(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getSupportTicketLastMessages(
  ticketIds: string[],
): Promise<Record<string, Pick<SupportTicketMessage, 'text' | 'createdAt' | 'senderUserId' | 'imageUrl'>>> {
  if (ticketIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select('ticketId, text, createdAt, senderUserId, imageUrl')
      .in('ticketId', ticketIds)
      .order('createdAt', { ascending: false });

    if (error || !data?.length) return {};

    const latest: Record<string, Pick<SupportTicketMessage, 'text' | 'createdAt' | 'senderUserId' | 'imageUrl'>> =
      {};
    for (const row of data) {
      const ticketId = String(row.ticketId ?? '');
      if (!ticketId || latest[ticketId]) continue;
      latest[ticketId] = {
        text: String(row.text ?? ''),
        createdAt: String(row.createdAt ?? ''),
        senderUserId: String(row.senderUserId ?? ''),
        imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : null,
      };
    }
    return latest;
  } catch {
    return {};
  }
}

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    if (error || !data) return null;
    const ticket = normalizeTicket(data as Record<string, unknown>);
    const [enriched] = await enrichSupportTicketsWithPhotos([ticket]);
    return enriched ?? ticket;
  } catch {
    return null;
  }
}

export async function addSupportTicketMessage(params: {
  ticketId: string;
  sender: UserProfile;
  text: string;
  imageFile?: File | null;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const text = params.text.trim();
  if (!text && !params.imageFile) {
    return { ok: false, errorMessage: 'Add a message or attach a photo.' };
  }

  const ticket = await getSupportTicketById(params.ticketId);
  if (!ticket) return { ok: false, errorMessage: 'Ticket not found.' };
  if (ticket.status === 'closed') return { ok: false, errorMessage: 'This ticket is closed.' };
  if (!canViewerAccessTicket(params.sender, ticket)) {
    return { ok: false, errorMessage: 'You cannot reply to this ticket.' };
  }

  const now = new Date().toISOString();
  const messageId = `tmsg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let imageUrl: string | null = null;
  if (params.imageFile) {
    imageUrl = await uploadTicketMessageImage(params.imageFile, params.ticketId, messageId);
  }

  try {
    const msgResult = await insertSupportTicketMessageRow({
      id: messageId,
      ticketId: params.ticketId,
      senderUserId: params.sender.uid,
      senderName: params.sender.displayName,
      text,
      imageUrl,
      createdAt: now,
    });

    if (!msgResult.ok) return msgResult;

    await supabase
      .from('support_tickets')
      .update({ updatedAt: now })
      .eq('id', params.ticketId);

    try {
      const m = await import('./lib/pushNotifications');
      const event = params.sender.uid !== ticket.openerUserId ? 'staff_reply' : 'user_message';
      await m.notifySupportTicketPush({
        ticketId: params.ticketId,
        event,
        messageId: msgResult.messageId,
      });
    } catch (err) {
      console.warn('[push]', err);
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not send message.' };
  }
}

export async function deleteSupportTicketMessage(params: {
  messageId: string;
  ticketId: string;
  actor: Pick<UserProfile, 'uid'>;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: msg, error: fetchError } = await supabase
      .from('support_ticket_messages')
      .select('id, ticketId, senderUserId, text')
      .eq('id', params.messageId)
      .maybeSingle();

    if (fetchError) {
      return { ok: false, errorMessage: fetchError.message };
    }
    if (!msg) {
      return { ok: false, errorMessage: 'Message not found or already removed.' };
    }
    if (String(msg.ticketId) !== params.ticketId) {
      return { ok: false, errorMessage: 'Message not in this ticket.' };
    }
    if (!canUnsendSupportTicketMessage(params.actor, { senderUserId: String(msg.senderUserId) })) {
      return { ok: false, errorMessage: 'You cannot unsend this message.' };
    }

    const ticket = await getSupportTicketById(params.ticketId);
    if (!ticket) return { ok: false, errorMessage: 'Ticket not found.' };
    if (ticket.status === 'closed') {
      return { ok: false, errorMessage: 'This ticket is closed.' };
    }
    if (!canViewerAccessTicket(params.actor, ticket)) {
      return { ok: false, errorMessage: 'You cannot unsend messages in this ticket.' };
    }

    const { error: deleteError, count } = await supabase
      .from('support_ticket_messages')
      .delete({ count: 'exact' })
      .eq('id', params.messageId);

    if (deleteError) {
      return { ok: false, errorMessage: deleteError.message };
    }
    if (count === 0) {
      return { ok: false, errorMessage: 'Message not found or already removed.' };
    }

    const { data: latestMsgs } = await supabase
      .from('support_ticket_messages')
      .select('createdAt')
      .eq('ticketId', params.ticketId)
      .order('createdAt', { ascending: false })
      .limit(1);

    const updatedAt =
      latestMsgs?.[0]?.createdAt != null
        ? String(latestMsgs[0].createdAt)
        : ticket.createdAt;

    await supabase
      .from('support_tickets')
      .update({ updatedAt })
      .eq('id', params.ticketId);

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not unsend message.' };
  }
}

async function resetMessageRequestsBetween(userA: string, userB: string): Promise<void> {
  try {
    await supabase
      .from('message_requests')
      .delete()
      .or(
        `and(fromUserId.eq.${userA},toUserId.eq.${userB}),and(fromUserId.eq.${userB},toUserId.eq.${userA})`,
      );
  } catch {
    // message_requests table may be missing on older installs
  }
}

export async function deleteSupabaseDirectChat(
  chatId: string,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { data: chat, error: fetchError } = await supabase
      .from('chats')
      .select('id, participantIds, itemId')
      .eq('id', chatId)
      .maybeSingle();

    if (fetchError) {
      return { ok: false, errorMessage: fetchError.message };
    }
    if (!chat) {
      return { ok: false, errorMessage: 'Conversation not found.' };
    }

    const row = chat as { id: string; participantIds: string[]; itemId?: string };
    const itemId = String(row.itemId || '').trim();

    let listing: { userId: string; status: string } | null = null;
    if (itemId) {
      const { data: item } = await supabase
        .from('items')
        .select('userId, status')
        .eq('id', itemId)
        .maybeSingle();
      if (item) {
        listing = {
          userId: String((item as { userId?: string }).userId || ''),
          status: String((item as { status?: string }).status || ''),
        };
      }
    }

    if (!canDeleteDirectChat(actor, row, listing)) {
      const isPoster = listing?.userId === actor.uid;
      if (itemId && isPoster && listing && !isListingPostChatReadOnly(listing.status)) {
        return {
          ok: false,
          errorMessage:
            'Gift or withdraw your listing first — you can delete this post chat once it is read-only.',
        };
      }
      return { ok: false, errorMessage: 'You cannot delete this conversation.' };
    }

    await supabase.from('messages').delete().eq('chatId', chatId);
    const { error: deleteError } = await supabase.from('chats').delete().eq('id', chatId);

    if (deleteError) {
      return { ok: false, errorMessage: deleteError.message };
    }

    const participants = (row.participantIds || []).filter(Boolean);
    const otherId = participants.find((id) => id !== actor.uid);
    if (otherId && !itemId) {
      await resetMessageRequestsBetween(actor.uid, otherId);
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete conversation.' };
  }
}

export async function deleteSupportTicket(params: {
  ticketId: string;
  user: UserProfile;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const ticket = await getSupportTicketById(params.ticketId);
  if (!ticket) return { ok: false, errorMessage: 'Ticket not found.' };
  if (!canDeleteSupportTicket(params.user, ticket)) {
    return {
      ok: false,
      errorMessage:
        ticket.status !== 'closed'
          ? 'Close this ticket before deleting it.'
          : 'You cannot delete this ticket.',
    };
  }

  try {
    await supabase.from('support_ticket_messages').delete().eq('ticketId', params.ticketId);
    const { error } = await supabase.from('support_tickets').delete().eq('id', params.ticketId);
    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete ticket.' };
  }
}

export async function closeSupportTicket(params: {
  ticketId: string;
  user: UserProfile;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const ticket = await getSupportTicketById(params.ticketId);
  if (!ticket) return { ok: false, errorMessage: 'Ticket not found.' };
  if (!canViewerAccessTicket(params.user, ticket)) {
    return { ok: false, errorMessage: 'You cannot close this ticket.' };
  }

  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        closedByUserId: params.user.uid,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.ticketId);

    if (error) return { ok: false, errorMessage: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not close ticket.' };
  }
}

/** Client-side purge when account-deletion RPCs are not installed yet. */
async function purgeUserCommunityDataClient(uid: string): Promise<void> {
  const { data: items } = await supabase.from('items').select('id').eq('userId', uid);
  for (const row of items ?? []) {
    await deleteSupabaseItem(row.id);
  }

  await supabase.from('item_votes').delete().eq('userId', uid);
  await supabase.from('item_comments').delete().eq('userId', uid);
  await supabase.from('app_update_comments').delete().eq('userId', uid);

  const { data: userEvents } = await supabase.from('community_events').select('id').eq('userId', uid);
  for (const row of userEvents ?? []) {
    await deleteSupabaseEvent(row.id);
  }
  await supabase.from('event_rsvps').delete().eq('userId', uid);
  await supabase.from('event_comments').delete().eq('userId', uid);
  await supabase.from('app_reviews').delete().eq('userId', uid);
  await supabase.from('staff_messages').delete().eq('userId', uid);
  await supabase.from('community_content_votes').delete().eq('userId', uid);
  await supabase
    .from('community_content_votes')
    .delete()
    .eq('targetType', 'leader_message')
    .eq('targetId', uid);
  await supabase
    .from('item_claims')
    .delete()
    .or(`giverUserId.eq.${uid},claimerUserId.eq.${uid}`);
  await supabase
    .from('item_claim_requests')
    .delete()
    .or(`giverUserId.eq.${uid},claimerUserId.eq.${uid}`);

  const { data: chats } = await supabase
    .from('chats')
    .select('id')
    .contains('participantIds', JSON.stringify([uid]));
  const chatIds = (chats ?? []).map((c) => c.id);
  if (chatIds.length > 0) {
    await supabase.from('messages').delete().in('chatId', chatIds);
    await supabase.from('chats').delete().in('id', chatIds);
  }
  await supabase.from('messages').delete().eq('senderId', uid);

  await supabase
    .from('user_blocks')
    .delete()
    .or(`blockerUserId.eq.${uid},blockedUserId.eq.${uid}`);
  await supabase
    .from('message_requests')
    .delete()
    .or(`fromUserId.eq.${uid},toUserId.eq.${uid}`);
  await supabase
    .from('user_reports')
    .delete()
    .or(`reporterUserId.eq.${uid},reportedUserId.eq.${uid}`);

  const { data: tickets } = await supabase.from('support_tickets').select('id').eq('openerUserId', uid);
  const ticketIds = (tickets ?? []).map((t) => t.id);
  if (ticketIds.length > 0) {
    await supabase.from('support_ticket_messages').delete().in('ticketId', ticketIds);
    await supabase.from('support_tickets').delete().in('id', ticketIds);
  }
  await supabase.from('support_ticket_messages').delete().eq('senderUserId', uid);

  await supabase
    .from('moderation_audit_log')
    .delete()
    .or(`actorUserId.eq.${uid},targetUserId.eq.${uid}`);
}

async function notifyDirectorDepartureAlert(params: {
  targetUserId: string;
  targetName: string;
  detail: string;
  excludeUserIds?: string[];
}): Promise<void> {
  try {
    const m = await import('./lib/pushIntegration');
    await m.pushDirectorAlert({
      category: 'leave',
      title: `Neighbor left — ${params.targetName}`,
      body: params.detail,
      tag: `director-leave-${params.targetUserId}`,
      excludeUserIds: params.excludeUserIds,
    });
  } catch (err) {
    console.warn('[push] director departure alert failed:', err);
  }
}

/**
 * Permanently removes the signed-in user's account (profile + auth).
 * Requires `delete_own_account()` in Supabase — run complete-schema.sql.
 */
export async function staffDeleteUserAccount(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
  targetRole?: UserProfile['role'];
}): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canStaffDeleteAccount(params.actor.role)) {
    return { ok: false, errorMessage: 'You do not have permission to delete accounts.' };
  }
  if (params.actor.uid === params.targetUserId) {
    return { ok: false, errorMessage: 'Use your account settings to delete your own account.' };
  }

  const targetRole = normalizeUserRole(params.targetRole);
  if (
    normalizeUserRole(params.actor.role) === 'city_manager' &&
    roleRank(targetRole) >= roleRank('city_manager')
  ) {
    return { ok: false, errorMessage: 'Only a director can delete leadership accounts.' };
  }

  try {
    const { data: targetProfile } = await supabase
      .from('users')
      .select('neighborhood')
      .eq('uid', params.targetUserId)
      .maybeSingle();
    const targetArea = String(
      (targetProfile as { neighborhood?: string } | null)?.neighborhood || 'Sacramento area',
    );

    const { error: rpcError } = await supabase.rpc('staff_delete_user_account', {
      target_uid: params.targetUserId,
    });

    if (!rpcError) {
      await writeModerationAudit({
        actor: params.actor,
        target: { uid: params.targetUserId, displayName: params.targetName },
        action: 'delete_account',
        detail: 'Account and all community data permanently removed',
      });
      await notifyDirectorDepartureAlert({
        targetUserId: params.targetUserId,
        targetName: params.targetName,
        detail: `${targetArea} · removed by ${params.actor.displayName}`,
        excludeUserIds: [params.actor.uid],
      });
      return { ok: true };
    }

    const rpcMissing =
      rpcError.code === '42883' ||
      rpcError.message?.includes('staff_delete_user_account') ||
      rpcError.message?.includes('Could not find the function');

    if (!rpcMissing) {
      return { ok: false, errorMessage: rpcError.message };
    }

    await purgeUserCommunityDataClient(params.targetUserId);
    const { error: profileError } = await supabase.from('users').delete().eq('uid', params.targetUserId);
    if (profileError) {
      return { ok: false, errorMessage: profileError.message };
    }

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'delete_account',
      detail: 'Community data removed (run complete-schema.sql for full auth removal)',
    });

    await notifyDirectorDepartureAlert({
      targetUserId: params.targetUserId,
      targetName: params.targetName,
      detail: `${targetArea} · removed by ${params.actor.displayName}`,
      excludeUserIds: [params.actor.uid],
    });

    return {
      ok: true,
      errorMessage:
        'Community data removed. Run complete-schema.sql to fully remove sign-in access.',
    };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete account.' };
  }
}

export async function deleteOwnAccount(): Promise<{ ok: boolean; errorMessage?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) {
    return { ok: false, errorMessage: 'You must be signed in to delete your account.' };
  }

  const { data: leavingProfile } = await supabase
    .from('users')
    .select('displayName, neighborhood')
    .eq('uid', uid)
    .maybeSingle();
  const leavingName = String(
    (leavingProfile as { displayName?: string } | null)?.displayName || 'A neighbor',
  );
  const leavingArea = String(
    (leavingProfile as { neighborhood?: string } | null)?.neighborhood || 'Sacramento area',
  );

  const notifyDirectorLeave = async () => {
    try {
      const m = await import('./lib/pushIntegration');
      await m.pushDirectorAlert({
        category: 'leave',
        title: `Neighbor left — ${leavingName}`,
        body: `${leavingArea} · account deleted`,
        tag: `director-leave-${uid}`,
        excludeUserIds: [uid],
      });
    } catch (err) {
      console.warn('[push] director leave alert failed:', err);
    }
  };

  try {
    // Push while auth is still valid — delete_own_account removes auth.users immediately after.
    await notifyDirectorLeave();

    const { error: rpcError } = await supabase.rpc('delete_own_account');
    if (!rpcError) {
      return { ok: true };
    }

    const rpcMissing =
      rpcError.code === '42883' ||
      rpcError.message?.includes('delete_own_account') ||
      rpcError.message?.includes('Could not find the function');

    if (!rpcMissing) {
      return { ok: false, errorMessage: rpcError.message };
    }

    await purgeUserCommunityDataClient(uid);
    const { error: profileError } = await supabase.from('users').delete().eq('uid', uid);
    if (profileError) {
      return { ok: false, errorMessage: profileError.message };
    }

    const { clearNotificationDataOnLogout } = await import('./hooks/usePushNotifications');
    await clearNotificationDataOnLogout(uid);
    await supabase.auth.signOut();
    return {
      ok: true,
      errorMessage:
        'Community data removed. Ask an admin to run complete-schema.sql if you still receive sign-in emails.',
    };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete account.' };
  }
}
