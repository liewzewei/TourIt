# Issues log

A running record of **what changed, why, what it cost, and what broke along the way** — kept per workstream, updated as part of the work rather than reconstructed afterwards.

This is the project-wide log. Every workstream (features, refactors, infrastructure, tooling) gets a section here, not just UI work.

## Table of contents

- [How to use this log](#how-to-use-this-log)
- [Workstream index](#workstream-index)
- [UI/UX overhaul](#uiux-overhaul)
  - [Scope](#scope)
  - [Known defects](#known-defects)
  - [Changes](#changes)
  - [Follow-ups](#follow-ups)
- [Earlier workstreams](#earlier-workstreams)

## How to use this log

**One entry per pull request**, appended under its workstream section, written **in the same PR as the change**. A PR that changes behaviour and leaves this file untouched is incomplete.

Two kinds of content live here, and they serve different purposes:

| | Purpose |
|---|---|
| **Change entries** | What was done and why, so the reasoning survives after the diff is forgotten |
| **Issues encountered** | Bugs, blockers, and surprises hit *while doing the work* — written up with root cause, not just symptom |

Record an issue **when it is found**, with the resolution left open if it isn't fixed yet, then fill the resolution in when it lands. An issue found during planning is still worth an entry — it explains why a later change exists.

### Entry template

```markdown
### <change title> (PR #<n>, `<branch>`)

**Changed:** what was done, in a sentence or two.
**Why:** the reason, including what it unblocks.
**Tradeoffs / known limitations:** what was accepted, and what is not covered.
**Follow-ups:** anything deliberately deferred.

#### Issues encountered

**<short title>**
- **Description:** the symptom as observed.
- **Root cause:** why it actually happened.
- **Resolution:** the fix, and how it was verified.
```

Defects found outside a specific change go in that workstream's **Known defects** table until a PR claims them.

## Workstream index

| Workstream | Period | Status |
|---|---|---|
| [UI/UX overhaul](#uiux-overhaul) | 2026-07 → | In progress |
| [Earlier workstreams](#earlier-workstreams) | 2026-06 → 2026-07 | Shipped, not yet backfilled |

---

## UI/UX overhaul

### Scope

Ten requested UI/UX changes, plus the defects surfaced by the pre-work audit that they touch:

| # | Request |
|---|---|
| 1 | Replace the default date/time selectors with something smoother |
| 2 | Move off the black-and-white palette; add theme options |
| 3 | Nav menu indicates the current page, with hover and active states |
| 4 | Filter panel collapses behind a toggle |
| 5 | Back navigation from a listing to the feed |
| 6 | Text fields shade on hover |
| 7 | Listing cards lift on hover, with room for the shadow |
| 8 | Business-owner listing cards show images |
| 9 | Buttons lift on hover and depress on click |
| 10 | Listing description box sized to its content; scrollbar only on overflow |

The governing finding: only #1, #4, and #5 are new features. The rest are consequences of having **no shared UI primitives** — every button, input, and card is styled at its call site, so a one-line visual change means editing twenty files. The work therefore builds shared primitives first and lets the requested changes fall out of them.

Full plan, including branch and commit structure: `.agent/ui-overhaul-implementation-plan.md` (untracked).

### Known defects

Found during the pre-work audit on **2026-07-24**, against `main` @ `aa13406`. None were introduced by this workstream; each is scheduled into the PR that already touches that code.

| ID | Defect | Severity | Status |
|---|---|---|---|
| UI-01 | Whole app renders in Times New Roman — the Geist font is loaded but never applied | High — affects every page | Open, scheduled `fix/ui-font-token` |
| UI-02 | AI-schedule modal backdrop is fully opaque instead of a 50% scrim | Medium | Open, scheduled `refactor/ui-token-adoption` |
| UI-03 | Business-owner home redirects unauthenticated users to a route that does not exist | Low — unreachable in practice | Open, scheduled `feat/owner-listing-images` |
| UI-04 | Listing detail page queries tags it never renders | Low — dead query + inconsistent UI | Open, scheduled `feat/listing-detail-back-link` |
| UI-05 | Listing-card markup duplicated across the explore feed and the owner home, already drifted | Medium — maintenance | Open, scheduled `refactor/listing-card-component` |
| UI-06 | Tag multi-select duplicated across the filter bar and the listing form; the 5-tag cap exists in only one copy | Medium — behavioural drift | Open, scheduled `refactor/tag-multi-select` |
| UI-07 | Six or more hand-styled black buttons instead of the existing `Button` component | Medium — maintenance | Open, scheduled `feat/ui-interaction-primitives` |
| UI-08 | Analytics charts hardcode `blue-500` / `emerald-500` / `red-600`; the `--chart-1..5` tokens are unused | Medium — blocks theming | Open, scheduled `refactor/ui-token-adoption` |

#### UI-01 — the application renders in the browser's default serif

- **Description:** every page renders in Times New Roman. `app/layout.tsx` loads Geist via `next/font/google` and puts `--font-geist-sans` on `<html>`, and `app/globals.css` applies `font-sans` to `html` in a base layer, so the intent is clearly Geist.
- **Root cause:** `app/globals.css` declares `--font-sans: var(--font-sans)` inside `@theme inline` — a self-reference. Because the theme entry is `inline`, Tailwind emits the utility as `font-family: var(--font-sans)` without defining that variable at `:root`, so the declaration is invalid at computed-value time and the element falls back to the browser default. The variable that *does* hold the font is `--font-geist-sans`, which nothing references. `--font-mono` is wired correctly, which is why the mistake reads as a find-and-replace slip.
- **Verification:** `getComputedStyle(document.body).fontFamily` returns `"Times New Roman"` on the running dev server, while `--font-geist-sans` resolves to `"Geist", "Geist Fallback"`.
- **Resolution:** open. Point `--font-sans` at `var(--font-geist-sans)`. Isolated into its own PR because the diff is one line but the visual effect is site-wide.

#### UI-02 — modal backdrop is opaque, not translucent

- **Description:** the "Generate AI Schedule" modal on the itinerary detail page blacks out the page behind it instead of dimming it.
- **Root cause:** the overlay uses `bg-black bg-opacity-50`. The `bg-opacity-*` utilities were **removed in Tailwind v4** in favour of the `bg-black/50` slash syntax, so the class generates no rule and `bg-black` applies at full opacity. The equivalent overlay in `AddToItineraryButton` uses `bg-black/50` and is correct, which is why only one modal is affected.
- **Verification:** probing the served stylesheet on the running dev server shows no rule for `bg-opacity-50`, while `bg-black/50` resolves to `oklab(0 0 0 / 0.5)`.
- **Resolution:** open. Fold into the token-adoption sweep, which already rewrites that file.

#### UI-03 — redirect to a non-existent auth route

- **Description:** `app/business-owner/page.tsx` redirects unauthenticated visitors to `/auth/sign-in`.
- **Root cause:** the app's login route is `/auth/login`, exported as `LOGIN_PATH` in `constants/common.ts`. The literal string predates that constant and was never updated.
- **Impact:** effectively unreachable — `proxy.ts` redirects unauthenticated requests before the page renders — so this is a latent trap rather than a live bug.
- **Resolution:** open. Use `LOGIN_PATH` when that file is edited for listing images.

#### UI-04 — tags fetched but never rendered on listing detail

- **Description:** the listing detail page's Supabase query selects `listing_tags (tags (id, tag_name))`, but the page renders no tags. Tags *are* shown on the explore cards, so a listing appears to lose its tags when opened.
- **Root cause:** the query was written for a tag display that was never built, or that was removed without trimming the select.
- **Resolution:** open. Render the tags rather than delete the query — the inconsistency with the card is the real defect.

### Changes

#### Add the project issues log (PR #TBD, `docs/ui-issues-log`)

**Changed:** added this file, `docs/ISSUES.md`, and linked it from `README.md` and `CONTRIBUTING.md`. Seeded it with the UI/UX overhaul workstream and the eight defects found in the pre-work audit.

**Why:** the project had no single place recording *why* changes were made or what went wrong while making them — that context was living in commit messages and PR descriptions, where it is hard to compile later. The log exists to be read as documentation, so it is written per workstream rather than chronologically, and it is updated inside each PR so it never has to be reconstructed from memory.

**Tradeoffs / known limitations:**
- Discipline-based, not enforced. Nothing in CI fails a PR that skips its entry.
- Earlier workstreams are not backfilled, so the log starts mid-project. See [Earlier workstreams](#earlier-workstreams).
- Defect severities are judgement calls, not a formal rubric.

**Follow-ups:** backfill the earlier workstreams; decide whether a PR-template checkbox is worth adding to nudge updates.

##### Issues encountered

**Deciding where the log should live**
- **Description:** the log could sit at the repository root (`ISSUES.md`, maximum visibility) or in `docs/` alongside the other long-form documentation.
- **Root cause:** the root already carries `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, and `CLAUDE.md`; a fifth root-level document dilutes the "start here" signal, while `docs/` is already the established home for reference material and is indexed from both `README.md` and `CONTRIBUTING.md`.
- **Resolution:** placed at `docs/ISSUES.md` and added to both indexes so it is reachable from the two entry points a reader is most likely to start from.

### Follow-ups

Deliberately **out of scope** for this workstream — recorded so they are not lost, not because they are planned:

| Item | Note |
|---|---|
| Duplicate login-button implementations | `components/auth-buttons.tsx` and `components/user-avatar.tsx` implement the same button; `AuthButton` is now only reachable from the mobile sheet |
| Emoji used as UI chrome | 📍 🕒 🗑️ ✨ and arrow glyphs sit alongside lucide icons; the delete controls are emoji with an `aria-label` rather than an icon component |
| Inconsistent page shells | Pages use `p-8`, `max-w-4xl`, `max-w-6xl`, and `max-w-xl` independently; one itinerary form hardcodes `min-w-[420px]`, which overflows narrow phones |
| Full page reload on itinerary save | `window.location.reload()` where the rest of the app uses `router.refresh()` |
| Missing loading skeletons | `loading.tsx` exists only for the analytics and login routes; elsewhere loading is inline pulsing text |
| Stale root metadata | `metadata.description` is still "Generated by create next app" |
| Hand-rolled modals | Two modals bypass the existing `alert-dialog` + `ConfirmProvider` infrastructure, so they have no focus trap, Escape handling, scroll lock, or transitions |
| No reduced-motion handling | Nothing in the codebase responds to `prefers-reduced-motion`; the overhaul adds a global rule, but existing inline transitions should be audited against it |

---

## Earlier workstreams

Work that shipped **before** this log existed. Listed so the gap is explicit and the sections have somewhere to go when backfilled:

| Workstream | Shipped | Notes |
|---|---|---|
| Recommendation engine + explore feed | 2026-06 | TF-IDF ranking RPC, filters, pagination |
| Test harness + CI/CD | 2026-06 | Jest, Playwright, husky hooks, GitHub Actions |
| Time-constraint hardening | 2026-06 | App-level validation mirrored by DB CHECKs and a trigger |
| Delete-confirmation standardisation | 2026-06 | Reusable confirm dialog replacing native `confirm()`/`alert()` |
| Local Supabase development setup | 2026-07 | Local stack, seed data, dev-only login |
| Business-owner analytics dashboard | 2026-07 | Stats RPCs, trend chart, audience panel, AI insight, CSV export |
| Listing images | 2026-07 | Storage bucket, owner-scoped policies, direct upload, carousel |

Backfilling these is optional and can be done one workstream at a time; the notes needed to reconstruct them exist in the PR history and working notes.
