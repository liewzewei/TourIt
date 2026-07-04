-- Grant the Supabase API roles table access on the public schema.
--
-- RLS policies control WHICH rows a role may touch; table GRANTs control
-- whether the role may touch the table AT ALL. Both layers are required.
-- Earlier migrations set up RLS + policies but never granted table privileges,
-- so `authenticated` was denied at the table level (Postgres error 42501) on
-- any database built purely from these migrations (local dev / CI). Production
-- only worked because Supabase's platform grants public-schema tables to the
-- API roles by default -- i.e. the migrations were not a faithful copy of prod.
--
-- These GRANTs are idempotent, so applying this to prod is a harmless no-op.
-- `anon` is intentionally omitted: every route is auth-gated (proxy.ts), so no
-- anonymous table access is needed. Add `anon` here if a logged-out public page
-- is introduced later.

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- So tables/sequences added by FUTURE migrations are granted automatically too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
