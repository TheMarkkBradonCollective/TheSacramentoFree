-- Staff-initiated support threads tied to listings/events (reverse outreach).
-- Safe to re-run.

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "ticketSource" TEXT NOT NULL DEFAULT 'neighbor';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "relatedItemId" TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "relatedItemTitle" TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "relatedEventId" TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "relatedEventTitle" TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "initiatedByUserId" TEXT;

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_source_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_source_check
  CHECK ("ticketSource" IN ('neighbor', 'staff_listing', 'staff_event'));

CREATE INDEX IF NOT EXISTS support_tickets_related_item_idx
  ON public.support_tickets ("relatedItemId")
  WHERE "relatedItemId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_tickets_related_event_idx
  ON public.support_tickets ("relatedEventId")
  WHERE "relatedEventId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_tickets_staff_listing_open_idx
  ON public.support_tickets ("openerUserId", "relatedItemId", status)
  WHERE "ticketSource" = 'staff_listing' AND status = 'open';

CREATE INDEX IF NOT EXISTS support_tickets_staff_event_open_idx
  ON public.support_tickets ("openerUserId", "relatedEventId", status)
  WHERE "ticketSource" = 'staff_event' AND status = 'open';
