# Architecture

## Big picture

```
 Browser                                   Server (not connected yet)
┌─────────────────────────────┐           ┌──────────────────────────────┐
│ frontend/                   │           │ backend/                     │
│  HTML page                  │           │  Express routes (/api/...)   │
│   └─ pages/<page>.js        │  later →  │   └─ modules/<feature>/      │
│       └─ core/store.js ─────┼── fetch ──┼──▶ Prisma ──▶ PostgreSQL    │
│           └─ localStorage   │           │                              │
└─────────────────────────────┘           └──────────────────────────────┘
```

Today every page talks to `core/store.js`, which reads and writes `localStorage`.
When the backend is ready, only `store.js` has to change (to call the API); the pages stay the same.

## Frontend

### Script load order (every page)
1. `core/seed-data.js`: demo data and date helpers (no logic).
2. `core/store.js`: `window.HCStore`, the only code that touches `localStorage`.
3. `core/app.js`: `window.HC` helpers plus the navbar, toasts, modals and demo profile.
4. `features/*.js`: widgets the page uses (matcher, calculator, certificate).
5. `pages/<page>.js`: the code for that one page.

These are plain `<script>` tags (no bundler), so **order matters**: later files use globals from earlier ones.

### Rules the code follows
| Rule | Where |
|---|---|
| Never put raw user text into `innerHTML`; wrap it in `HC.escape()` | every renderer |
| Image/website URLs go through `HC.safeUrl()` (only http/https) | cards, profiles |
| Links between pages use `HC.page('file.html', params)` so they work from `index.html` **and** `pages/` | JS-generated links |
| Store raw records, **calculate** totals (hours, ₹, badges) | `HCStore.getUserStats()` |
| Hours count only after the organizer marks **Attended** (on/after the event date) | `setRegistrationStatus()` |
| Forms validate with `HC.validateFields()` and show the error under the field | all forms |
| Anything simulated is labelled "demo" in the UI | donations, profile, certificate |

### Adding a new page
1. Create `frontend/pages/my-page.html` (copy the header/footer from another page).
2. Link CSS as `../assets/css/style.css?v=3` and `../assets/css/responsive.css?v=3`.
3. Add the three `core/` scripts, then `../assets/js/pages/my-page.js`.
4. Add a nav link `<li><a href="my-page.html">My Page</a></li>` to every page (and `pages/my-page.html` in `index.html`).

### Cache busting
Asset URLs end in `?v=3`. When you change CSS/JS that is already deployed, bump the number in the HTML so browsers fetch the new file.

## Backend

### Request flow
```
request → helmet / cors / json  (app.ts)
        → /api router            (routes/index.ts)
        → module router          (modules/<feature>/<feature>.routes.ts)
             ├─ validate input with zod   (<feature>.schemas.ts)
             └─ query the DB via requireDb() (lib/prisma.ts)
        → errors → middlewares/error-handler.ts → JSON { error, details }
```

### Adding a new module (example: `badges`)
1. `src/modules/badges/badges.schemas.ts`: zod schemas for request bodies/queries.
2. `src/modules/badges/badges.routes.ts`: `export const badgeRoutes = Router();` plus its handlers.
3. Mount it in `src/routes/index.ts`: `apiRouter.use('/badges', badgeRoutes);`
4. Add tests in `backend/tests/`.

### Conventions
- Money is stored as **integer paise** (`amountPaise`), never floats.
- A donation counts as raised only when its status is `SUCCEEDED`, which only a verified payment-provider webhook may set.
- New NGOs are always `PENDING_VERIFICATION`.
- Environment variables are read only in `src/config/env.ts`.
