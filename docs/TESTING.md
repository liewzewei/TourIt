# Testing

TourIt has four quality layers — **ESLint** (static analysis), **Jest** (unit tests), **pgTAP** (database/RLS tests), and **Playwright** (end-to-end) — run locally for fast feedback and in CI as the authoritative gate.

## Table of contents

- [Philosophy: local vs CI](#philosophy-local-vs-ci)
- [Unit tests (Jest)](#unit-tests-jest)
- [Database tests (pgTAP)](#database-tests-pgtap)
- [End-to-end tests (Playwright)](#end-to-end-tests-playwright)
- [Git hooks](#git-hooks)
- [CI/CD pipeline](#cicd-pipeline)
- [Testing vocabulary](#testing-vocabulary)

## Philosophy: local vs CI

The rule of thumb is **fast checks locally, the full suite in CI**:

- **Locally / on commit:** lint (on staged files) is instant, so it runs on every commit via a git hook. Unit tests and type-checking are heavier, so they run on `git push`. You run E2E by hand when you touch a user-facing flow.
- **In CI:** everything runs on every push/PR, in a clean environment, as the merge gate. CI is what catches "works on my machine."

The git hooks are a convenience, not a replacement for CI — CI re-runs everything regardless.

## Unit tests (Jest)

Pure, fast logic tests. No database, no DOM.

```bash
npm run test:unit
```

- **Location:** `__tests__/unit/` (config: `jest.config.ts`, using `next/jest` for SWC transforms + the `@/*` path alias, `testEnvironment: "node"`).
- **Suites:**
  - `analytics.test.ts` — save-rate, delta, and aggregation maths for the owner dashboard (`lib/analytics.ts`).
  - `analytics-params.test.ts` — analytics period parsing against a fixed instant (`lib/analytics-params.ts`).
  - `chart.test.ts` — chart geometry / coordinate scaling (`lib/chart.ts`).
  - `explore-params.test.ts` — URL parameter parsing/validation for the explore feed (`lib/explore-params.ts`).
  - `itinerary-overlap.test.ts` — time-slot overlap detection for scheduling (`lib/itinerary-overlap.ts`).
  - `listing-images.test.ts` — image batch validation (count/type/size limits) and public URL building (`lib/listing-images.ts`).
  - `time-constraints.test.ts` — the operating-hours / within-hours logic (`lib/time-constraints.ts`), mirrored by the DB trigger.

Anything DOM-bound or requiring a full request is covered by E2E instead.

## Database tests (pgTAP)

Row-level security and RPC behaviour are asserted **inside Postgres**, against the real migrations. Requires the local stack to be running.

```bash
npx supabase test db
```

In CI these run inside the E2E job, against the freshly migrated + seeded stack, before Playwright starts.

- **Location:** `supabase/tests/*.sql`, each a single `begin; select plan(N); … select * from finish(); rollback;` transaction, so runs leave no data behind.
- **Suites:**
  - `analytics_security_test.sql` — owners see only their own analytics, the audience profile is withheld below the k-anonymity threshold and never leaks an identity, `listing_views` is default-deny, and view logging dedupes per day / skips owner self-views.
  - `listing_images_security_test.sql` — owner-only writes on `listing_images` and on `storage.objects` under the listing's folder, public reads, cascade on listing delete, and `recommend_listings.preview_image_path` resolution.

Two things to know when writing these:

- **`SET ROLE authenticated` is required.** The test runner connects as the `postgres` superuser, which *bypasses* RLS — a policy test that doesn't switch roles passes for the wrong reason. Do fixture setup and ground-truth counts as the superuser, and switch roles only around the assertions, driving `auth.uid()` via `request.jwt.claims`.
- **`storage.objects` can't be deleted directly.** A `protect_delete` trigger blocks raw `DELETE` ("use the Storage API instead"), so delete *policies* on the bucket are asserted via `pg_policies` rather than exercised. `INSERT` policies are fully behaviour-tested.

## End-to-end tests (Playwright)

E2E drives a **real Chromium browser** through complete user journeys against the running app + a real Supabase.

```bash
npm run test:e2e
```

`test:e2e` first runs `playwright install chromium` (a fast no-op once the browser is cached, a one-time download on a fresh machine) and then `playwright test`.

### Running E2E locally

You need all of:

1. `npm ci` (or `npm install`)
2. **Docker Desktop running** + the stack up: `npx supabase start` (and `npx supabase db reset` so the seed's listings exist)
3. `.env.development.local` populated (local URL + keys + `SUPABASE_SECRET_KEY` + `E2E_TEST_EMAIL`/`PASSWORD`) — the Playwright process loads `.env.development.local` (then `.env.local`), matching the app
4. `npm run test:e2e`

The browser is handled for you by the script; use `npm run test:e2e` (not `npx playwright test` directly) so the install step fires.

### How it works

Config: `playwright.config.ts`. Three Playwright "projects" run in order:

1. **`setup`** — because Google OAuth can't be scripted, both setups sign in via `POST /auth/test-login` and save session cookies as Playwright "storageState":
   - `e2e/auth.setup.ts` uses the **admin client** (`e2e/supabase-admin.ts`, service key) to create the `E2E_TEST_EMAIL` user if missing and reset it to a clean **unonboarded tourist** → `e2e/.auth/user.json`.
   - `e2e/owner.setup.ts` signs in the seeded business owner → `e2e/.auth/owner.json`.
2. **`chromium`** — tourist specs, loading `user.json` (so they start **already logged in**). Excludes `owner-*.spec.ts`.
3. **`owner`** — business-owner specs, matching `owner-*.spec.ts` and loading `owner.json`.

The `webServer` block boots `npm run dev` (reusing an already-running server locally, a fresh one in CI). **Which project a spec runs in is decided by its filename** — anything named `owner-*.spec.ts` gets the owner session, everything else gets the tourist session.

**Specs:**

- `golden-path.spec.ts` — the core tourist journey: an unonboarded tourist completes the tag quiz → lands on the personalized explore feed → opens a listing → schedules it into an itinerary → sees the success toast.
- `owner-analytics.spec.ts` — the business-owner analytics dashboard: overview renders, period switch works, drilling into a listing loads its page. Assertions are structural, so other tests mutating views/saves can't break it.
- `owner-listing-images.spec.ts` — the listing-images flow across **both** roles: the owner creates a listing and uploads two fixture images (`e2e/fixtures/`), then a tourist sees the cover on the explore feed and swipes the detail-page carousel. Because an owner can't view `/tourist/explore` (the proxy redirects them to their own dashboard), the tourist steps run in a second `browser.newContext()` signed in as the seeded, already-onboarded `tourist@tourit.local` — deliberately *not* the golden-path user, which `auth.setup.ts` keeps unonboarded and mutates in parallel. Teardown uses `deleteListingCascade()` from `supabase-admin.ts`, which removes the bucket objects and `listing_tags` explicitly (`listing_images` and `listing_views` cascade from the listing row).

## Git hooks

Managed by **husky** + **lint-staged**, installed automatically on `npm install` (via the `prepare` script) — teammates need no extra setup.

| Hook | Runs | Purpose |
|---|---|---|
| `.husky/pre-commit` | `npx lint-staged` → ESLint on staged `*.{ts,tsx}` | catch lint errors at commit time (fast) |
| `.husky/pre-push` | `npm run test:unit && npx tsc --noEmit` | unit tests + type-check before code is pushed |

lint-staged config lives in `package.json` (`"*.{ts,tsx}": "eslint"`, check-only). Bypass a hook with `git commit --no-verify` / `git push --no-verify` for work-in-progress.

## CI/CD pipeline

### CI — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Runs on **every push to any branch** and on **pull requests to `main`** (Node 22). Three jobs:

| Job | Runs | When |
|---|---|---|
| **Lint & Type Check** | `npm run lint` + `npx tsc --noEmit` | always |
| **Unit Tests** | `npm run test:unit` | always |
| **E2E Tests** | pgTAP (`supabase test db`) + Playwright against a Supabase stack **started inside the runner** | PRs to `main` only, after the two above pass |

The E2E job is self-contained: it runs `supabase start` (which applies **all migrations + the seed** from scratch — so migrations are validated every PR), runs the pgTAP suites against that fresh database, then reads the local keys via `supabase status -o env` and points Playwright at `http://127.0.0.1:54321`. **It never touches a hosted database** — no production/staging Supabase secrets are involved. The Playwright HTML report is uploaded as an artifact.

### Deploy — [`.github/workflows/supabase-production.yml`](../.github/workflows/supabase-production.yml)

Runs **only after CI succeeds on `main`** (`workflow_run`): sets up the Supabase CLI and runs `supabase db push` against the production database. So **migrations reach production only after merge to `main` and a green CI run** — never from a feature branch. Requires the `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_DB_URL` repo secrets.

## Testing vocabulary

Quick reference for the terms above:

- **Unit** — smallest pieces (a function) in isolation; fast, numerous → Jest.
- **Integration** — several units/modules working together (e.g. a function + the DB).
- **System** — the whole assembled app against requirements, end to end.
- **End-to-end (E2E)** — a full user journey through the real UI and stack, as a black box → Playwright.
- **Regression** — re-running existing tests after a change to confirm nothing broke; CI running the suite on every PR is regression testing in practice.
- **Automated UI** — driving the real interface (clicks/typing) programmatically → what Playwright does; overlaps with E2E.
