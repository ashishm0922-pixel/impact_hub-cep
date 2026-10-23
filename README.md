# HopeConnect AI

A platform that connects **volunteers**, **donors** and **NGOs**: discover verified NGOs, join volunteer drives, support campaigns, and track your impact.

> **Status: working demo frontend + backend foundation.**
> The website runs fully in the browser and saves data in `localStorage`.
> **No real payments, emails or logins happen.** Simulated features are labelled "demo" in the UI.

---

## Folder structure

```
hopeconnect-ai/
├── README.md                  ← you are here
├── package.json               ← root shortcuts (npm start, npm run start:local, npm test, ...)
├── .editorconfig / .gitignore
│
├── frontend/                  ← the website (plain HTML/CSS/JS, no build step)
│   ├── index.html             ← home page
│   ├── pages/                 ← every other page
│   │   ├── volunteer.html     ← volunteer drives: search, filters, sign-up
│   │   ├── campaigns.html     ← campaigns + demo donations
│   │   ├── ngos.html          ← NGO directory + profiles
│   │   ├── impact.html        ← your hours, donations, badges, certificate
│   │   ├── dashboard.html     ← organizer portal
│   │   ├── admin.html         ← admin panel: users, verification status, suspend
│   │   ├── verify-email.html  ← opened from the link in the verification email
│   │   ├── about.html
│   │   └── contact.html       ← contact form + NGO registration
│   └── assets/
│       ├── css/
│       │   ├── style.css      ← design tokens + all components
│       │   └── responsive.css ← tablet / phone layouts
│       └── js/
│           ├── core/          ← loaded on EVERY page, in this order:
│           │   ├── seed-data.js  ← demo data + date helpers
│           │   ├── store.js      ← data layer (localStorage) + calculated stats
│           │   ├── app.js        ← shared helpers: escaping, validation, API calls, toasts, modals
│           │   ├── auth.js       ← login / sign-up modal + logged-in header
│           │   └── router.js     ← no-reload navigation between pages
│           ├── features/      ← reusable widgets
│           │   ├── matcher.js            ← rule-based cause matcher (home)
│           │   ├── impact-calculator.js  ← "what ₹X delivers" (home, campaigns)
│           │   └── certificate.js        ← canvas certificate (impact)
│           └── pages/         ← one script per page
│               ├── home.js, volunteer.js, campaigns.js, ngos.js
│               ├── contact.js, impact.js, organizer.js, admin.js, verify-email.js
│
├── backend/                   ← API + serves the website: Express + TypeScript + MongoDB Atlas
│   ├── src/
│   │   ├── server.ts / app.ts ← start-up and Express app
│   │   ├── config/            ← environment variables (one place)
│   │   ├── db/                ← MongoDB connection
│   │   ├── models/            ← Mongoose models (user, admin, session, ngo, ...)
│   │   ├── middlewares/       ← auth guards, security (CSRF, rate limits), errors
│   │   ├── modules/           ← one folder per feature: auth/ admin/ ngos/ opportunities/ ...
│   │   ├── shared/ utils/     ← validation rules, password hashing, tokens
│   │   └── scripts/           ← create-admin, seed, dev-local
│   ├── tests/                 ← 57 auth/API tests (in-memory MongoDB)
│   └── .env.example           ← copy to .env (MongoDB Atlas URI, admin login)
│
├── docs/
│   ├── ARCHITECTURE.md        ← how the pieces fit together + how to add things
│   └── ROADMAP.md             ← what to build next
│
├── scripts/
│   └── serve-frontend.mjs     ← zero-dependency static server for frontend/
│
└── archive/
    └── original-prototype.zip ← untouched copy of the first prototype
```

## Quick start

Needs **Node.js 20+**.

```bash
npm run backend:install
```

Then **either** connect MongoDB Atlas (see [backend/README.md](backend/README.md#1-connect-mongodb-atlas-one-time-5-minutes)) and run:

```bash
npm start
```

**or**, to try it without Atlas (a local MongoDB is started for you):

```bash
npm run start:local
```

Open <http://localhost:4000>. The admin panel is at <http://localhost:4000/pages/admin.html>: username `admin`, and the password is in `backend/.env`.

Run the tests:

```bash
npm test
```

## Accounts & email verification
1. **Sign up** (header → *Sign up*): full name, email, 10-digit mobile number (6–9 first), role and password.
2. The site switches to **Login** with your email filled in. **Log in right away** (email or mobile + password).
3. A **verification link** is emailed (or printed in the server terminal until email is set up, see [backend/README.md](backend/README.md#sending-real-emails)).
4. Click it → **Email verified!** The "Please verify your email" banner disappears.
5. The **admin panel** (`/pages/admin.html`) shows every user and whether they're verified, and can suspend accounts.
   Set `REQUIRE_ADMIN_APPROVAL=true` in `backend/.env` if admins should also approve every new account.

## Try the main journeys
1. **Volunteer:** Volunteer → search "pune tree" → *Join Opportunity* → invalid name/email/phone is rejected → registered.
2. **Organizer:** Organizer Portal → *New Drive* (date = today) → join it on the Volunteer page → mark **Attended** in the portal → hours appear on **Impact**.
3. **Donor:** Campaigns → *Support This Cause* → demo donation → receipt says "Not charged (demo)".
4. **Matcher:** Home → pick causes, city, skills → each result explains **why** it matched.
5. **Certificate:** Impact → *Download* (only once you have attended hours).

Use **Reset demo data** in any page footer to start over.

## What is simulated vs real
| Feature | Status |
|---|---|
| Search, filters, registration, organizer tools | ✅ Working, but data is still in browser storage (demo) |
| Recommendations | ✅ Transparent rule-based scoring (not machine learning) |
| Donations | ⚠️ Demo only: no payment provider, no money moves |
| Sign-up / login / email verification / admin panel | ✅ Real (MongoDB, hashed passwords, secure sessions; emails need SMTP settings) |
| Contact form | ⚠️ Saved in browser; no email is sent |
| NGO verification | ⚠️ New NGOs stay "Pending"; no admin review yet |
| Certificates | ⚠️ Generated in-browser; not independently verifiable |

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Next steps: [docs/ROADMAP.md](docs/ROADMAP.md)
