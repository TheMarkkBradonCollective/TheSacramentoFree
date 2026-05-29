import { createClient } from '@supabase/supabase-js';
import { UserProfile, ItemPost, Chat, Message, ItemVote, ItemComment } from './types';

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
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'moderator', 'admin', 'director'
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

/**
 * --- PROFILES ---
 */
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
    return data as UserProfile | null;
  } catch (err: any) {
    console.warn('Supabase profile fetch failed:', err);
    handleSupabaseError(err, 'users');
    return null;
  }
}

export async function upsertSupabaseProfile(
  profile: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  try {
    const payload = {
      uid: profile.uid,
      displayName: profile.displayName,
      photoURL: profile.photoURL || null,
      email: profile.email,
      neighborhood: profile.neighborhood,
      bio: profile.bio || null,
      role: profile.email?.toLowerCase() === 'sigsecspec@gmail.com' ? 'director' : (profile.role || 'user'),
      createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid' });

    if (error) {
      handleSupabaseError(error, 'users');
      return { ok: false, errorMessage: error.message };
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
    return (data || []) as ItemPost[];
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

export async function createSupabaseItem(item: ItemPost): Promise<boolean> {
  try {
    const payload = {
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
      imageUrl: item.imageUrl || null,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString()
    };

    const { error } = await supabase
      .from('items')
      .insert(payload);

    if (error) {
      console.error('createSupabaseItem RLS/DB error:', error.code, error.message, error.details, error.hint);
      handleSupabaseError(error, 'items');
      return false;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('createSupabaseItem exception:', err);
    handleSupabaseError(err, 'items');
    return false;
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
    // Find all chats where participantIds has user ID
    // We can query using the JSON containment or filtration operators since client-side
    const { data, error } = await supabase
      .from('chats')
      .select('*');

    if (error) {
      handleSupabaseError(error, 'chats');
      return [];
    }

    setSupabaseConfigurationState(true);

    // Safely filter participantIds locally or format them
    const chats = (data || []) as Chat[];
    const userChats = chats.filter((c: any) => {
      const ids = Array.isArray(c.participantIds) ? c.participantIds : [];
      return ids.includes(userId);
    });

    return userChats;
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
