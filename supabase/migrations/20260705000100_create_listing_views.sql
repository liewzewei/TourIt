-- Event table backing the business-owner analytics dashboard.
--
-- One row per unique (listing, viewer, day). The uniqueness is the primary key,
-- so count(*) already means "unique daily visitors" — no DISTINCT needed, and a
-- tourist refreshing or re-opening a listing all day still counts once.

CREATE TABLE public.listing_views (
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  viewer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- The "day" is defined in Asia/Singapore so dedup and chart buckets line up
  -- with how a Singapore owner reads their calendar; the server/UTC clock would
  -- push a 1 a.m. SGT view onto the previous day. Stored as a column (NOT a
  -- generated created_at::date) because that cast is not IMMUTABLE and so cannot
  -- back a primary key / unique constraint.
  viewed_on  DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Singapore')::date,
  -- Audit only: the exact time of the first view that day. Never aggregated on.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The dedup rule IS the identity of a row. log_listing_view relies on this via
  -- ON CONFLICT DO NOTHING to make repeat views idempotent.
  PRIMARY KEY (listing_id, viewer_id, viewed_on)
);

-- ON DELETE CASCADE (unlike the older junctions): view events are meaningless
-- once their listing or viewer is gone, and cascading lets a future account /
-- listing deletion clean up its own traces instead of being blocked by an FK.

-- The dominant read is "count views per day for a listing" (the views time-series
-- and totals). The PK leads (listing_id, viewer_id, ...), so a (listing_id,
-- viewed_on) query would scan across viewer_id; this index matches the group-by.
CREATE INDEX idx_listing_views_listing_id_viewed_on
  ON public.listing_views (listing_id, viewed_on);

-- Privacy boundary: owners must NEVER read raw view rows (that would reveal WHICH
-- tourist viewed). Enable RLS with ZERO policies -> default-deny for every caller.
-- The only reader/writer is the SECURITY DEFINER log_listing_view + analytics
-- RPCs, which run as the table owner and bypass RLS.
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: migration 20260704000000 set ALTER DEFAULT PRIVILEGES that
-- auto-grants ALL on new public tables to `authenticated`, so this table inherits
-- a table-level grant on creation. RLS already denies every row, but revoke the
-- grant too so access is closed at BOTH layers (grant + RLS), not just one.
REVOKE ALL ON public.listing_views FROM anon, authenticated;
