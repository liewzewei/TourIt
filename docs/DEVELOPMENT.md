# Development Guide

TourIt is developed **locally against a full Supabase stack running in Docker** — you don't need a hosted Supabase project or Google OAuth credentials to run the app. This guide takes you from a fresh clone to a running, logged-in app, and also covers developing against the hosted project when you need to.

> The 5-minute version lives in the [README Quickstart](../README.md#quickstart). This is the complete reference.

## Table of contents

- [Prerequisites](#prerequisites)
- [Local setup (first time)](#local-setup-first-time)
- [Environment variables](#environment-variables)
- [Logging in locally](#logging-in-locally)
- [Seed data](#seed-data)
- [Developing against the remote project](#developing-against-the-remote-project-optional)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 or newer (CI uses 22) | ships with npm |
| Docker Desktop | latest | **required** — the local Supabase stack runs in containers |
| Supabase CLI | — | already a devDependency; run it via `npx supabase …` (no global install needed) |

You do **not** need a hosted Supabase project or Google OAuth credentials for local development.

## Local setup (first time)

```bash
# 1. Clone + install. Git hooks install automatically via the "prepare" script.
git clone https://github.com/liewzewei/TourIt.git
cd TourIt
npm install

# 2. Start Docker Desktop, then bring up the local Supabase stack.
#    First run pulls several GB of images — slow once, cached afterwards.
npx supabase start

# 3. Apply every migration AND load the seed data.
npx supabase db reset

# 4. Print the local stack's URL + keys.
npx supabase status
```

Create your local env file and fill in the keys:

```bash
cp .env.development.local.example .env.development.local
```

Paste the **anon/publishable key** and **service_role/secret key** from `npx supabase status` into `.env.development.local` (the URL is already filled in). See [Environment variables](#environment-variables) for what each value is.

Run the app:

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with the **dev quick-login buttons** — see [Logging in locally](#logging-in-locally).

### Day-to-day

| Command | When |
|---|---|
| `npx supabase start` | bring the stack up (needed before `npm run dev`) |
| `npm run dev` | run the app |
| `npx supabase db reset` | rebuild the DB from scratch (re-applies migrations + seed) — after pulling new migrations or for a clean slate |
| `npx supabase stop` | shut the stack down |

## Environment variables

The app reads these:

| Variable | Used by | Sensitivity |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app (browser + server) | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app (browser + server) | public |
| `SUPABASE_SECRET_KEY` | the E2E admin client only | **secret** |
| `GEMINI_API_KEY` | AI schedule generation (server-side) | **secret** |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | E2E test login | test-only |

There are **two env files**, and in development Next.js gives the first priority:

| File | Points at | Committed? |
|---|---|---|
| `.env.development.local` | the **local** Docker stack (default for `npm run dev` and local E2E) | no (gitignored) |
| `.env.local` | the **remote/hosted** project (optional; for developing against real data) | no (gitignored) |

Both have committed **`.example`** templates. (`.gitignore` ignores `.env*`, but re-includes `!.env*.example`.)

**Which values to fill in:**

- **Local (`.env.development.local`)** — the URL is fixed (`http://127.0.0.1:54321`); copy the two keys from `npx supabase status`. The local keys are the same on every machine and are **not secret**. `GEMINI_API_KEY` is only needed to exercise the AI schedule feature; `E2E_TEST_*` only to run E2E.
- **Remote (`.env.local`)** — from the Supabase Dashboard → Project Settings → Data API / API Keys. These **are** secrets; never commit the filled-in file.

> **On the key names:** Supabase is migrating `anon`/`service_role` keys to `publishable`/`secret` (the legacy keys deprecate in late 2026). The app's variable *names* already use the new convention; locally we simply paste the local stack's (legacy JWT) values into them, which works fine. In production, use the new `sb_publishable_…` / `sb_secret_…` keys.

## Logging in locally

The app's only real login is **Google OAuth**, which isn't configured on the local stack. So for local development, use the **dev-only quick-login buttons** on the login page (`/auth/login`): **"Log in as Tourist"** and **"Log in as Business Owner"**. They sign you in as the seeded demo accounts through the `/auth/test-login` route.

Both are dev-only and cannot reach production: the buttons are stripped from production builds, and the route returns `404` in production (details in [ARCHITECTURE.md](ARCHITECTURE.md#dev-only-login)).

Demo accounts (created by the seed):

| Account | Email | Password | Role |
|---|---|---|---|
| Tourist | `tourist@tourit.local` | `password123` | tourist |
| Business Owner | `owner@tourit.local` | `password123` | business_owner |

## Seed data

`supabase/seed.sql` runs automatically after migrations on `npx supabase db reset` (and on the first `npx supabase start`). It is **local-only** — `supabase db push` (the production deploy) never runs it. It provides:

- the two demo accounts above,
- six Singapore listings owned by the business account, each with tags,
- interests for the tourist (so the recommendation feed returns results),
- a starter itinerary with two unscheduled stops (to demo the AI scheduler and the remove-activity dialog).

<details>
<summary><strong>How the auth seeding works</strong></summary>

Supabase Auth (GoTrue) owns `auth.users` (accounts + bcrypt passwords) and `auth.identities` (the email/password login link, which recent versions require for sign-in). Inserting into `auth.users` fires triggers that create the app's `public.users` and `public.profiles` rows automatically, so the seed only inserts the auth rows and then sets each profile's role. `full_name` in the user metadata is required — a trigger copies it into `public.users.name`, which is `NOT NULL`. Writing `auth.users` in raw SQL is a **local-only** technique; in production you'd use real OAuth or the Admin API.
</details>

## Developing against the remote project (optional)

Fill `.env.local` with your hosted project's URL + keys. Since Next gives `.env.development.local` priority in dev, temporarily rename/remove that file (or point its values at the remote project) to actually hit the remote. **Do not run E2E in this mode** — it would create and mutate data on the hosted database.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test:unit` | Jest unit tests |
| `npm run test:e2e` | Install the Playwright browser (a fast no-op if already cached), then run E2E |
| `npm run prepare` | Installs the git hooks — runs automatically on `npm install` |

See [TESTING.md](TESTING.md) for the testing and git-hook details.

## Troubleshooting

**`supabase start` / `status` fails with `dockerDesktopLinuxEngine … cannot find the file`** — Docker Desktop isn't running. Start it and retry.

**`supabase start` fails with `failed to resolve reference … gotrue:<version>`** — a stale image-version pin recorded by `supabase link`. Delete it and retry:

```bash
rm supabase/.temp/gotrue-version   # gitignored, regenerated on next start
npx supabase start
```

**`supabase start` hangs or errors on the analytics container (Windows)** — set `[analytics] enabled = false` in `supabase/config.toml`, or enable Docker Desktop's "Expose daemon on tcp://localhost:2375 without TLS".

**`permission denied for table … (code 42501)`** — the API roles are missing table grants. A fresh `npx supabase db reset` applies the grant migration (`20260704000000_grant_api_roles_public_schema.sql`) that fixes this. (Table `GRANT`s and RLS policies are separate layers — you need both; see [ARCHITECTURE.md](ARCHITECTURE.md#database).)

**Port `54321`/`54322`/`3000` already in use** — another Supabase stack or dev server is running. Run `npx supabase stop` and/or stop the other process.
