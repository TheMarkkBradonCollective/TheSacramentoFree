import { createClient } from '@supabase/supabase-js';
import { UserProfile, ItemPost, Chat, Message } from './types';

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
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable select policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow insert and update" ON public.users FOR ALL USING (true);

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
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Allow write operations" ON public.items FOR ALL USING (true);

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
CREATE POLICY "Allow public read chats" ON public.chats FOR SELECT USING (true);
CREATE POLICY "Allow write chats" ON public.chats FOR ALL USING (true);

-- 4. Create chat Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow edit or update" ON public.messages FOR ALL USING (true);
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
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "users" is missing in Supabase. Run SQL setup to create it.');
        return null;
      }
      throw error;
    }
    
    setSupabaseConfigurationState(true);
    return data as UserProfile | null;
  } catch (err: any) {
    console.warn('Supabase profile fetch failed:', err);
    return null;
  }
}

export async function upsertSupabaseProfile(profile: UserProfile): Promise<boolean> {
  try {
    const payload = {
      uid: profile.uid,
      displayName: profile.displayName,
      photoURL: profile.photoURL || null,
      email: profile.email,
      neighborhood: profile.neighborhood,
      bio: profile.bio || null,
      createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString()
    };

    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'uid' });

    if (error) {
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "users" is missing in Supabase. Run SQL setup to create it.');
        return false;
      }
      throw error;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase profile upsert error:', err);
    return false;
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
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "items" is missing in Supabase. Run SQL setup to create it.');
        return [];
      }
      throw error;
    }

    setSupabaseConfigurationState(true);
    return (data || []) as ItemPost[];
  } catch (err: any) {
    console.warn('Supabase items fetch failed:', err);
    return [];
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
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString()
    };

    const { error } = await supabase
      .from('items')
      .insert(payload);

    if (error) {
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "items" is missing in Supabase. Run SQL setup to create it.');
        return false;
      }
      throw error;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase item create failed:', err);
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
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "items" is missing in Supabase. Run SQL setup to create it.');
        return false;
      }
      throw error;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase status update failed:', err);
    return false;
  }
}

export async function deleteSupabaseItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "items" is missing in Supabase. Run SQL setup to create it.');
        return false;
      }
      throw error;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase item delete failed:', err);
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
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "chats" is missing in Supabase. Run SQL setup to create it.');
        return [];
      }
      throw error;
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
      if (checkError.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "chats" is missing in Supabase. Run SQL setup to create it.');
        return false;
      }
      throw checkError;
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

      if (updateError) throw updateError;
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

      if (insertError) throw insertError;
    }

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase write chat failed:', err);
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
      if (error.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "messages" is missing in Supabase. Run SQL setup to create it.');
        return [];
      }
      throw error;
    }

    setSupabaseConfigurationState(true);
    return (data || []) as Message[];
  } catch (err: any) {
    console.warn('Supabase messages query failed:', err);
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
      if (msgError.code === '42P01') {
        setSupabaseConfigurationState(false, 'Table "messages" is missing in Supabase. Run SQL setup to create it.');
        return false;
      }
      throw msgError;
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

    if (chatUpdateError) throw chatUpdateError;

    setSupabaseConfigurationState(true);
    return true;
  } catch (err: any) {
    console.error('Supabase write message failed:', err);
    return false;
  }
}
