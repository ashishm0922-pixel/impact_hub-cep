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

> **No Atlas yet?** Run `npm run dev:local`. It starts a local MongoDB for you (data saved in `backend/.local-mongo/`). Good for trying things out; use Atlas for real data. This mode **never sends real emails**: verification links are printed in the terminal.

## 2. Admin account

- The admin is created **automatically on first start** from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `backend/.env`.
- A strong random password was generated for you in `backend/.env` (open the file to see it). **Keep the password in double quotes**, because a `#` without quotes starts a comment.
- Admin panel: <http://localhost:4000/pages/admin.html>
- **Change the password:** edit `ADMIN_PASSWORD` in `.env`, then run `npm run admin:create -- --reset` (this also logs the admin out everywhere).
- If `.env` and the database disagree, the server prints a warning on startup.

## 3. How authentication works

```
Sign up (name, email, 10-digit mobile, role, password)
   ├─► account is active right away              → the site switches to the Login tab
   └─► a one-time verification link is emailed   (valid 24 h)
Log in (email OR mobile + password)               → works immediately; a banner asks to verify
Click the link in the email                       → pages/verify-email.html → "Email verified!"
Admin panel → Suspend (reason required)           → logged out everywhere, cannot log in
```

- Unverified users can log in and browse, but API actions such as joining a drive answer `403 EMAIL_NOT_VERIFIED`.
- Each verification link works **once**; asking for a new one ("Resend email") makes the old link invalid.
- Optional: `REQUIRE_ADMIN_APPROVAL=true` in `.env` means every new account must **also** be approved in the admin panel before it can log in.

### Sending real emails
Without SMTP settings, the verification email is **printed in the terminal** where the server runs (copy the link from there).
To really send emails with Gmail:
1. Turn on **2-Step Verification** for your Google account.
2. Create an **App password** at <https://myaccount.google.com/apppasswords> (16 letters).
3. In `backend/.env`, uncomment and fill in:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASS="your-16-letter-app-password"
   MAIL_FROM="HopeConnect <yourname@gmail.com>"
   ```
4. Test it: `npm run email:test` (sends one test email to yourself and explains any error).
5. Restart the server. When you deploy, also set `APP_URL` to your website address so the links point there.

| Protection | How |
|---|---|
| Passwords | Hashed with **scrypt** (built into Node), random salt; never stored, returned or logged in plain text |
| Sessions | Random 256-bit token in an **httpOnly, SameSite=Lax** cookie (JavaScript can't read it); only its SHA-256 hash is stored in MongoDB; expires automatically (TTL index) |
| Logout | Deletes the session from the database, so the old cookie stops working |
| Admin vs user | Separate collections, cookies and sessions; the admin cookie is only sent to `/api/admin/*` |
| Brute force | 10 failed logins per IP per 15 min (`LOGIN_RATE_LIMIT`); 20 sign-ups per IP per hour |
| Account probing | Wrong password and unknown account give the **same** message and take the same time; the account status is only revealed after a correct password |
| Email links | 256-bit one-time token, only its hash stored, expires in 24 h (TTL), sent via POST from the page so email scanners can't use it up; token removed from the address bar |
| CSRF | SameSite cookies + Origin check + JSON-only bodies |
| Session fixation | Logging in always replaces the old session |
| Validation | Same rules in the browser and the server (zod); mobile must be exactly 10 digits starting with 6–9 |
| Headers | helmet (CSP, no framing, etc.) |
| Duplicates | Unique indexes on email, phone and username, plus a friendly per-field message |



## 4. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload, using `MONGODB_URI` (Atlas) |
| `npm run dev:local` | Start with a local MongoDB (no Atlas needed) |
| `npm run email:test` | Send one test email with the SMTP settings in `.env` |
| `npm run db:check` | Test the MongoDB connection in `.env` (shows database + collections) |
| `npm run admin:create` | Create the admin from `.env` (`-- --reset` to change its password) |
| `npm run seed` | Add sample NGOs, drives and campaigns (only if the database has no NGOs; also done automatically at start-up) |
| `npm test` | 80 automated tests (uses a temporary in-memory MongoDB) |
| `npm run typecheck` | TypeScript check |
| `npm run build` / `npm start` | Compile to `dist/` and run in production |

## 5. API

**Rule:** anything that creates or joins something needs a logged-in account. Visitors can only browse.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/health` | anyone | `{ status, database }` |
| GET | `/api/catalog` | anyone | NGOs, drives and campaigns of verified NGOs |
| GET | `/api/leaderboard?type=volunteers\|donors` | anyone | public; "First L." names only, anonymous users hidden, no emails |
| POST | `/api/auth/signup` | anyone | `{ name, email, phone, role, password, confirmPassword }` → account + verification email |
| POST | `/api/auth/login` | anyone | `{ identifier: email or 10-digit mobile, password }` → sets cookie |
| POST | `/api/auth/logout` | anyone | ends the session |
| GET | `/api/auth/session` | anyone | `{ user }` or `{ user: null }` (always 200) |
| POST | `/api/auth/verify-email` | anyone | `{ token }` from the email link |
| POST | `/api/auth/resend-verification` | user | new link (3 per 15 min) |
| GET | `/api/me/activity` | user | my drive registrations and pledges |
| PATCH | `/api/me/profile` | user | `{ name, city, anonymous }` (email/phone are login details and can't change) |
| POST | `/api/opportunities/:id/registrations` | verified volunteer/donor | join a drive (uses the account's name/email/phone) |
| POST | `/api/me/registrations/:id/cancel` | user | cancel my sign-up |
| POST | `/api/campaigns/:id/pledges` | verified user | **demo** pledge, no money is charged |
| POST | `/api/reports` | user | flag an NGO, campaign or drive for admin review |
| POST | `/api/contact` | anyone | contact message |
| GET | `/api/ngo/console` | NGO | my organization, drives, campaigns, **participants** and supporters |
| POST | `/api/ngo/organization` | NGO | register / resubmit the organization (starts as `pending`) |
| POST/PATCH/DELETE | `/api/ngo/opportunities` | verified NGO | publish / close / delete drives |
| POST/PATCH/DELETE | `/api/ngo/campaigns` | verified NGO | publish / close / delete campaigns |
| PATCH | `/api/ngo/registrations/:id` | verified NGO | mark Attended / No-show / Cancelled (on or after the event day) |
| POST | `/api/admin/auth/login` | anyone | `{ username, password }` |
| GET | `/api/admin/overview` | admin | dashboard numbers |
| GET/PATCH | `/api/admin/ngos`, `/api/admin/ngos/:id/status` | admin | verification queue; reject needs a reason |
| GET/PATCH | `/api/admin/users`, `/api/admin/users/:id/status` | admin | suspending/rejecting needs a reason **and the admin password again** |
| GET | `/api/admin/audit-logs` (+ `/export`) | admin | search, filter, CSV export (formula-safe) |
| GET | `/api/admin/leaderboard?type=volunteers\|donors\|ngos` | admin | full rows incl. email |
| GET/PATCH | `/api/admin/reports`, `/api/admin/reports/:id` | admin | flagged content: dismiss or take down |
| POST | `/api/campaigns/:id/donations` | – | `501`: real payments are not connected yet (on purpose) |

Errors always look like `{ "error": "message", "code": "MACHINE_CODE", "fields": [{ "field": "phone", "message": "..." }] }`.

### Tiers and points (same numbers in `frontend/assets/js/core/constants.js`)
| | Points | Bronze | Silver | Gold | Platinum |
|---|---|---|---|---|---|
| Volunteers | 10 per **confirmed** hour | 0 h | 15 h | 35 h | 70 h |
| Donors | 1 per ₹100 pledged | < ₹2,500 | ₹2,500 | ₹10,000 | ₹50,000 |

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
│   │   ├── auth/              sign-up, login, logout, sessions, email verification
│   │   ├── admin/             admin login, user approval
│   │   └── health/ ngos/ opportunities/ campaigns/ contact/
│   ├── shared/schemas.ts      Shared validation (name, email, phone, password...)
│   ├── utils/                 password hashing, tokens, mailer, HttpError
│   └── scripts/               create-admin, seed, dev-local
├── tests/                     auth + email-verification tests (in-memory MongoDB)
├── .env.example               Template — copy to .env
└── tsconfig.json / tsconfig.build.json
```

## 7. Deploying (later)
- Set `NODE_ENV=production` (cookies become HTTPS-only), `TRUST_PROXY=true` behind Render/Railway/Nginx.
- Put the same variables from `.env` into your host's environment settings (never commit `.env`).
- In Atlas → Network Access, allow your host's outgoing IP addresses.
