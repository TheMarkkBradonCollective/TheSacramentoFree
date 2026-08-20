-- Neighbor coordination chats can be about a community event (not only listings).
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS "eventId" TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS "eventTitle" TEXT;
CREATE INDEX IF NOT EXISTS chats_event_id_idx ON public.chats ("eventId");
