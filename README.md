# TourIt

A two-sided tourism discovery platform connecting **tourists** with **local business owners**. Tourists discover personalised listings through an interest-based recommendation feed, build map-based itineraries, and generate AI-optimised schedules. Business owners create attraction listings — with photos and a map location — and track their reach through an analytics dashboard.

Built with **Next.js 16** (App Router), **React 19**, **Supabase** (PostgreSQL + Auth + Storage), **Tailwind CSS v4**, **shadcn/ui**, **Leaflet** (OpenStreetMap), and **Google Gemini AI**.

---

## Features

**Tourist**
- **Google OAuth** login via Supabase Auth
- **Preference quiz** — swipe UI to pick interest tags
- **Personalised explore feed** — ranked by TF-IDF cosine similarity between your tags and each listing's, via a Postgres RPC; with tag + opening-hours filters, cover photos, and pagination
- **Listing detail** — swipeable photo gallery, opening hours and tags, and one-tap *Add to Itinerary*
- **Itineraries** — create, view, and delete trip plans; add listings with date/time scheduling and overlap validation, and see each day's stops on a map
- **AI schedule generation** — Gemini optimises a day-by-day schedule from unscheduled stops, respecting opening hours and travel time

**Business owner**
- **Listing management** — create, edit, and delete listings (name, description, address, opening hours, and tags)
- **Photos** — upload a per-listing image gallery, sent directly to Supabase Storage and served through the Next.js image optimiser
- **Map location** — pin each listing's location on an interactive map
- **Analytics dashboard** — per-listing and portfolio stats (unique visitors, saves, save rate) with period-over-period deltas, a views/saves trend chart, a top-tags audience panel, an AI-written performance summary, and CSV export

**Shared**
- **Role-based routing** — middleware keeps tourists and owners in their own sections
- **Responsive navigation** with a role-aware menu, an active-route indicator, and an avatar dropdown
- **Profile & settings** — review your role, revisit or retake your interests (tourists), and switch theme + palette
- **Themeable UI** — light / dark / system modes plus switchable colour palettes, remembered across sessions and applied server-side (no flash)
- **Standardised feedback UI** — one toast system and one reusable confirmation dialog across the app
- **Shared UI primitives** — buttons, inputs, cards, tag picker, and date/time fields as single components, with consistent hover/press motion (and `prefers-reduced-motion` support)

## Quickstart

Prerequisites: **Node.js 20+** and **Docker Desktop**.

```bash
git clone https://github.com/liewzewei/TourIt.git && cd TourIt
npm install                                            # also installs git hooks
npx supabase start                                     # local Supabase (Docker) — first run pulls images
npx supabase db reset                                  # apply migrations + seed data
cp .env.development.local.example .env.development.local
# paste the keys printed by `npx supabase status` into that file
npm run dev
```

Open <http://localhost:3000> and sign in with the **"Log in as Tourist / Business Owner"** quick-login buttons (Google OAuth isn't needed locally).

The full walkthrough — env variables, seed accounts, remote development, and troubleshooting — is in **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

## Documentation

| Doc | What's in it |
|---|---|
| **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** | Local + remote setup, environment variables, seed data, logging in, troubleshooting |
| **[docs/TESTING.md](docs/TESTING.md)** | Unit + E2E tests, git hooks, the CI/CD pipeline |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Rendering model, project structure, database schema, routing, engineering practices |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Branch + commit conventions, pull requests, the migration→deploy flow |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run test:unit` | Jest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests (auto-installs the browser) |

## License

For educational purposes as part of the NUS Orbital programme.
