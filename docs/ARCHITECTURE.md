# Architecture

How TourIt is put together: the rendering model, the project layout, the data model, routing, and the engineering practices behind it.

## Table of contents

- [Overview](#overview)
- [Project structure](#project-structure)
- [Database](#database)
- [Routing & middleware](#routing--middleware)
- [User flows](#user-flows)
- [Engineering practices](#engineering-practices)

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js 16                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Middleware  │  │    Server    │  │    Client     │   │
│  │  (proxy.ts)  │  │  Components  │  │  Components    │   │
│  │  role-based  │  │  data fetch  │  │  interactive   │   │
│  │   routing    │  │  + SSR       │  │  UI + state    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘   │
│         │                 │                 │            │
│         │        ┌────────┴────────┐        │            │
│         │        │  Server Actions │        │            │
│         │        │   (mutations)   │        │            │
│         │        └────────┬────────┘        │            │
│         └────────────┬────┴────┬────────────┘            │
│                      │         │                         │
│              ┌───────┴───┐ ┌───┴──────────┐              │
│              │ Supabase  │ │ Google Gemini│              │
│              │ (DB+Auth) │ │    (AI)      │              │
│              └───────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────┘
```

**Key patterns:**

- **Server Components** for data-heavy pages (explore feed, dashboard) — data fetched server-side via Supabase RPCs.
- **Client Components** (`'use client'`) for interactive pages (quiz, itineraries, itinerary detail).
- **Server Actions** (`'use server'`) for all mutations (role updates, quiz completion, listing creation, AI generation).
- **Context providers** mounted once in the root layout: `ThemeProvider` (next-themes light/dark/system), `PaletteProvider` (cookie-backed colour palette, via `usePalette()`), `UserProvider` (auth user + profile, via `useUser()`), `ToastProvider` (`useToast()`), and `ConfirmProvider` (`useConfirm()`).

## Project structure

```
TourIt/
├── app/                                   # Next.js App Router
│   ├── layout.tsx                         # Root layout: reads palette cookie; ThemeProvider → PaletteProvider → UserProvider → ToastProvider → ConfirmProvider → Nav
│   ├── page.tsx                           # Landing page
│   ├── globals.css                        # Tailwind v4 globals: design tokens, motion, elevation, lift/press, palettes, reduced-motion
│   ├── auth/
│   │   ├── login/page.tsx                 # Google OAuth login + dev-only quick-login buttons
│   │   ├── callback/route.ts              # OAuth code exchange + redirect
│   │   └── test-login/route.ts            # Dev-only email/password login (E2E + quick-login)
│   ├── onboarding/{page.tsx, action.ts}   # Role selection → updateUserRole
│   ├── tourist/
│   │   ├── explore/{page.tsx, filter-bar.tsx, pagination.tsx}
│   │   │   └── listings/[id]/{page.tsx, AddToItineraryButton.tsx}
│   │   ├── itineraries/{page.tsx, [id]/{page.tsx, generate-actions.ts}}
│   │   └── quiz/{page.tsx, quiz-client.tsx, action.ts}
│   ├── business-owner/{page.tsx, listings/{page.tsx, listing-form.tsx, action.ts}}
│   └── settings/profile/page.tsx
├── components/
│   ├── nav.tsx, nav-link.tsx              # nav shell + shared active-route link (desktop + mobile)
│   ├── auth-buttons.tsx, user-avatar.tsx  # account menu (hosts the theme/palette switcher)
│   ├── listing-card.tsx, back-link.tsx    # shared explore/owner card + filter-preserving back link
│   ├── tag-multi-select.tsx               # shared tag dropdown (filter bar + listing form)
│   ├── theme-provider.tsx, theme-controls.tsx  # next-themes wrapper + mode/palette switcher
│   ├── listing-image-carousel.tsx         # swipeable gallery on the listing detail page
│   └── ui/                                # primitives: button, input, textarea, label, field,
│                                          #   popover, calendar, date-field, time-field, time-range-field,
│                                          #   + toast, alert-dialog, carousel
├── context/
│   ├── user-context.tsx                   # auth user + profile (useUser)
│   ├── palette-context.tsx                # PaletteProvider + usePalette (cookie-backed palette axis)
│   ├── toast-context.tsx                  # ToastProvider + useToast
│   └── confirm-context.tsx                # ConfirmProvider + promise-based useConfirm
├── hooks/{useUser.ts, useCoarsePointer.ts, useMounted.ts}
├── lib/
│   ├── supabase/{server.ts, client.ts, proxy.ts}
│   ├── explore-params.ts                  # explore-feed URL params
│   ├── itinerary-overlap.ts               # time-overlap validation
│   ├── listing-images.ts                  # image limits/validation + public URL builder
│   ├── time-constraints.ts                # operating-hours validation (mirrors the DB trigger)
│   ├── time-options.ts                    # time-picker option generation + 12h label formatting
│   ├── palettes.ts                        # palette list + cookie constant
│   └── utils.ts                           # cn() helper
├── constants/common.ts                    # LOGIN_PATH, ROLE_HOME_PATH
├── types/index.ts
├── proxy.ts                               # Next.js middleware entry → lib/supabase/proxy.ts
├── supabase/
│   ├── config.toml                        # local stack config
│   ├── seed.sql                           # local-only seed data
│   ├── migrations/                        # timestamped SQL migrations
│   └── tests/                             # pgTAP security suites (supabase test db)
├── __tests__/unit/                        # Jest unit tests
├── e2e/                                   # Playwright specs, auth setups, fixtures/, supabase-admin.ts
├── .husky/                                # git hooks (pre-commit, pre-push)
└── .github/workflows/                     # ci.yml, supabase-production.yml
```

## Database

Managed through **timestamped SQL migrations** in `supabase/migrations/`, applied in filename order. Test them locally with `npx supabase db reset`; CI applies them from scratch on every PR; production is updated on merge to `main` (see [TESTING.md](TESTING.md#cicd-pipeline)).

### Core tables

| Table | Purpose | Written by |
|---|---|---|
| `users` / `profiles` | account mirror + role/onboarding status | auth triggers on signup |
| `tags` | shared interest/category vocabulary (15, seeded by migration) | migration |
| `listings` | business attractions (name, description, address, hours, 24h flag) | business owners |
| `listing_tags` | M:M — a listing's tags | business owners |
| `listing_images` | a listing's photos (storage path + `display_order`; index 0 is the cover) | business owners |
| `tourist_tags` | M:M — a tourist's quiz-selected tags | tourists |
| `itineraries` | named trip plans | tourists |
| `itinerary_listings` | M:M — listings scheduled into an itinerary | tourists |

```
profiles ──┬── listings ──┬── listing_tags ──── tags
           │              │                      │
           │              └── listing_images     │
           │                                     │
           ├── tourist_tags ─────────────────────┘
           │
           └── itineraries ── itinerary_listings ── listings
```

### Access control: RLS **and** GRANTs

Two independent layers, **both required**:

- **Table `GRANT`s** decide whether an API role (`authenticated`, `service_role`) may touch a table at all.
- **RLS policies** decide *which rows* it may see/modify.

Policies restrict users to their own `profiles`, `itineraries`, and `tourist_tags`; owners to their own `listings`/`listing_tags`; and make `tags`/`listings` readable by any authenticated user. The `20260704000000_grant_api_roles_public_schema` migration adds the table grants so a database built purely from migrations (local/CI) behaves like production — where the grants had been applied implicitly by the platform.

### Constraints (validated in the app **and** the DB)

- `valid_listing_hours` — a listing is either 24-hour or has `open_time < close_time`.
- `valid_itinerary_time` — a scheduled stop ends after it starts.
- `enforce_visit_within_operating_hours` (trigger) — a scheduled visit must fall within the listing's opening hours (skipped for pending/unscheduled stops). Mirrors `lib/time-constraints.ts`.

### Recommendation engine

The `recommend_listings` Postgres RPC ([migration](../supabase/migrations/20260628130000_recommend_listings_filters.sql)) ranks the feed by **TF-IDF weighted cosine similarity** between a tourist's tags and each listing's tags: it computes IDF across the whole corpus, scores each listing, supports optional tag/opening-hours filters, and returns paginated results with a windowed `total_count`. Listings with no tag match still appear (score 0), ordered after the matches. It also returns each listing's `preview_image_path` (first image by `display_order`, else `NULL`) so the explore feed can render covers without a second query.

### Storage: listing images

Listing photos live in a **public** Supabase Storage bucket, `listing-images`, created by [migration](../supabase/migrations/20260722041349_create_listing_images_bucket.sql) so local, CI, and production stay in lockstep.

- **Path convention:** `<listing_id>/<uuid>.<jpg|png>`. The first path segment is the owning listing — that's what the storage policies key off.
- **Bucket limits (server-enforced):** 5 MB per file, `image/jpeg` and `image/png` only. `lib/listing-images.ts` mirrors these client-side for fast feedback, but the bucket is the real boundary: a direct API upload that skips the form is still rejected (413 / 415).
- **Access control:** public read — files are served from `/storage/v1/object/public/...`, are CDN-cacheable, and need no policy. Writes are owner-only: `INSERT`/`DELETE` policies on `storage.objects` require the listing named in the first path segment to belong to `auth.uid()`, the same ownership-via-parent shape used by `listing_tags`.
- **Upload path:** the browser uploads **directly** to Storage using the user's JWT, then a server action records the resulting paths in `listing_images`. File bytes never travel through a server action, which Next caps at 1 MB by default.
- **Rendering:** images are resized and converted to WebP by the **Next.js image optimizer** (`next/image` + `images.remotePatterns`), *not* Supabase's image transformation API — that API is Pro-plan only and billed per origin image. Two settings make this work: `_next/image` is excluded from the `proxy.ts` matcher (otherwise the role-home redirect swallows optimizer requests), and `images.dangerouslyAllowLocalIP` is enabled **in development only**, because Next 16 refuses to optimize loopback sources and local dev serves Storage from `127.0.0.1:54321`.
- **Known limitation:** deleting a listing cascades its `listing_images` rows but not the bucket files. Orphaned objects are tolerated until an edit/delete flow removes them explicitly (`e2e/supabase-admin.ts` does this for test data).

## Routing & middleware

Every request (except static assets) passes through `proxy.ts` → `lib/supabase/proxy.ts`. Rules are evaluated **in order**:

| # | Condition | Action |
|---|---|---|
| 1 | Not logged in (and not on `/auth/*`) | → `/auth/login` |
| 2 | Logged in, no role (and not on `/onboarding`) | → `/onboarding` |
| 3 | Fully onboarded, on `/auth/login` or `/onboarding` | → role home |
| 4 | Tourist with `onboarding_completed = false` | → trapped in `/tourist/quiz` |
| 5 | Fully onboarded, outside their role's prefix | → role home |
| — | otherwise | pass through |

Role homes (`constants/common.ts`): tourist → `/tourist`, business owner → `/business-owner`.

## User flows

**New tourist:** login → `/onboarding` (Tourist) → `/tourist/quiz` (swipe tags) → `/tourist/explore` (ranked feed) → listing detail → *Add to Itinerary* (date/time + overlap validation) → `/tourist/itineraries/:id` → *Generate Schedule* (AI fills unscheduled stops).

**New business owner:** login → `/onboarding` (Business Owner) → `/business-owner` dashboard → `/business-owner/listings` (create listing with tags + hours).

**Returning user:** login → callback → `/` → middleware redirects to role home.

## Engineering practices

- **Standardized feedback UI.** Success/error messages go through one Radix-based toast system (`useToast()`), and every destructive confirmation (delete itinerary, remove activity) goes through one reusable, promise-based `useConfirm()` dialog (`context/confirm-context.tsx` + `components/ui/alert-dialog.tsx`) — no ad-hoc `window.confirm`/`alert`.
- **Defense-in-depth validation.** Time/hours rules are checked in the app (`lib/time-constraints.ts`, `lib/itinerary-overlap.ts`) *and* enforced at the database (CHECK constraints + the operating-hours trigger), so direct API writes and the AI scheduler can't bypass them.
- **Migration-driven schema.** All schema change is timestamped SQL migrations — tested locally with `db reset`, validated from scratch in CI, deployed on merge to `main`.
- **RLS + GRANT together.** See [Access control](#access-control-rls-and-grants).
- **Shared UI primitives over call-site styling.** Buttons, inputs, cards, the tag picker, and the date/time fields are single components, not per-page markup — a visual change is one edit. This is the governing principle of the [UI/UX overhaul](ISSUES.md#uiux-overhaul).

### Design system & theming

All visual style resolves through CSS custom properties declared in `app/globals.css`, so a colour, shadow, or motion change is one edit rather than twenty call sites.

- **Tokens.** Semantic colour tokens (`--background`, `--primary`, `--muted`, `--success`/`--warning`, …), a validated categorical chart ramp (`--chart-1..5`), per-mode **elevation** shadows, **motion** tokens (easing + durations; the default transition is retimed so existing `transition` utilities inherit the feel), and **lift/press geometry** exposed as `@utility lift` / `press`. Colour tokens are mapped to Tailwind via `@theme inline`; motion tokens live in `@theme static` (Tailwind tree-shakes theme vars referenced only from hand-written CSS).
- **Two theming axes**, both on `<html>` and independent:
  - **Mode** — light/dark/system via **next-themes** (`attribute="class"`), with a blocking script (no FOUC) and `suppressHydrationWarning` for the class it adds after hydration.
  - **Palette** — a `data-palette` attribute (Teal / Sunset / Grape), persisted in a cookie **read server-side in the root layout**, so the correct colours render on the first byte and it works with JS disabled. Each palette sets the full token set — including its own re-validated chart ramp — for both modes, via `[data-palette=X]` (light) and `.dark[data-palette=X]` (dark) blocks.
- **Chart colours are computed, not chosen.** Any change to a `--chart-*` ramp is re-validated with the data-viz palette validator (colour-vision separation, normal-vision floor, contrast vs surface) — never eyeballed.
- **Motion sensitivity.** A `prefers-reduced-motion` rule flattens the lift/press geometry tokens (so hover/press keep their colour + shadow feedback but stop moving) and blanket-resets transition/animation durations.

### Dev-only login

The app's real auth is Google OAuth. For local development (and E2E), a dev-only path signs in seeded email/password accounts, with **two independent guards** so it can never work in production:

1. The **quick-login buttons** on `/auth/login` are wrapped in `process.env.NODE_ENV !== "production"`, so they're dead-code-eliminated from production builds.
2. The **`/auth/test-login` route** returns `404` when `NODE_ENV === "production"`.

The route accepts an optional `{ email, password }` body (used by the buttons to pick an account) and otherwise falls back to `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` (used by the E2E setup). See [DEVELOPMENT.md](DEVELOPMENT.md#logging-in-locally).
