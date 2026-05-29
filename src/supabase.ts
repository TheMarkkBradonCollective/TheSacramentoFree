import { createClient } from '@supabase/supabase-js';
import { UserProfile, ItemPost, Chat, Message, ItemVote, ItemComment, MessageRequest, AccountStatus, ModerationAuditEntry, StaffUserRow } from './types';
import { normalizeItemMedia } from './lib/listingContent';
import { normalizeUserRole, type UserRole, canStaffBan, canStaffEditUser, canStaffSuspend, canViewAuditLog } from './lib/roles';

// Read values from environment or fall back to the provided strings.
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.NEXT_PUBLIC_SUPABASE_URL || metaEnv.VITE_SUPABASE_URL || 'https://nezmabanjoqdzikliysd.supabase.co';
const supabaseKey = metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_TmJr2L0c5ZbR7GSiFztjKQ_MHyiBfPe';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    return (data || []).map(normalizeItemFromRow);
  } catch (err: any) {
    console.warn('Supabase items fetch failed:', err);
    handleSupabaseError(err, 'items');
    return [];
  }
}

export async function uploadItemImage(file: File, itemId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${itemId}_${Date.now()}.${fileExt}`;

    // Upload to 'items' bucket using supabase-js
    const { data, error } = await supabase.storage
      .from('items')
      .upload(filePath, file, {
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

export async function uploadProfilePhoto(file: File, userId: string): Promise<string | null> {
  const extRaw = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileExt = /^[a-z0-9]+$/.test(extRaw) ? extRaw : 'jpg';
  const contentType = file.type.startsWith('image/') ? file.type : 'image/jpeg';

  const attempts: { bucket: string; path: string }[] = [
    { bucket: 'avatars', path: `${userId}/avatar.${fileExt}` },
    { bucket: 'items', path: `profiles/${userId}/avatar.${fileExt}` },
    { bucket: 'items', path: `profiles/${userId}_${Date.now()}.${fileExt}` },
  ];

  for (const { bucket, path } of attempts) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
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
  return normalizeSupabaseItem(row);
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

export async function recordItemClaimInChat(params: {
  itemId: string;
  giverUserId: string;
  claimerUserId: string;
  chatId: string;
  claimMessage: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const claimId = `claim_${params.itemId}_${Date.now()}`;

    const { error: claimError } = await supabase.from('item_claims').insert({
      id: claimId,
      itemId: params.itemId,
      giverUserId: params.giverUserId,
      claimerUserId: params.claimerUserId,
      chatId: params.chatId,
      kind: 'giveaway',
      createdAt: new Date().toISOString(),
    });

    if (claimError) {
      const msg = String(claimError.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return { ok: false, errorMessage: 'This item was already marked as claimed.' };
      }
      if (claimError.code === 'PGRST204' || claimError.code === '42P01' || msg.includes('item_claims')) {
        return {
          ok: false,
          errorMessage: 'Claims table missing — run the item_claims SQL in Supabase (see supabase-setup.sql).',
        };
      }
      return { ok: false, errorMessage: claimError.message || 'Could not record claim.' };
    }

    const statusOk = await updateSupabaseItemStatus(params.itemId, 'completed');
    if (!statusOk) {
      return { ok: false, errorMessage: 'Claim saved but listing status could not be updated.' };
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const msgOk = await createSupabaseMessage(
      params.chatId,
      params.claimMessage,
      params.giverUserId,
      messageId,
    );

    if (!msgOk) {
      return { ok: false, errorMessage: 'Item marked claimed but chat message failed to send.' };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not mark as claimed.';
    return { ok: false, errorMessage: message };
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
    return true;
  } catch (err: any) {
    handleSupabaseError(err, 'item_comments');
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

export async function blockUser(
  blockerUserId: string,
  blockedUserId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (blockerUserId === blockedUserId) {
    return { ok: false, errorMessage: 'You cannot block yourself.' };
  }
  try {
    const { error } = await supabase.from('user_blocks').upsert(
      {
        blockerUserId,
        blockedUserId,
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
