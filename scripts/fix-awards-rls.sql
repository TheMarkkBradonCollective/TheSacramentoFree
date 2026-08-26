-- Hotfix: enable RLS on awards tables (safe to re-run).
-- Paste into Supabase SQL Editor for TheSacramentoFree, then re-run scripts/audit-rls-disabled.sql.

ALTER TABLE public.award_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "award_definitions_select" ON public.award_definitions;
DROP POLICY IF EXISTS "award_definitions_staff_write" ON public.award_definitions;
CREATE POLICY "award_definitions_select" ON public.award_definitions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "award_definitions_staff_write" ON public.award_definitions
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "user_awards_select" ON public.user_awards;
CREATE POLICY "user_awards_select" ON public.user_awards
  FOR SELECT USING (auth.uid() IS NOT NULL);
