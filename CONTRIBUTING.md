# Contributing

How we work on TourIt: environment, branches, commits, pull requests, and the migration→deploy flow.

- **Set up your environment:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Run tests + git hooks:** [docs/TESTING.md](docs/TESTING.md)
- **Understand the codebase:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Git hooks (automatic)

Installed on `npm install` (via the `prepare` script), so there's nothing to set up:

- **pre-commit** — ESLint on staged `*.{ts,tsx}` (via lint-staged).
- **pre-push** — `npm run test:unit` + `npx tsc --noEmit`.

Bypass with `--no-verify` for work-in-progress. These are a local convenience; CI re-runs everything regardless.

## Branch naming

Pattern **`type/short-description`** in kebab-case:

| Prefix | When | Example |
|---|---|---|
| `feat/` | New features / enhancements | `feat/tourist-explore-page` |
| `fix/` | Bug fixes | `fix/quiz-onboarding-action` |
| `refactor/` | Restructuring, no behaviour change | `refactor/extract-helpers` |
| `test/` | Adding/updating tests | `test/golden-path-e2e` |
| `chore/` | Tooling, config, dependencies | `chore/setup-git-hooks` |
| `docs/` | Documentation only | `docs/restructure` |

- Branch off `main` for all new work.
- Use descriptive names (`feat/business-owner-analytics`, not `feat/new-stuff`).
- Feature branches merge into `main` via pull request.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): short description`.

**Types:** `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `ci`.

**Common scopes:** `db`, `explore`, `tourist`, `onboarding`, `quiz`, `business-owner`, `routing`, `nav`, `auth`, `ui`, `e2e`, `unit`, `ci`.

**Rules:**

1. Imperative mood — "add feature", not "added"/"adds".
2. Keep the subject under ~72 characters.
3. Scope is optional but encouraged.
4. Use a multi-line body for non-trivial changes: blank line after the subject, then explain *what* and *why* (not *how*).

**Examples from this repository:**

```
feat(explore): rank tourist feed by tag similarity
feat(ui): add reusable confirm dialog; replace native confirm/alert on itineraries
fix(db): grant authenticated/service_role privileges on public schema
refactor(itinerary): use shared confirm dialog for activity removal
ci(e2e): run E2E against an ephemeral local Supabase, not prod
chore: add husky pre-commit (lint-staged) and pre-push (unit + typecheck) hooks
docs: restructure README into README + docs/
```

## Pull requests

1. Push your branch and open a PR against `main`.
2. **CI must pass** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): Lint & Type Check and Unit Tests run on every push; the E2E suite runs on PRs to `main` against a Supabase stack spun up inside the runner (details in [docs/TESTING.md](docs/TESTING.md#cicd-pipeline)).
3. Merge to `main` via pull request once green.

## Database migrations & deployment

Schema changes are **timestamped SQL migrations** in `supabase/migrations/`.

1. Create one: `npx supabase migration new <name>`, then write the SQL (or make changes in Studio and capture them with `npx supabase db diff -f <name>`).
2. Test locally: `npx supabase db reset` re-applies all migrations from scratch and re-runs the seed — so you catch apply/ordering/backfill problems before they leave your machine.
3. Open a PR. CI's E2E job runs `supabase start`, which applies your migration from scratch, so a broken migration fails the PR.
4. **On merge to `main`**, after CI passes, [`.github/workflows/supabase-production.yml`](.github/workflows/supabase-production.yml) runs `supabase db push` to deploy the migration to production.

Notes:

- Migrations never run automatically from a feature branch — only from `main` after green CI.
- `supabase/seed.sql` is **local-only**; `supabase db push` applies migrations but never the seed, so seed data never reaches production. Keep secrets out of it.
