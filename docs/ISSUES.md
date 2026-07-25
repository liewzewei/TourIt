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
| [UI/UX overhaul](#uiux-overhaul) | 2026-07-24 → 2026-07-26 | **Shipped** (PRs #58–#74) |
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

Found during the pre-work audit on **2026-07-24**, against `main` @ `aa13406`. None were introduced by this workstream; each was scheduled into the PR that already touched that code, and **all eight are now fixed**.

| ID | Defect | Severity | Status |
|---|---|---|---|
| UI-01 | Whole app renders in Times New Roman — the Geist font is loaded but never applied | High — affects every page | **Fixed** in `fix/ui-font-token` (#59) |
| UI-02 | AI-schedule modal backdrop is fully opaque instead of a 50% scrim | Medium | **Fixed** in `refactor/ui-token-adoption` (#61) |
| UI-03 | Business-owner home redirects unauthenticated users to a route that does not exist | Low — unreachable in practice | **Fixed** in `feat/owner-listing-images` (#69) |
| UI-04 | Listing detail page queries tags it never renders | Low — dead query + inconsistent UI | **Fixed** in `feat/listing-detail-back-link` (#70) |
| UI-05 | Listing-card markup duplicated across the explore feed and the owner home, already drifted | Medium — maintenance | **Fixed** in `refactor/listing-card-component` (#67) |
| UI-06 | Tag multi-select duplicated across the filter bar and the listing form; the 5-tag cap exists in only one copy | Medium — behavioural drift | **Fixed** in `feat/ui-navigation` (#72) |
| UI-07 | Six or more hand-styled black buttons instead of the existing `Button` component | Medium — maintenance | **Fixed** in `feat/ui-interaction-primitives` (#65) |
| UI-08 | Analytics charts hardcode `blue-500` / `emerald-500` / `red-600`; the `--chart-1..5` tokens are unused | Medium — blocks theming | **Fixed** in `refactor/ui-token-adoption` (#61) |

#### UI-01 — the application renders in the browser's default serif

- **Description:** every page renders in Times New Roman. `app/layout.tsx` loads Geist via `next/font/google` and puts `--font-geist-sans` on `<html>`, and `app/globals.css` applies `font-sans` to `html` in a base layer, so the intent is clearly Geist.
- **Root cause:** `app/globals.css` declares `--font-sans: var(--font-sans)` inside `@theme inline` — a self-reference. Because the theme entry is `inline`, Tailwind emits the utility as `font-family: var(--font-sans)` without defining that variable at `:root`, so the declaration is invalid at computed-value time and the element falls back to the browser default. The variable that *does* hold the font is `--font-geist-sans`, which nothing references. `--font-mono` is wired correctly, which is why the mistake reads as a find-and-replace slip.
- **Verification:** `getComputedStyle(document.body).fontFamily` returned `"Times New Roman"` on the running dev server, while `--font-geist-sans` resolved to `"Geist", "Geist Fallback"`.
- **Resolution:** fixed in `fix/ui-font-token` by pointing `--font-sans` — and `--font-heading`, broken by the same chain — at `var(--font-geist-sans)`. Confirmed on the running app: `body`, `h1`, and both utilities now compute to `Geist, "Geist Fallback"`. Isolated into its own PR because the diff is three lines but the visual effect is site-wide.

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
- **Resolution:** fixed in `feat/listing-detail-back-link` (#70) by rendering the fetched tags as chips on the detail page, rather than deleting the query — the inconsistency with the explore card was the real defect.

#### UI-05 — listing-card markup duplicated and drifted

- **Description:** the explore feed and the business-owner home each hand-built a listing card, and the two had already diverged (spacing, image handling).
- **Root cause:** no shared card component — the governing "styled at the call site" problem, in miniature.
- **Resolution:** fixed in `refactor/listing-card-component` (#67) by extracting one server `ListingCard` (cover image or placeholder, tags, optional whole-card link), consumed by both feeds.

#### UI-06 — tag multi-select duplicated, cap in only one copy

- **Description:** the filter bar and the listing form each implemented the tag dropdown; the 5-tag cap and its disabled styling existed only in the form.
- **Root cause:** copy-paste duplication that then drifted, so the two controls behaved differently.
- **Resolution:** fixed in `feat/ui-navigation` (#72) by extracting one controlled `TagMultiSelect` with a `maxSelected` prop (5 for the form, unlimited for the filter).

#### UI-07 — hand-styled buttons instead of the `Button` primitive

- **Description:** six-plus black buttons were styled inline rather than using the existing `Button` component, so they missed its focus ring and (later) its hover/press motion.
- **Root cause:** the primitive existed but adoption was never enforced.
- **Resolution:** fixed in `feat/ui-interaction-primitives` (#65): primary CTAs moved onto `Button`, which now carries the `lift`/`press` recipes so every button lifts on hover and depresses on click (#9).

#### UI-08 — analytics charts hardcode Tailwind colours

- **Description:** the analytics charts used `blue-500` / `emerald-500` / `red-600` literals while the `--chart-1..5` tokens went unused — so charts could never respond to a theme.
- **Root cause:** the charts predated the token ramp and were never migrated.
- **Resolution:** fixed in `refactor/ui-token-adoption` (#61) by moving every chart mark onto `var(--chart-*)`. This is what later let the theming epic re-tint charts per palette.

### Changes

#### Add the project issues log (PR #58, `docs/issues-log`)

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

#### Apply the Geist font (PR #59, `fix/ui-font-token`)

**Changed:** pointed the `--font-sans` and `--font-heading` theme keys at `var(--font-geist-sans)`, the variable `next/font` actually defines on `<html>`. Resolves [UI-01](#ui-01--the-application-renders-in-the-browsers-default-serif).

**Why:** the application was rendering in the browser's default serif on every page. Three lines of CSS, but the visual effect is site-wide, so it ships alone — bundled with anything else it would make that PR's diff impossible to review.

**Tradeoffs / known limitations:**
- Every page changes appearance. Nothing else changes, so any visual regression found later in this workstream can be bisected against this commit.
- Text metrics change with the typeface: line lengths, wrapping, and truncation points shift slightly. The `line-clamp` counts on listing cards were left as they are; whether they still cut at a sensible point is a judgement to make once the cards are rebuilt.
- `--font-mono` was already correct and is untouched, but no utility uses it, so nothing in the app renders in Geist Mono today.

**Follow-ups:** none.

##### Issues encountered

**`font-heading` was broken by the same chain, and would have survived the obvious fix**
- **Description:** the reported symptom was the body font. Fixing only `--font-sans` would have left `CardTitle` and `SheetTitle` — the two `font-heading` consumers — still rendering in serif, and the bug would have looked half-fixed.
- **Root cause:** `--font-heading` was declared as `var(--font-sans)`. Inside `@theme inline` that is not a reference to the *resolved* theme value; Tailwind copies the text into the utility, so `.font-heading` emitted `font-family: var(--font-sans)` — a variable that, being inline, is never declared at `:root`. The indirection made the second broken key invisible unless the whole chain was followed.
- **Resolution:** pointed `--font-heading` at `var(--font-geist-sans)` directly rather than at another inline key. Verified by measuring the computed `font-family` of a `.font-heading` element before and after: `"Times New Roman"` → `Geist, "Geist Fallback"`. A comment in `globals.css` now records why these keys must reference the `next/font` variables and not each other.

**`font-mono` appeared broken but was a false positive**
- **Description:** while measuring, a synthetic `.font-mono` element also computed to `"Times New Roman"`, suggesting a third broken key.
- **Root cause:** no source file uses the `font-mono` utility, so Tailwind's JIT never generates the class and the test element simply inherited the body font. The `--font-mono` token itself was correctly declared all along.
- **Resolution:** none needed. Recorded because the measurement technique — probing a class that may not exist — is quietly misleading, and the same trap applies to any future token audit.

#### Foundation — design tokens and adoption (PRs #60 `feat/ui-design-tokens`, #61 `refactor/ui-token-adoption`; umbrella #62 `feat/ui-foundation`)

**Changed:** re-coloured the app off greyscale onto a **teal (hue 200)** system in `app/globals.css`: real-chroma `:root` and `.dark` token sets, semantic `--success`/`--warning`, a validated categorical `--chart-1..5` ramp stepped separately per mode, an `@theme static` **motion** block (easing + duration tokens, with the default transition retimed to `--duration-fast` / `--ease-out-quart` so every existing bare `transition` inherited the snappier feel), per-mode **elevation** shadows, **lift/press geometry** tokens exposed as `@utility lift` / `press`, and a `prefers-reduced-motion` rule that flattens the geometry and blanket-resets transitions. Then adopted the tokens — charts onto `--chart-*` ([UI-08](#ui-08--analytics-charts-hardcode-tailwind-colours)) and the opaque modal backdrop onto `bg-black/50` ([UI-02](#ui-02--modal-backdrop-is-opaque-not-translucent)).

**Why:** every later change depends on a token layer existing — theming, hover elevation, motion, and reduced-motion all read these variables, so a change is one edit instead of twenty call sites.

**Tradeoffs / known limitations:** the chart ramp must be **re-validated with the dataviz script**, never eyeballed. `--chart-*` stays mapped through `@theme inline` (not plain `@theme`, which would bake the light values at build time and break dark mode).

**Follow-ups:** none blocking; the theming epic reuses this ramp per palette.

##### Issues encountered

**Motion tokens silently vanished when placed in `@theme inline`**
- **Description:** the easing/duration variables referenced from the hand-written interaction recipes resolved to nothing.
- **Root cause:** Tailwind only emits theme variables it sees used *in a utility class*. These are referenced only from raw CSS, so they were tree-shaken and never declared at `:root`.
- **Resolution:** moved them into an `@theme static` block, which emits unconditionally. A comment in `globals.css` records the rule; the same trap recurs for any token used only from hand-written CSS.

#### Primitives — form and interaction (PRs #63 `feat/ui-form-primitives`, #64 `refactor/ui-form-migration`, #65 `feat/ui-interaction-primitives`; umbrella #66 `feat/ui-primitives`)

**Changed:** added the `Input` / `Textarea` / `Label` primitives verbatim from the radix-nova registry (only the `cn` import path changed, so `npx shadcn add` stays viable), a **bespoke** `Field` render-prop wrapper that generates the `useId()` and wires `aria-describedby` / `aria-invalid`, and rebuilt `Button` so its base carries the `lift` / `press` recipes. Migrated every text/time/date input and textarea across the forms onto these primitives (uniform `focus-visible:ring-3`), gave inputs a hover shade (#6), sized the listing-description box to its placeholder and scroll-on-overflow (#10, `field-sizing-fixed rows={4}`), and made every `Button` lift on hover / depress on click (#9). Resolves [UI-07](#ui-07--hand-styled-buttons-instead-of-the-button-primitive).

**Why:** the ten requests were mostly consequences of having no shared primitives; building the primitives makes #6, #7, #9, and #10 fall out for free and uniformly.

**Tradeoffs / known limitations:** the registry `field` is a composition kit that leaves aria wiring to the caller, so `Field` is deliberately bespoke rather than registry-verbatim. The native `<input type="time|date">` sites were parked on the plain `Input` primitive here (for the consistent ring) and only became real pickers in the date/time epic.

**Follow-ups:** the itinerary `<select>` and several emoji/icon buttons stayed raw (see the workstream [Follow-ups](#follow-ups)).

#### Shared cards and listing polish (PRs #67 `refactor/listing-card-component`, #68 `feat/listing-card-hover`, #69 `feat/owner-listing-images`, #70 `feat/listing-detail-back-link`; umbrella #71 `feat/ui-listings`)

**Changed:** extracted one server `ListingCard` (cover image or placeholder, tags, optional whole-card link) consumed by both the explore feed and the owner home ([UI-05](#ui-05--listing-card-markup-duplicated-and-drifted)); gave cards the `lift` recipe with grid `gap-8` so the rise + shadow has room (#7); rendered owner cover images from `listing_images[0]` ordered by `display_order` (#8); and added a filter-preserving `BackLink` from a listing back to the feed (#5) plus the listing's tags as chips ([UI-04](#ui-04--tags-fetched-but-never-rendered-on-listing-detail)). Also fixed the dead `/auth/sign-in` redirect ([UI-03](#ui-03--redirect-to-a-non-existent-auth-route)).

**Why:** #5, #7, and #8 are the card/feed requests; folding the two card-related defects (UI-04, UI-05) into the same code keeps the change coherent.

**Tradeoffs / known limitations:** the detail page's back link rebuilds the feed query from `searchParams`, so a card's `href` now carries the current filters/page as a query string.

##### Issues encountered

**The card `href` change quietly depended on a substring E2E selector**
- **Description:** cards used to link to a bare `/tourist/explore/listings/:id`; carrying the feed query appended `?…` to every href.
- **Root cause:** the golden-path spec locates the first listing with `a[href*="/tourist/explore/listings/"]`.
- **Resolution:** none needed — the selector is a substring match, so it still matches with the query appended. Recorded because an exact-match selector would have broken silently.

#### Navigation and filter (PR #72 `feat/ui-navigation`)

**Changed:** extracted a shared `NavLink` that derives its own active state from `usePathname()` and sets `data-active`, consumed by both the desktop bar and the mobile sheet (#3); on hover/active the whole nav cell shades, the label scales up, and an accent underline on the nav's bottom border thickens. Extracted a shared `TagMultiSelect` ([UI-06](#ui-06--tag-multi-select-duplicated-cap-in-only-one-copy)) and wrapped the explore filters in a disclosure — a "Filters" toggle with an active-filter count badge, the URL still the source of truth, defaulting open when filters are already applied (#4).

**Why:** #3 and #4 are the nav/filter requests; the filter dedupe (UI-06) is a prerequisite for the toggle, so the extraction lands first and the toggle diff stays purely behavioural.

**Tradeoffs / known limitations:** the label uses `scale`, **not** `font-size` — font-size reflows neighbours; a transform doesn't. The nav's bottom border moved off the outer `<section>` so each desktop link stretches full-height and can anchor its underline to that line.

##### Issues encountered

**The active underline had to sit on the nav's bottom border, not under the text**
- **Description:** a naive per-link underline floats mid-cell, not on the divider line the design calls for.
- **Root cause:** the border lived on the outer section with padding between it and the links, so an underline anchored to the link couldn't reach it.
- **Resolution:** restructured the desktop nav into full-height cells (vertical padding on the row, not the section) so each link's `bottom-0` underline coincides with the section border. Verified structurally: the active link's underline renders at 3px / full-width, the inactive one at `scale-y-0` (0px).

#### Date and time fields (PR #73 `feat/ui-datetime`)

**Changed:** added the radix-nova `Popover` + `Calendar` primitives and built `DateField` (Popover + Calendar on pointer devices, native `<input type="date">` on touch), `TimeField` (a custom 15-minute option list; native `<input type="time">` on touch), and `TimeRangeField` (two `TimeField`s with an inline start-before-end error via the existing `isValidTimeRange`), then adopted them across all four native-input sites (#1). Values stay plain `YYYY-MM-DD` / 24h `HH:MM` strings with hidden-input mirrors for plain-form submission. No validation logic changed — the submit handlers and DB constraints stay authoritative.

**Why:** #1 is the "smoother date/time selectors" request; keeping the value shapes and validation identical means the swap is presentational.

**Tradeoffs / known limitations:** the desktop time picker snaps to 15-minute steps (odd stored values still display, and touch keeps full granularity via the native control). Dropping the native `required` attribute is safe only because the server action + DB re-validate.

##### Issues encountered

**`shadcn add calendar` wanted to overwrite our customised `Button`**
- **Description:** the CLI lists `button` as a registry dependency of `calendar` and blocked, non-interactively, on an "overwrite button.tsx?" prompt.
- **Root cause:** our `Button` diverges from the registry (it carries the bespoke `lift`/`press` base), and the CLI re-installs registry dependencies.
- **Resolution:** backed `button.tsx` up, ran `add calendar --overwrite`, restored the backup. General gotcha for any `shadcn add` whose registry item depends on a primitive we've diverged from.

**The global Button `lift` leaked into the calendar grid**
- **Description:** every calendar day/nav button hopped `-6px` on hover — reads as jitter in a dense grid.
- **Root cause:** calendar's day cells use our `Button` (and its nav buttons use `buttonVariants`), both of which carry `lift`.
- **Resolution:** flattened the geometry tokens for the popover subtree (`--lift-y: 0`, `--shadow-lifted: none` on `PopoverContent`) — the same mechanism reduced-motion uses; press feedback is left intact. Kept `calendar.tsx` registry-verbatim. (Also: `react-day-picker` installed as **v10**, not the planned v9; the generated component works against it. And the new `react-hooks/set-state-in-effect` lint rule rejected the obvious `matchMedia` mount hook, replaced with a `useSyncExternalStore` `useCoarsePointer`.)

#### Theme modes and palettes (PR #74 `feat/ui-theming`)

**Changed:** added a two-axis appearance system (#2) — **next-themes** for light/dark/system (`attribute="class"`, blocking script, `suppressHydrationWarning`) and an orthogonal **cookie-backed `data-palette`** on `<html>`, read server-side in the root layout so it never flashes and works without JS. Shipped **Teal** (default), **Sunset**, and **Grape** for both modes, each a full token block re-validating its `--chart-*` ramp; added the theme + palette switcher to the nav account dropdown and the settings page, and E2E covering selection and persistence.

**Why:** #2 is the "add theme options" request; the palette axis is cookie-backed rather than class-based so the server can render the right colours on the first byte.

**Tradeoffs / known limitations:** each palette is the default's structure with the brand hue rotated and neutrals re-traced; status colours (destructive/success/warning) and elevation are inherited, so they stay consistent. `@theme inline` is required for the chart mapping (plain `@theme` bakes light values and breaks dark mode).

##### Issues encountered

**Chart ramps per palette without hand-picking twenty colours**
- **Description:** each palette needs its own validated `--chart-1..5` for both modes.
- **Root cause:** re-tinting a ramp risks failing the CVD / normal-vision / contrast checks the dataviz validator enforces.
- **Resolution:** rotated the whole validated default ramp by each palette's brand-hue delta (preserving the relative hue spacing the CVD checks depend on; L/C unchanged preserves contrast), then fixed only the two or three slots gamut-clipping pushed out of the lightness band or under 3:1. Re-ran `validate_palette.js` for every palette × mode until clean.

**Palette cascade specificity**
- **Description:** two axes coexist on `<html>` — next-themes' `.dark` class and `data-palette`.
- **Root cause:** the light block `[data-palette=X]` (0,1,0) must beat `:root`, and the dark block `.dark[data-palette=X]` (0,2,0) must out-rank both `.dark` and the light block.
- **Resolution:** ordered the light blocks after `:root` and made each palette set the **full** colour set in both blocks, so nothing leaks between modes.

**Stale CSS during verification**
- **Description:** after editing `globals.css`, the running dev server served the new components but the *old* CSS — the `[data-palette]` rules were simply absent from `document.styleSheets`.
- **Root cause:** the dev server's CSS had not recompiled (Turbopack CSS cache); the JS had.
- **Resolution:** a dev-server restart forced a clean compile. When a token change "doesn't apply," confirm the served stylesheet contains the rule before debugging specificity. (Also: the `set-state-in-effect` rule bit the theme mount-gate again — extracted a `useSyncExternalStore` `useMounted` hook; and the E2E runs as the onboarded seeded owner because the tourist test user is reset to unonboarded and trapped in the quiz.)

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
| Hand-rolled modals | Two modals (`AddToItineraryButton`, the itinerary AI-schedule modal) bypass the existing `alert-dialog` + `ConfirmProvider` infrastructure, so they have no focus trap, Escape handling, scroll lock, or transitions |
| Itinerary `<select>` has no primitive | The "select itinerary" dropdown in `AddToItineraryButton` is a raw `<select>`; there is no `Select` primitive, so its focus ring differs from the `Input`/`TagMultiSelect` controls |
| Desktop time picker granularity | The custom `TimeField` snaps to 15-minute steps on pointer devices; owners wanting an off-grid opening time must rely on the native (touch) control |
| Reduced-motion audit | The overhaul added the global `prefers-reduced-motion` rule (flattens the lift/press tokens + blanket-resets transitions), which covers the token-driven and utility transforms; any *future* inline transform should still be checked against it |

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
