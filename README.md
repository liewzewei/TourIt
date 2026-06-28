# TourIt

A two-sided tourism discovery platform connecting **tourists** with **local business owners**. Tourists discover personalised listings through an interest-based recommendation feed, build itineraries, and generate AI-optimised schedules. Business owners create and manage attraction listings.

Built with **Next.js 16** (App Router), **React 19**, **Supabase** (PostgreSQL + Auth), **Tailwind CSS v4**, **shadcn/ui**, and **Google Gemini AI**.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Routing & Middleware](#routing--middleware)
- [User Flows](#user-flows)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Conventions](#commit-message-conventions)

---

## Features

### Tourist Side
- **Google OAuth** login via Supabase Auth
- **Preference quiz** — Tinder-style swipe UI to select interest tags (swipe right = interested, swipe left = skip)
- **Personalised explore feed** — listings ranked by TF-IDF cosine similarity between tourist tags and listing tags, powered by a Postgres RPC
- **Tag and opening-hours filters** on the explore feed with paginated results (15 per page)
- **Listing detail pages** with full description, address, and operating hours
- **Itinerary management** — create, view, and delete trip plans
- **Add to itinerary** — save listings to itineraries with date/time scheduling and overlap validation
- **AI schedule generation** — Gemini produces an optimised day-by-day schedule from unscheduled stops, respecting opening hours, travel time, and existing bookings

### Business Owner Side
- **Listing creation** — name, description, address, opening/closing hours, and tag selection
- **Dashboard** — view all owned listings with associated tags

### Shared
- **Role-based routing** — middleware enforces that tourists and business owners only access their own sections
- **Responsive navigation** — desktop nav menu + mobile hamburger sheet, role-specific menu items
- **User avatar dropdown** with sign-out

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js 16                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Middleware  │  │    Server    │  │    Client     │  │
│  │  (proxy.ts)  │  │  Components  │  │  Components   │  │
│  │  role-based  │  │  data fetch  │  │  interactive  │  │
│  │   routing    │  │  + SSR       │  │  UI + state   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                 │           │
│         │        ┌────────┴────────┐        │           │
│         │        │  Server Actions │        │           │
│         │        │  (mutations)    │        │           │
│         │        └────────┬────────┘        │           │
│         └────────────┬────┴────┬────────────┘           │
│                      │         │                        │
│              ┌───────┴───┐ ┌───┴──────────┐             │
│              │ Supabase  │ │ Google Gemini│             │
│              │ (DB+Auth) │ │  (AI)        │             │
│              └───────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────┘
```

**Key patterns:**
- **Server Components** for data-heavy pages (explore feed, business-owner dashboard) — data is fetched server-side via Supabase RPCs
- **Client Components** (`'use client'`) for interactive pages (itineraries, quiz, itinerary detail)
- **Server Actions** (`'use server'`) for all mutations (role updates, quiz completion, listing creation, AI generation)
- **UserContext** — hydrated in the root layout from server-side Supabase auth, consumed by client components via the `useUser()` hook

---

## Project Structure

```
TourIt/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (UserProvider + Nav)
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global styles (Tailwind v4)
│   ├── auth/
│   │   ├── login/page.tsx        # Google OAuth login page
│   │   ├── callback/route.ts     # OAuth code exchange + redirect
│   │   └── test-login/           # Test login route for E2E
│   ├── onboarding/
│   │   ├── page.tsx              # Role selection (Tourist / Business Owner)
│   │   └── action.ts             # Server action: updateUserRole
│   ├── tourist/
│   │   ├── page.tsx              # Tourist home
│   │   ├── explore/
│   │   │   ├── page.tsx          # Recommendation feed (Server Component)
│   │   │   ├── filter-bar.tsx    # Tag + time filters (Client Component)
│   │   │   ├── pagination.tsx    # Page navigation controls
│   │   │   └── listings/[id]/
│   │   │       ├── page.tsx      # Listing detail page
│   │   │       └── AddToItineraryButton.tsx  # Save-to-itinerary modal
│   │   ├── itineraries/
│   │   │   ├── page.tsx          # Itinerary dashboard (CRUD)
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Itinerary schedule view (by-day pagination)
│   │   │       └── generate-actions.ts  # AI schedule generation (Gemini)
│   │   └── quiz/
│   │       ├── page.tsx          # Quiz wrapper (Server Component)
│   │       ├── quiz-client.tsx   # Swipe UI (Client Component)
│   │       └── action.ts        # Server action: markOnboardingComplete
│   ├── business-owner/
│   │   ├── page.tsx              # Business owner dashboard (my listings)
│   │   └── listings/
│   │       ├── page.tsx          # Listing creation page
│   │       ├── listing-form.tsx  # Listing form (Client Component)
│   │       └── action.ts        # Server action: createListing
│   └── settings/
│       └── profile/              # Profile settings
├── components/
│   ├── nav.tsx                   # Role-based navigation bar
│   ├── auth-buttons.tsx          # Sign in/out buttons
│   ├── user-avatar.tsx           # Avatar dropdown menu
│   └── ui/                       # shadcn/ui primitives
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── navigation-menu.tsx
│       └── sheet.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Server-side Supabase client (cookie-based)
│   │   ├── client.ts             # Client-side Supabase client
│   │   └── proxy.ts              # Middleware: auth + role-based routing
│   ├── explore-params.ts         # URL param parsing/validation for explore
│   ├── itinerary-overlap.ts      # Time overlap validation logic
│   └── utils.ts                  # General utilities (cn helper)
├── context/
│   └── user-context.tsx          # React context for auth user + profile
├── hooks/
│   └── useUser.ts                # Hook to consume UserContext
├── types/
│   └── index.ts                  # Shared TypeScript types
├── constants/
│   └── common.ts                 # Route constants (LOGIN_PATH, ROLE_HOME_PATH)
├── proxy.ts                      # Next.js middleware entry point
├── supabase/
│   ├── config.toml               # Local Supabase CLI configuration
│   └── migrations/               # Timestamped SQL migrations (see below)
├── __tests__/
│   └── unit/                     # Jest unit tests
│       ├── explore-params.test.ts
│       └── itinerary-overlap.test.ts
├── e2e/                          # Playwright E2E tests
│   ├── auth.setup.ts             # Auth state provisioning
│   ├── smoke.spec.ts             # Smoke test spec
│   └── supabase-admin.ts         # Admin client helper
└── .github/
    └── workflows/
        ├── ci.yml                # Lint + type-check on all branches
        └── supabase-production.yml  # Auto-deploy migrations on main
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** (comes with Node.js)
- **Supabase CLI** (for local development with migrations)
- A **Supabase project** with Google OAuth configured
- A **Google Gemini API key** (for AI itinerary generation)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/liewzewei/TourIt.git
cd TourIt

# 2. Install dependencies
npm install

# 3. Set up environment variables (see section below)
cp .env.example .env.local   # then fill in your values

# 4. Start the Supabase local instance (optional, for local DB)
npx supabase start

# 5. Apply database migrations
npx supabase db push

# 6. Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Google Gemini AI (server-side only)
GEMINI_API_KEY=your-gemini-api-key

# E2E Testing (optional, for Playwright)
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=your-test-password
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Note:** All `.env*` files are gitignored. Never commit secrets to the repository.

---

## Database Schema

The database is managed through **timestamped SQL migrations** in `supabase/migrations/`. Migrations are applied in filename order.

### Core Tables

| Table | Purpose | Owner |
|---|---|---|
| `profiles` | User profiles with role and onboarding status | Auth trigger |
| `tags` | Shared vocabulary of interest/category tags | Seed data |
| `listings` | Business attractions (name, description, address, hours) | Business owners |
| `listing_tags` | M:M junction — which tags a listing has | Business owners |
| `tourist_tags` | M:M junction — which tags a tourist selected in the quiz | Tourists |
| `itineraries` | Named trip plans | Tourists |
| `itinerary_listings` | M:M junction — listings saved to an itinerary with scheduled times | Tourists |

### Key Relationships

```
profiles ──┬── listings ──── listing_tags ──── tags
           │                                    │
           ├── tourist_tags ────────────────────┘
           │
           └── itineraries ── itinerary_listings ── listings
```

### RLS (Row Level Security)

All tables have RLS enabled. Policies ensure:
- Users can only read/write their own `profiles`, `itineraries`, `tourist_tags`
- Business owners can only manage their own `listings` and `listing_tags`
- `tags` and `listings` are publicly readable by authenticated users

### Recommendation Engine

The `recommend_listings` Postgres RPC ([migration](supabase/migrations/20260628130000_recommend_listings_filters.sql)) implements **TF-IDF weighted cosine similarity** between a tourist's selected tags and each listing's tags:
- Computes IDF (inverse document frequency) across the entire listings corpus
- Calculates cosine similarity for personalised ranking
- Supports optional **tag filters** (match ANY of selected tags) and **opening-hours filters**
- Returns paginated results with a windowed `total_count` for pagination controls

---

## Routing & Middleware

All requests (except static assets) pass through the middleware in `proxy.ts` → `lib/supabase/proxy.ts`. The routing rules are evaluated **in order**:

| Priority | Condition | Action |
|---|---|---|
| 1 | Not logged in (and not on `/auth/*`) | → Redirect to `/auth/login` |
| 2 | Logged in but no role set (and not on `/onboarding`) | → Redirect to `/onboarding` |
| 3 | Fully onboarded, visiting `/auth/login` or `/onboarding` | → Redirect to role home (`/tourist` or `/business-owner`) |
| 4 | Tourist with `onboarding_completed = false` | → Trapped to `/tourist/quiz` until quiz is finished |
| 5 | Fully onboarded, outside their role's route prefix | → Redirect to role home |
| — | All other requests | → Pass through |

**Role home paths** (defined in `constants/common.ts`):
- Tourist: `/tourist`
- Business Owner: `/business-owner`

---

## User Flows

### New Tourist

```
Login (Google OAuth)
  → /onboarding (select "I am a Tourist")
    → /tourist/quiz (swipe through tags — swipe right to save interest, left to skip)
      → /tourist/explore (personalised feed, ranked by tag similarity)
        → /tourist/explore/listings/:id (view listing details)
          → "Add to Itinerary" (select itinerary + date/time, overlap validation)
            → /tourist/itineraries/:id (view schedule, grouped by day)
              → "Generate Schedule" (AI fills in unscheduled stops)
```

### New Business Owner

```
Login (Google OAuth)
  → /onboarding (select "I am a Business Owner")
    → /business-owner (dashboard — shows owned listings)
      → /business-owner/listings (create new listing with tags + hours)
```

### Returning User

```
Login (Google OAuth)
  → Auth callback redirects to /
    → Middleware redirects to role home (/tourist or /business-owner)
```

---

## Testing

### Unit Tests (Jest)

Unit tests live in `__tests__/unit/` and cover pure logic extracted into `lib/`:

```bash
npm run test:unit
```

Current test suites:
- `explore-params.test.ts` — URL parameter parsing and validation for the explore feed
- `itinerary-overlap.test.ts` — time slot overlap detection for itinerary scheduling

Configuration: `jest.config.ts` uses `next/jest` for SWC transforms, runs in `node` environment (no jsdom), and maps the `@/*` path alias.

### E2E Tests (Playwright)

E2E tests live in `e2e/` and test full user flows against a running dev server:

```bash
npm run test:e2e
```

**Setup:**
- `auth.setup.ts` provisions a test user via Supabase Admin API and stores auth state in `e2e/.auth/user.json`
- Tests reuse the stored auth state (no Google OAuth flow needed in CI)
- The dev server starts automatically (`npm run dev`) if not already running
- In CI, tests run with 1 worker (serialised) to avoid conflicts on the shared test user

Configuration: `playwright.config.ts`

---

## CI/CD Pipeline

### CI — Lint & Type Check ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))

Runs on **every push to any branch** and on **pull requests to `main`**:

1. Checkout → Setup Node 20 → `npm ci`
2. Create `next-env.d.ts` (gitignored but required by tsconfig)
3. `npm run lint` (ESLint)
4. `npx tsc --noEmit` (TypeScript type check)

### Deploy — Supabase Migrations ([`.github/workflows/supabase-production.yml`](.github/workflows/supabase-production.yml))

Runs **only after CI passes on `main`** (triggered by `workflow_run`):

1. Checkout → Setup Supabase CLI
2. `supabase db push` against the production database

**This means migrations only reach production after merge to `main` and a green CI run.**

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Target Supabase project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | General Supabase authentication |
| `SUPABASE_SECRET_KEY` | Supabase authentication for Playwright testing |
| `E2E_TEST_EMAIL` | Test user email for Playwright testing |
| `E2E_TEST_PASSWORD` | Test user password for Playwright testing |

---

## Branch Naming Conventions

Branches follow the pattern **`type/short-description`** using kebab-case:

| Prefix | When to use | Example |
|---|---|---|
| `feat/` | New features or enhancements | `feat/tourist-explore-page` |
| `fix/` | Bug fixes | `fix/quiz-onboarding-action` |
| `refactor/` | Code restructuring (no behaviour change) | `refactor/extract-helpers` |
| `test/` | Adding or updating tests | `test/setup-test-suite` |
| `chore/` | Tooling, config, dependency updates | `chore/setup-supabase-ci` |
| `docs/` | Documentation-only changes | `docs/update-readme` |

**Rules:**
- Branch off `main` for all new work
- Use descriptive names that indicate the scope — e.g. `feat/business-owner-analytics`, not `feat/new-stuff`
- Feature branches are merged into `main` via pull request

---

## Commit Message Conventions

This project uses **[Conventional Commits](https://www.conventionalcommits.org/)** with the format:

```
type(scope): short description
```

### Types

| Type | Purpose | Example |
|---|---|---|
| `feat` | A new feature | `feat(explore): add tag and opening-hours filters` |
| `fix` | A bug fix | `fix(quiz): derive user server-side in markOnboardingComplete` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(explore): extract param and overlap helpers into lib` |
| `test` | Adding or updating tests | `test(e2e): add Playwright setup with Supabase auth bypass` |
| `chore` | Tooling, config, CI, dependencies | `chore: setup supabase ci/cd pipeline` |
| `docs` | Documentation only | `docs: update README with project overview` |

### Scopes

Scopes indicate which part of the codebase is affected. Common scopes used in this project:

| Scope | Area |
|---|---|
| `db` | Database migrations and schema |
| `explore` | Tourist explore/recommendation feed |
| `tourist` | Tourist-side features |
| `onboarding` | Role selection and quiz onboarding |
| `quiz` | Tourist preference quiz |
| `ci` | CI/CD pipelines |
| `nav` | Navigation components |
| `routing` | Middleware and route guards |
| `business-owner` | Business owner features |
| `analytics` | Business analytics dashboard |
| `e2e` | End-to-end tests |
| `unit` | Unit tests |

### Examples from this repository

```
feat(tourist): add dynamic listings feed to home page
feat(onboarding): implement tourist preference quiz with swipe UI and secure routing
feat(explore): rank tourist feed by tag similarity
feat(explore): paginate the recommendation feed
feat(db): add RLS policies and rename migration to 14-digit format
fix(db): actually add onboarding_completed to profile attributes
refactor(explore): extract param and overlap helpers into lib
test(unit): add Jest config and unit tests for explore + itinerary logic
test(e2e): add Playwright setup with Supabase auth bypass
chore: setup supabase ci/cd pipeline
```

### Rules

1. **Use imperative mood** — "add feature", not "added feature" or "adds feature"
2. **Keep the subject line under 72 characters**
3. **Scope is optional** but strongly encouraged for clarity
4. **Multi-line bodies** are allowed for complex changes — add a blank line after the subject, then explain *what* and *why* (not *how*)
5. **Reference PRs** when relevant — the merge commits auto-link PR numbers (e.g. `Merge pull request #13`)

---

## License

This project is for educational purposes as part of the Orbital programme.
