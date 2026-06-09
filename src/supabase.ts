import { createClient } from '@supabase/supabase-js';
import { UserProfile, ItemPost, Chat, Message, ItemVote, ItemComment, MessageRequest, AccountStatus, ModerationAuditEntry, StaffUserRow, UserReport, SupportTicket, SupportTicketMessage, ListingSubItem, ItemClaimRequest, CommunityEvent, EventRsvp, EventComment, DirectorMessageContent, StaffMessageContent, AppReview, AppUpdateInput, AppUpdateRecord, CommunityContentVote, CommunityContentVoteTarget } from './types';
import { DIRECTOR_MESSAGE, STAFF_MESSAGE_DEFAULT } from './siteContent';
import { compressImageIfNeeded } from './lib/imageUrl';
import { formatItemClaimedChatMessage, formatSelfClaimRequestMessage } from './lib/claims';
import { blockReasonLabel } from './lib/blockReasons';
import { normalizeItemMedia } from './lib/listingContent';
import { normalizeUserRole, type UserRole, canEditOwnStaffMessage, canManageAppUpdates, canStaffBan, canStaffDeleteAccount, canStaffEditUser, canStaffSuspend, canViewAuditLog, canViewerAccessTicket, minStaffRankForTicket, roleLabel, roleRank } from './lib/roles';

// Read values from environment or fall back to the provided strings.
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.NEXT_PUBLIC_SUPABASE_URL || metaEnv.VITE_SUPABASE_URL || 'https://nezmabanjoqdzikliysd.supabase.co';
const supabaseKey = metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_TmJr2L0c5ZbR7GSiFztjKQ_MHyiBfPe';

export const supabase = createClient(supabaseUrl, supabaseKey);

function firePush(task: () => Promise<void>) {
  task().catch((err) => console.warn('[push]', err));
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
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
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
  "isFree" BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

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
  "rsvpStatus" TEXT NOT NULL CHECK ("rsvpStatus" IN ('going', 'maybe', 'not_going')),
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

  if (accountStatus !== 'active' && accountStatus !== 'suspended' && accountStatus !== 'banned') {
    accountStatus = 'active';
  }

  return { accountStatus, suspendedUntil };
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
    createdAt: row.createdAt ?? row.created_at,
  };
}

/** Push avatar URL onto listings, comments, and chat headers so neighbors see the latest photo. */
export async function syncProfilePhotoAcrossApp(
  uid: string,
  photoURL: string | null,
  displayName?: string,
): Promise<void> {
  const safePhoto = sanitizePhotoUrlForDb(photoURL);

  try {
    await supabase.from('items').update({ userPhotoURL: safePhoto }).eq('userId', uid);

    if (displayName?.trim()) {
      await supabase.from('items').update({ userDisplayName: displayName.trim() }).eq('userId', uid);
    }

    await supabase.from('item_comments').update({ userPhoto: safePhoto }).eq('userId', uid);

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

const DIRECTOR_UIDS = new Set(['204b071f-100c-401d-b76d-40c594e1f132']);
const DIRECTOR_EMAIL = 'sigsecspec@gmail.com';

export function isDirectorUser(uid: string, email?: string | null): boolean {
  return DIRECTOR_UIDS.has(uid) || (email?.toLowerCase() === DIRECTOR_EMAIL);
}

/** Instant profile from Supabase auth — never blocks on the database. */
export function profileFromAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  const email = user.email?.trim() || '';
  const isDirector = isDirectorUser(user.id, email);
  const meta = user.user_metadata ?? {};

  return {
    uid: user.id,
    displayName: String(meta.displayName || email.split('@')[0] || 'Sacramento Neighbor'),
    photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.id)}`,
    email: email || 'neighbor@sacramentobuynothing.org',
    neighborhood: String(meta.neighborhood || 'Midtown'),
    bio: typeof meta.bio === 'string' ? meta.bio : undefined,
    createdAt: new Date().toISOString(),
    role: isDirector ? 'director' : 'user',
  };
}

export async function getSupabaseProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
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

    const payload = {
      uid: profile.uid,
      displayName: profile.displayName.trim(),
      photoURL,
      email,
      neighborhood: profile.neighborhood,
      bio: profile.bio?.trim() || null,
      role: isDirectorUser(profile.uid, profile.email) ? 'director' : (profile.role || 'user'),
      createdAt: coerceToIsoDate(profile.createdAt),
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'uid' })
      .select('uid, photoURL, displayName, email, neighborhood, bio, role, createdAt')
      .single();

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
export async function getSupabaseItems(): Promise<ItemPost[]> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      handleSupabaseError(error, 'items');
      return [];
    }

    setSupabaseConfigurationState(true);
    const rows = data || [];
    const items: ItemPost[] = [];
    for (const row of rows) {
      try {
        items.push(normalizeItemFromRow(row as ItemPost));
      } catch (rowErr) {
        console.warn('Skipping malformed listing row:', row?.id, rowErr);
      }
    }
    return items;
  } catch (err: any) {
    console.warn('Supabase items fetch failed:', err);
    handleSupabaseError(err, 'items');
    return [];
  }
}

export async function uploadItemImage(file: File, itemId: string): Promise<string | null> {
  try {
    const compressed = await compressImageIfNeeded(file);
    const fileExt = compressed.name.split('.').pop() || 'jpg';
    const filePath = `${itemId}_${Date.now()}.${fileExt}`;

    // Upload to 'items' bucket using supabase-js
    const { data, error } = await supabase.storage
      .from('items')
      .upload(filePath, compressed, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('Supabase storage upload failed, checking schema or connection:', error);
      throw error;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('items')
      .getPublicUrl(filePath);

    return publicData?.publicUrl || null;
  } catch (err: any) {
    console.warn('Real storage upload failed, using local/base64 cache fallback:', err);
    // If the storage block is disabled/empty/permission denied, fallback to dataURL base64 format mapping
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }
}

export async function uploadReportProofImage(file: File, reportId: string): Promise<string | null> {
  try {
    const compressed = await compressImageIfNeeded(file, 1400, 0.8);
    const fileExt = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'jpg';
    const filePath = `reports/${reportId}_${Date.now()}.${safeExt}`;

    const { error } = await supabase.storage.from('items').upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
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
    const compressed = await compressImageIfNeeded(file, 1400, 0.8);
    const fileExt = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'jpg';
    const filePath = `tickets/${ticketId}/${messageId}.${safeExt}`;

    const { error } = await supabase.storage.from('items').upload(filePath, compressed, {
      cacheControl: '3600',
      upsert: true,
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
  const compressed = await compressImageIfNeeded(file, 512, 0.85);
  const extRaw = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
  const fileExt = /^[a-z0-9]+$/.test(extRaw) ? extRaw : 'jpg';
  const contentType = compressed.type.startsWith('image/') ? compressed.type : 'image/jpeg';

  const attempts: { bucket: string; path: string }[] = [
    { bucket: 'avatars', path: `${userId}/avatar.${fileExt}` },
    { bucket: 'items', path: `profiles/${userId}/avatar.${fileExt}` },
    { bucket: 'items', path: `profiles/${userId}_${Date.now()}.${fileExt}` },
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

function buildItemInsertPayload(item: ItemPost, includeImageUrl: boolean) {
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
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
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
    firePush(() => import('./lib/pushIntegration').then((m) => m.pushAfterItemCreated(item)));
    return { ok: true };
  } catch (err: any) {
    console.error('createSupabaseItem exception:', err);
    handleSupabaseError(err, 'items');
    return { ok: false, errorMessage: err?.message || 'Could not save listing.' };
  }
}

function buildItemUpdatePayload(item: ItemPost, includeImageUrl: boolean) {
  const payload: Record<string, unknown> = {
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category,
    neighborhood: item.neighborhood,
    userDisplayName: item.userDisplayName,
    userPhotoURL: item.userPhotoURL || null,
    updatedAt: new Date().toISOString(),
  };

  if (includeImageUrl && item.imageUrl) {
    if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
      payload.imageUrl = item.imageUrl;
    }
  }

  return payload;
}

export async function updateSupabaseItem(
  item: ItemPost,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    let payload = buildItemUpdatePayload(item, true);
    let { error } = await supabase.from('items').update(payload).eq('id', item.id);

    if (error && isMissingImageUrlColumnError(error) && item.imageUrl?.startsWith('http')) {
      const descriptionWithImage = `${item.description}\n\n[Photo]: ${item.imageUrl}`;
      payload = buildItemUpdatePayload({ ...item, description: descriptionWithImage }, false);
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
    return { ok: true };
  } catch (err: any) {
    console.error('updateSupabaseItem exception:', err);
    handleSupabaseError(err, 'items');
    return { ok: false, errorMessage: err?.message || 'Could not update listing.' };
  }
}

export async function updateSupabaseItemStatus(itemId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('items')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', itemId);

    if (error) {
      handleSupabaseError(error, 'items');
      return false;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase status update failed:', err);
    handleSupabaseError(err, 'items');
    return false;
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
export async function getSupabaseChats(userId: string): Promise<Chat[]> {
  try {
    // Filter server-side using JSONB containment so we only fetch this user's chats.
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participantIds', JSON.stringify([userId]))
      .order('lastMessageAt', { ascending: false });

    if (error) {
      // Fall back to client-side filtering if the JSONB operator isn't supported on this schema.
      const { data: allData, error: allError } = await supabase.from('chats').select('*');
      if (allError) {
        handleSupabaseError(allError, 'chats');
        return [];
      }
      setSupabaseConfigurationState(true);
      const chats = (allData || []) as Chat[];
      return chats.filter((c: any) => {
        const ids = Array.isArray(c.participantIds) ? c.participantIds : [];
        return ids.includes(userId);
      });
    }

    setSupabaseConfigurationState(true);
    return (data || []) as Chat[];
  } catch (err: any) {
    console.warn('Supabase chats fetch failed:', err);
    handleSupabaseError(err, 'chats');
    return [];
  }
}

export async function getOrCreateSupabaseChat(chatId: string, initialPayload: any): Promise<boolean> {
  try {
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
          itemTitle: initialPayload.itemTitle || ''
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
        itemTitle: initialPayload.itemTitle || ''
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
    return (data || []) as Message[];
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

/** Director-only: update another user's role. */
export async function setUserRole(
  uid: string,
  role: UserRole,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('uid', uid);

    if (error) {
      handleSupabaseError(error, 'users');
      return { ok: false, errorMessage: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, errorMessage: err?.message || 'Could not update role.' };
  }
}

export async function getCommunityStats(): Promise<CommunityStats> {
  try {
    const [membersRes, activeRes, givenRes, fulfilledRes] = await Promise.all([
      supabase.from('users').select('uid', { count: 'exact', head: true }),
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
      memberCount: membersRes.count ?? 0,
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
    upvotesReceived: 0,
    downvotesReceived: 0,
  };
  try {
    const [givenRes, claimedRes, helpedGiveRes, itemsRes] = await Promise.all([
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
  return {
    id: String(row.id),
    itemId: String(row.itemId),
    label: String(row.label),
    sortOrder: Number(row.sortOrder ?? 0),
    status: row.status === 'claimed' ? 'claimed' : 'available',
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
        return { ok: false, errorMessage: 'Run section 15 in supabase-setup.sql (listing_subitems).' };
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
            return { ok: false, errorMessage: 'Run section 15 in supabase-setup.sql (multi-item claims).' };
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
    );

    if (!msgOk) {
      return { ok: false, errorMessage: 'Pickup recorded but chat message failed to send.' };
    }

    firePush(() =>
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

    const { data: completedItem } = await supabase
      .from('items')
      .select('status')
      .eq('id', params.itemId)
      .maybeSingle();
    if ((completedItem as { status?: string } | null)?.status === 'completed') {
      firePush(() =>
        import('./lib/pushIntegration').then((m) =>
          m.pushAfterItemCompleted(params.itemId, params.giverUserId, params.claimerUserId),
        ),
      );
    }

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
  if (params.item.type !== 'giveaway' || params.item.status !== 'active') {
    return { ok: false, errorMessage: 'This listing is not available to claim.' };
  }
  if (params.item.userId === params.claimer.uid) {
    return { ok: false, errorMessage: 'You cannot claim your own listing.' };
  }

  const subitems = await getListingSubitems(params.item.id);
  let targetIds = params.subItemIds;

  if (subitems.length > 0) {
    const available = subitems.filter((s) => s.status === 'available');
    if (targetIds.length === 0) {
      return { ok: false, errorMessage: 'Select at least one item you picked up.' };
    }
    for (const id of targetIds) {
      if (!available.some((s) => s.id === id)) {
        return { ok: false, errorMessage: 'One of the selected items is no longer available.' };
      }
    }
  } else {
    targetIds = [];
  }

  const chatId = buildDmChatId(params.claimer.uid, params.item.userId);
  const chatPayload = {
    id: chatId,
    participantIds: [params.claimer.uid, params.item.userId].sort(),
    participantNames: {
      [params.claimer.uid]: params.claimer.displayName,
      [params.item.userId]: params.item.userDisplayName,
    },
    participantPhotos: {
      [params.claimer.uid]: params.claimer.photoURL || '',
      [params.item.userId]: params.item.userPhotoURL || '',
    },
    lastMessageAt: new Date().toISOString(),
    lastMessageText: '',
    lastMessageSenderId: params.claimer.uid,
    itemId: params.item.id,
    itemTitle: params.item.title,
  };

  const chatOk = await getOrCreateSupabaseChat(chatId, chatPayload);
  if (!chatOk) {
    return { ok: false, errorMessage: 'Could not open chat with the poster.' };
  }

  const requestId = `clreq_${params.item.id}_${Date.now()}`;
  const { error: reqError } = await supabase.from('item_claim_requests').insert({
    id: requestId,
    itemId: params.item.id,
    giverUserId: params.item.userId,
    claimerUserId: params.claimer.uid,
    claimerName: params.claimer.displayName,
    subItemIds: JSON.stringify(targetIds),
    status: 'pending',
    chatId,
    createdAt: new Date().toISOString(),
  });

  if (reqError) {
    if (reqError.code === '42P01') {
      return { ok: false, errorMessage: 'Run section 15 in supabase-setup.sql (item_claim_requests).' };
    }
    return { ok: false, errorMessage: reqError.message };
  }

  const labels =
    subitems.length > 0
      ? subitems.filter((s) => targetIds.includes(s.id)).map((s) => s.label)
      : [params.item.title];

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const msgOk = await createSupabaseMessage(
    chatId,
    formatSelfClaimRequestMessage(params.claimer.displayName, labels),
    params.claimer.uid,
    messageId,
  );

  if (!msgOk) {
    return { ok: false, errorMessage: 'Claim request saved but message failed to send.' };
  }

  firePush(() =>
    import('./lib/pushIntegration').then((m) =>
      m.pushAfterClaimRequest({
        item: params.item,
        claimerName: params.claimer.displayName,
        requestId,
      }),
    ),
  );

  return { ok: true, chatId };
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
      return { ok: false, errorMessage: 'Only the poster can confirm pickups.' };
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

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await createSupabaseMessage(
      request.chatId,
      `Pickup request was declined by the poster.`,
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
          errorMessage: 'Claims table missing — run the item_claims SQL in Supabase (see supabase-setup.sql).',
        };
      }
      if (msg.includes('kind') || msg.includes('column')) {
        return {
          ok: false,
          errorMessage:
            'Claims table needs the kind column — re-run section 7 in supabase-setup.sql (request_fulfilled support).',
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
    );
    if (!msgOk) {
      return { ok: false, errorMessage: 'Request marked fulfilled but chat message failed.' };
    }

    firePush(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAfterItemCompleted(params.itemId, params.ownerUserId, params.helperUserId),
      ),
    );

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not mark as fulfilled.';
    return { ok: false, errorMessage: message };
  }
}

export async function createSupabaseMessage(chatId: string, text: string, senderId: string, messageId: string): Promise<boolean> {
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
    firePush(() =>
      import('./lib/pushIntegration').then((m) => m.pushAfterMessage(chatId, senderId, text)),
    );
    return true;
  } catch (err: any) {
    console.error('Supabase write message failed:', err);
    handleSupabaseError(err, 'messages');
    return false;
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

export async function setSupabaseItemVote(itemId: string, userId: string, voteType: 'up' | 'down' | null): Promise<boolean> {
  try {
    if (!voteType) {
      const { error: deleteError } = await supabase
        .from('item_votes')
        .delete()
        .eq('itemId', itemId)
        .eq('userId', userId);

      if (deleteError) {
        handleSupabaseError(deleteError, 'item_votes');
        return false;
      }
      setSupabaseConfigurationState(true);
      return true;
    }

    const { error } = await supabase
      .from('item_votes')
      .upsert(
        { itemId, userId, voteType, createdAt: new Date().toISOString() },
        { onConflict: 'itemId,userId' }
      );

    if (error) {
      handleSupabaseError(error, 'item_votes');
      return false;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    handleSupabaseError(err, 'item_votes');
    return false;
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
    firePush(() => import('./lib/pushIntegration').then((m) => m.pushAfterComment(comment)));
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
export function normalizeSupabaseEvent(row: CommunityEvent): CommunityEvent {
  return {
    ...row,
    isFree: true as const,
    status: row.status || 'active',
    eventStartAt: coerceToIsoDate(row.eventStartAt),
    eventEndAt: row.eventEndAt ? coerceToIsoDate(row.eventEndAt) : null,
    createdAt: coerceToIsoDate(row.createdAt),
    updatedAt: coerceToIsoDate(row.updatedAt),
  };
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
    return (data || []).map((row) => normalizeSupabaseEvent(row as CommunityEvent));
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

    if (author?.email) {
      await upsertSupabaseProfile(author);
    }

    const payload = {
      ...event,
      isFree: true,
      status: event.status || 'active',
      eventStartAt: new Date(event.eventStartAt).toISOString(),
      eventEndAt: event.eventEndAt ? new Date(event.eventEndAt).toISOString() : null,
      createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : new Date().toISOString(),
      imageUrl:
        event.imageUrl?.startsWith('http://') || event.imageUrl?.startsWith('https://')
          ? event.imageUrl
          : null,
    };

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

export async function updateSupabaseEvent(
  event: CommunityEvent,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    if (!event.isFree) {
      return { ok: false, errorMessage: 'Only free community events are allowed.' };
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
        status: event.status,
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
    const { error } = await supabase
      .from('community_events')
      .update({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .eq('id', eventId)
      .eq('userId', userId);

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

function normalizeDirectorMessageRow(row: Record<string, unknown>): DirectorMessageContent {
  const rawPromises = row.promises;
  const promises = Array.isArray(rawPromises)
    ? rawPromises.map(String).filter(Boolean)
    : defaultDirectorMessageContent().promises;

  return {
    id: String(row.id || 'main'),
    directorName: String(row.directorName || DIRECTOR_MESSAGE.name),
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
  try {
    const { data, error } = await supabase
      .from('director_message')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') return defaultDirectorMessageContent();
      handleSupabaseError(error, 'director_message');
      return defaultDirectorMessageContent();
    }

    if (!data) return defaultDirectorMessageContent();
    setSupabaseConfigurationState(true);
    return normalizeDirectorMessageRow(data as Record<string, unknown>);
  } catch {
    return defaultDirectorMessageContent();
  }
}

export async function updateSupabaseDirectorMessage(
  content: DirectorMessageContent,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (normalizeUserRole(actor.role) !== 'director') {
    return { ok: false, errorMessage: 'Only the director can edit this message.' };
  }

  try {
    const payload = {
      id: 'main',
      directorName: content.directorName.trim(),
      directorTitle: content.directorTitle.trim(),
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
    firePush(() =>
      import('./lib/pushIntegration').then((m) => m.pushDirectorAnnouncement(content.headline.trim())),
    );
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

function normalizeAppUpdateRow(row: Record<string, unknown>): AppUpdateRecord {
  const rawDate = row.date;
  const date =
    typeof rawDate === 'string'
      ? rawDate.slice(0, 10)
      : rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

  return {
    id: String(row.id),
    date,
    title: String(row.title || ''),
    body: String(row.body || ''),
    detail: row.detail ? String(row.detail) : null,
    directorName: String(row.directorName || DIRECTOR_MESSAGE.name),
    directorTitle: String(row.directorTitle || DIRECTOR_MESSAGE.title),
    postedByUserId: String(row.postedByUserId || ''),
    createdAt: coerceToIsoDate(row.createdAt),
    updatedAt: coerceToIsoDate(row.updatedAt),
  };
}

export async function getSupabaseAppUpdates(): Promise<AppUpdateRecord[]> {
  try {
    const { data, error } = await supabase
      .from('app_updates')
      .select('*')
      .order('date', { ascending: false })
      .order('updatedAt', { ascending: false });

    if (error) {
      if (error.code === '42P01') return [];
      handleSupabaseError(error, 'app_updates');
      return [];
    }

    if (!data?.length) return [];
    setSupabaseConfigurationState(true);
    return (data as Record<string, unknown>[]).map(normalizeAppUpdateRow);
  } catch {
    return [];
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
      directorName: actor.displayName.trim() || DIRECTOR_MESSAGE.name,
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
    return { ok: true, update: normalizeAppUpdateRow(data as Record<string, unknown>) };
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
      directorName: actor.displayName.trim() || DIRECTOR_MESSAGE.name,
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
): Promise<boolean> {
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
        return false;
      }
      return true;
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
      return false;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch {
    return false;
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
        return { ok: false, errorMessage: 'Blocks table missing — run section 8 in supabase-setup.sql.' };
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

    if (reportError) {
      if (reportError.code === '42P01') {
        return {
          ok: true,
          errorMessage: 'Neighbor blocked, but reports table is missing — run sections 12 and 16 in supabase-setup.sql.',
        };
      }
      const missingColumn =
        String(reportError.message || '').includes('source') ||
        String(reportError.message || '').includes('proofImageUrl');
      if (missingColumn) {
        await supabase.from('user_reports').insert({
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
      } else {
        console.warn('Block succeeded but staff report failed:', reportError);
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
    const { error } = await supabase.from('message_requests').insert({
      id: `dmreq_${fromUser.uid}_${toUserId}_${Date.now()}`,
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
        return { ok: false, errorMessage: 'Message requests table missing — run section 9 in supabase-setup.sql.' };
      }
      return { ok: false, errorMessage: error.message };
    }
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

export function filterChatsByBlocked(chats: Chat[], userId: string, hiddenIds: Set<string>): Chat[] {
  return chats.filter((chat) => {
    const otherId = chat.participantIds.find((id) => id !== userId);
    return !otherId || !hiddenIds.has(otherId);
  });
}

/**
 * --- STAFF MODERATION ---
 */

export function isAccountRestricted(profile: UserProfile | null | undefined): {
  restricted: boolean;
  reason: 'banned' | 'suspended' | null;
  suspendedUntil?: string | null;
} {
  if (!profile) return { restricted: false, reason: null };
  if (profile.accountStatus === 'banned') {
    return { restricted: true, reason: 'banned' };
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
        return { ok: false, errorMessage: 'Run section 10 in supabase-setup.sql (account moderation columns).' };
      }
      return { ok: false, errorMessage: error.message };
    }

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'suspend',
      detail: `${params.durationDays} day(s) until ${until.toLocaleString()}${params.note ? ` — ${params.note}` : ''}`,
    });

    firePush(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAccountStatusChange(
          params.targetUserId,
          'Account suspended',
          `Your account is suspended for ${params.durationDays} day(s).`,
        ),
      ),
    );

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

    firePush(() =>
      import('./lib/pushIntegration').then((m) =>
        m.pushAccountStatusChange(params.targetUserId, 'Account restored', 'Your account suspension has been lifted.'),
      ),
    );

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
        return { ok: false, errorMessage: 'Run section 10 in supabase-setup.sql (account moderation columns).' };
      }
      return { ok: false, errorMessage: error.message };
    }

    await writeModerationAudit({
      actor: params.actor,
      target: { uid: params.targetUserId, displayName: params.targetName },
      action: 'ban',
      detail: params.note?.trim() || 'Platform ban',
    });

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
    if (params.role && params.actor.role === 'director') {
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
  return {
    id: String(row.id),
    openerUserId: String(row.openerUserId),
    openerName: String(row.openerName),
    openerRole: normalizeUserRole(row.openerRole),
    minStaffRank: Number(row.minStaffRank ?? 1),
    subject: String(row.subject),
    status: row.status === 'closed' ? 'closed' : 'open',
    closedByUserId: row.closedByUserId ? String(row.closedByUserId) : null,
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
  ticketId: string;
  senderUserId: string;
  senderName: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const id = `tmsg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
  return { ok: true };
}

export async function submitUserReport(params: {
  reporter: UserProfile;
  subject: string;
  body: string;
  reportedUserId?: string;
  reportedUserName?: string;
  proofImageUrl?: string | null;
  proofFile?: File | null;
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
    });

    if (error) {
      if (error.code === '42P01') {
        return { ok: false, errorMessage: 'Run section 12 in supabase-setup.sql (user_reports).' };
      }
      return { ok: false, errorMessage: error.message };
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
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
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
        return { ok: false, errorMessage: 'Run sections 13–14 in supabase-setup.sql (support tickets).' };
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
    return { ok: true, ticketId };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not open ticket.' };
  }
}

export async function getSupportTicketsForUser(userId: string): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('openerUserId', userId)
      .order('updatedAt', { ascending: false });

    if (error) return [];
    return (data ?? []).map((row) => normalizeTicket(row as Record<string, unknown>));
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

    return (data ?? [])
      .map((row) => normalizeTicket(row as Record<string, unknown>))
      .filter((ticket) => canViewerAccessTicket(viewer, ticket));
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

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    if (error || !data) return null;
    return normalizeTicket(data as Record<string, unknown>);
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

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not send message.' };
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

/**
 * Permanently removes the signed-in user's account (profile + auth).
 * Requires `delete_own_account()` in Supabase — run supabase-sql/account-deletion.sql.
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
      detail: 'Community data removed (run supabase-sql/account-deletion.sql for full auth removal)',
    });

    return {
      ok: true,
      errorMessage:
        'Community data removed. Run supabase-sql/account-deletion.sql to fully remove sign-in access.',
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

  try {
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

    await supabase.auth.signOut();
    return {
      ok: true,
      errorMessage:
        'Community data removed. Ask an admin to run supabase-sql/account-deletion.sql if you still receive sign-in emails.',
    };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not delete account.' };
  }
}
