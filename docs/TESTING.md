# Testing

TourIt has three quality layers — **ESLint** (static analysis), **Jest** (unit tests), and **Playwright** (end-to-end) — run locally for fast feedback and in CI as the authoritative gate.

## Table of contents

- [Philosophy: local vs CI](#philosophy-local-vs-ci)
- [Unit tests (Jest)](#unit-tests-jest)
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
  - `explore-params.test.ts` — URL parameter parsing/validation for the explore feed (`lib/explore-params.ts`).
  - `itinerary-overlap.test.ts` — time-slot overlap detection for scheduling (`lib/itinerary-overlap.ts`).
  - `time-constraints.test.ts` — the operating-hours / within-hours logic (`lib/time-constraints.ts`), mirrored by the DB trigger.

Anything DOM-bound or requiring a full request is covered by E2E instead.

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

Config: `playwright.config.ts`. Two Playwright "projects" run in order:

1. **`setup`** (`e2e/auth.setup.ts`) — because Google OAuth can't be scripted, this uses the **admin client** (`e2e/supabase-admin.ts`, service key) to create the `E2E_TEST_EMAIL` user if missing, reset it to a clean unonboarded tourist, then `POST /auth/test-login` to sign in. The resulting session cookies are saved to `e2e/.auth/user.json` (Playwright "storageState").
2. **`chromium`** — every test loads that storageState (so it starts **already logged in**) and drives the browser. The `webServer` block boots `npm run dev` (reusing an already-running server locally, a fresh one in CI).

The one spec, `e2e/golden-path.spec.ts`, walks the core journey: an unonboarded tourist completes the tag quiz → lands on the personalized explore feed → opens a listing → schedules it into an itinerary → sees the success toast.

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
| **E2E Tests** | Playwright against a Supabase stack **started inside the runner** | PRs to `main` only, after the two above pass |

The E2E job is self-contained: it runs `supabase start` (which applies **all migrations + the seed** from scratch — so migrations are validated every PR), reads the local keys via `supabase status -o env`, and points Playwright at `http://127.0.0.1:54321`. **It never touches a hosted database** — no production/staging Supabase secrets are involved. The Playwright HTML report is uploaded as an artifact.

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
