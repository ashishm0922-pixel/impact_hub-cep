# HopeConnect API (backend)

Node.js + Express 5 + TypeScript + **MongoDB Atlas** (Mongoose).

The backend also **serves the website** (`../frontend`), so after `npm run dev` everything is at one address: <http://localhost:4000>.

---

## 1. Connect MongoDB Atlas (one-time, ~5 minutes)

1. Sign in at <https://cloud.mongodb.com> and create a **free M0 cluster**.
2. **Database Access** → *Add New Database User* → username + password → role **Read and write to any database**.
3. **Network Access** → *Add IP Address* → *Add Current IP Address* (for deployment, add your host's IPs).
4. **Clusters** → *Connect* → *Drivers* → copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Open `backend/.env` and paste it as `MONGODB_URI`, adding the database name **`hopeconnect`** before the `?`:
   ```
   MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/hopeconnect?retryWrites=true&w=majority
   ```
   If your Atlas password contains special characters (`@ : / ? # [ ]`), URL-encode them (e.g. `@` → `%40`).

Then:
```bash
cd backend
npm install
npm run dev
```
You should see `Connected to MongoDB.` and `Admin account "admin" created.`

**Check the connection any time:** `npm run db:check` → `✔ Connected to MongoDB ... Database: hopeconnect`.

> **Error `querySrv ECONNREFUSED`?** Your network/VPN/antivirus blocks the DNS lookup Atlas needs. The app automatically retries with public DNS; to force it, add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `.env`.
>
> **Error `bad auth`?** The username/password in `MONGODB_URI` is wrong. Most often `<db_password>` was left in instead of the real password.

> **No Atlas yet?** Run `npm run dev:local`. It starts a local MongoDB for you (data saved in `backend/.local-mongo/`). Good for trying things out; use Atlas for real data.

## 2. Admin account

- The admin is created **automatically on first start** from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `backend/.env`.
- A strong random password was generated for you in `backend/.env` (open the file to see it). **Keep the password in double quotes**, because a `#` without quotes starts a comment.
- Admin panel: <http://localhost:4000/pages/admin.html>
- **Change the password:** edit `ADMIN_PASSWORD` in `.env`, then run `npm run admin:create -- --reset` (this also logs the admin out everywhere).
- If `.env` and the database disagree, the server prints a warning on startup.

## 3. How authentication works

```
Sign up (name, email, 10-digit mobile, role, password)
   └─► account saved with status "pending"         ← cannot log in yet
Admin panel → Approve
   └─► status "approved"                          ← can log in (email OR mobile + password)
Admin → Reject / Suspend (reason required)
   └─► cannot log in; suspended users are logged out of every device immediately
```

| Protection | How |
|---|---|
| Passwords | Hashed with **scrypt** (built into Node), random salt; never stored, returned or logged in plain text |
| Sessions | Random 256-bit token in an **httpOnly, SameSite=Lax** cookie (JavaScript can't read it); only its SHA-256 hash is stored in MongoDB; expires automatically (TTL index) |
| Logout | Deletes the session from the database, so the old cookie stops working |
| Admin vs user | Separate collections, cookies and sessions; the admin cookie is only sent to `/api/admin/*` |
| Brute force | 10 failed logins per IP per 15 min (`LOGIN_RATE_LIMIT`); 20 sign-ups per IP per hour |
| Account probing | Wrong password and unknown account give the **same** message and take the same time; the account status is only revealed after a correct password |
| CSRF | SameSite cookies + Origin check + JSON-only bodies |
| Session fixation | Logging in always replaces the old session |
| Validation | Same rules in the browser and the server (zod); mobile must be exactly 10 digits starting with 6–9 |
| Headers | helmet (CSP, no framing, etc.) |
| Duplicates | Unique indexes on email, phone and username, plus a friendly per-field message |

Set `AUTO_APPROVE_USERS=true` in `.env` only if you ever want sign-ups to be approved automatically.

## 4. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload, using `MONGODB_URI` (Atlas) |
| `npm run dev:local` | Start with a local MongoDB (no Atlas needed) |
| `npm run db:check` | Test the MongoDB connection in `.env` (shows database + collections) |
| `npm run admin:create` | Create the admin from `.env` (`-- --reset` to change its password) |
| `npm run seed` | Add sample NGOs, drives and a campaign |
| `npm test` | 43 automated tests (uses a temporary in-memory MongoDB) |
| `npm run typecheck` | TypeScript check |
| `npm run build` / `npm start` | Compile to `dist/` and run in production |

## 5. API

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/health` | anyone | `{ status, database }` |
| POST | `/api/auth/signup` | anyone | `{ name, email, phone, role, password, confirmPassword }` → pending account |
| POST | `/api/auth/login` | anyone | `{ identifier: email or mobile, password }` → sets cookie |
| POST | `/api/auth/logout` | anyone | ends the session |
| GET | `/api/auth/session` | anyone | `{ user }` or `{ user: null }` (always 200) |
| GET | `/api/auth/me` | user | 401 if not logged in |
| POST | `/api/admin/auth/login` | anyone | `{ username, password }` |
| POST | `/api/admin/auth/logout` | admin | |
| GET | `/api/admin/auth/me` | admin | |
| GET | `/api/admin/users?status=&search=&page=` | admin | list + counts per status |
| PATCH | `/api/admin/users/:id/status` | admin | `{ status: approved/rejected/suspended, reason }` |
| GET | `/api/ngos`, `/api/opportunities`, `/api/campaigns` | anyone | listings |
| POST | `/api/ngos` | anyone | NGO application → `pending` |
| POST | `/api/opportunities/:id/registrations` | user | uses the account's name/email/phone |
| POST | `/api/campaigns/:id/donations` | – | `501`: payments not connected yet (on purpose) |
| POST | `/api/contact` | anyone | contact message |

Errors always look like `{ "error": "message", "code": "MACHINE_CODE", "fields": [{ "field": "phone", "message": "..." }] }`.

## 6. Folder layout
```
backend/
├── src/
│   ├── server.ts              Loads .env, connects to MongoDB, creates the admin, starts the server
│   ├── app.ts                 Express app: security headers, CORS, cookies, routes, website files
│   ├── config/env.ts          Every environment variable, read in one place
│   ├── db/connect.ts          MongoDB connection (with helpful error messages)
│   ├── models/                Mongoose models: user, admin, session, ngo, opportunity, campaign, contact
│   ├── middlewares/
│   │   ├── auth.ts            requireUser / requireAdmin / getSessionUser
│   │   ├── security.ts        CSRF check, rate limits, "database connected" check
│   │   └── error-handler.ts   404 + one JSON error format
│   ├── modules/               One folder per feature (routes + validation + service)
│   │   ├── auth/              sign-up, login, logout, sessions
│   │   ├── admin/             admin login, user approval
│   │   └── health/ ngos/ opportunities/ campaigns/ contact/
│   ├── shared/schemas.ts      Shared validation (name, email, phone, password...)
│   ├── utils/                 password hashing, tokens, HttpError
│   └── scripts/               create-admin, seed, dev-local
├── tests/                     auth.test.ts + helpers (in-memory MongoDB)
├── .env.example               Template — copy to .env
└── tsconfig.json / tsconfig.build.json
```

## 7. Deploying (later)
- Set `NODE_ENV=production` (cookies become HTTPS-only), `TRUST_PROXY=true` behind Render/Railway/Nginx.
- Put the same variables from `.env` into your host's environment settings (never commit `.env`).
- In Atlas → Network Access, allow your host's outgoing IP addresses.
