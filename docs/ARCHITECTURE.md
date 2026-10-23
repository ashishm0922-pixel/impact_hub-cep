# Architecture

## Big picture

```
 Browser                                          Server (backend/, port 4000)
┌──────────────────────────────────┐            ┌─────────────────────────────────────┐
│ frontend/  (served by the backend)│            │ Express                             │
│  core/auth.js ── login/sign-up ───┼── /api ───▶│  modules/auth, modules/admin ──┐    │
│  pages/admin.js ── approvals ─────┼── /api ───▶│                                 ▼    │
│                                   │  cookie    │                      MongoDB Atlas  │
│  pages/<page>.js                  │ (httpOnly) │   users · admins · sessions · ...   │
│   └─ core/store.js ─ localStorage │            └─────────────────────────────────────┘
└──────────────────────────────────┘
```

- **Accounts, login and admin approval are real**: stored in MongoDB, checked on the server.
- **Drives, campaigns and donations are still demo data** in `localStorage` (`core/store.js`).
  Moving them to the API is the next step; only `store.js` has to change.

## Authentication (read this before changing anything in auth)

| Piece | File |
|---|---|
| Validation rules (server) | `backend/src/shared/schemas.ts`, `modules/auth/auth.schemas.ts` |
| Validation rules (browser, same messages) | `frontend/assets/js/core/app.js` → `HC.validators` |
| Sign-up / login logic | `backend/src/modules/auth/auth.service.ts` |
| Sessions + cookies | `backend/src/modules/auth/session.service.ts` |
| Route guards | `backend/src/middlewares/auth.ts` (`requireUser`, `requireAdmin`) |
| Admin approval | `backend/src/modules/admin/` + `frontend/pages/admin.html` |
| Login UI | `frontend/assets/js/core/auth.js` |

Rules:
1. Never return or log `passwordHash` (the model hides it with `select: false`).
2. Login errors stay generic ("Incorrect email/mobile number or password.").
3. Protect a route with `requireUser` / `requireAdmin`; never trust a user id sent by the browser.
4. If you change a validation rule, change it in **both** places and add a test in `backend/tests/auth.test.ts`.

## Frontend

### Script load order (every page)
1. `core/seed-data.js`: demo data and date helpers (no logic).
2. `core/store.js`: `window.HCStore`, the only code that touches `localStorage`.
3. `core/app.js`: `window.HC` helpers (`HC.api` for server calls) plus the navbar, toasts and modals.
4. `core/auth.js`: the login/sign-up modal and the header's logged-in state (`window.Auth.user`).
5. `features/*.js`: widgets the page uses (matcher, calculator, certificate).
6. `pages/<page>.js`: the code for that one page.

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
2. Link CSS as `../assets/css/style.css?v=4` and `../assets/css/responsive.css?v=4`.
3. Add the four `core/` scripts, then `../assets/js/pages/my-page.js`.
4. Add a nav link `<li><a href="my-page.html">My Page</a></li>` to every page (and `pages/my-page.html` in `index.html`).

### Cache busting
Asset URLs end in `?v=4`. When you change CSS/JS that is already deployed, bump the number in the HTML so browsers fetch the new file.

## Backend

### Request flow
```
request → helmet / cors / json / cookies     (app.ts)
        → CSRF check                         (middlewares/security.ts)
        → /api router                        (routes/index.ts)
        → requireDb → module router          (modules/<feature>/<feature>.routes.ts)
             ├─ requireUser / requireAdmin   (middlewares/auth.ts) when login is needed
             ├─ validate input with zod      (<feature>.schemas.ts)
             └─ read/write MongoDB           (models/*.model.ts)
        → errors → middlewares/error-handler.ts → { error, code, fields }
```

### Adding a new module (example: `badges`)
1. `src/models/badge.model.ts`: the Mongoose model. `src/modules/badges/badges.schemas.ts`: zod schemas for request bodies/queries.
2. `src/modules/badges/badges.routes.ts`: `export const badgeRoutes = Router();` plus its handlers.
3. Mount it in `src/routes/index.ts`: `api.use('/badges', badgeRoutes);`
4. Add tests in `backend/tests/`.

### Conventions
- Money is stored as **integer paise** (`amountPaise`), never floats.
- A donation counts as raised only when its status is `succeeded`, which only a verified payment-provider webhook may set.
- New NGOs and new user accounts always start as `pending`.
- Environment variables are read only in `src/config/env.ts`.
