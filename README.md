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
├── package.json               ← root shortcuts (npm run frontend, npm run backend:dev, ...)
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
│           │   └── app.js        ← shared helpers: escaping, validation, links, toasts, modals
│           ├── features/      ← reusable widgets
│           │   ├── matcher.js            ← rule-based cause matcher (home)
│           │   ├── impact-calculator.js  ← "what ₹X delivers" (home, campaigns)
│           │   └── certificate.js        ← canvas certificate (impact)
│           └── pages/         ← one script per page
│               ├── home.js, volunteer.js, campaigns.js, ngos.js
│               ├── contact.js, impact.js, organizer.js
│
├── backend/                   ← REST API: Express + TypeScript + Prisma (PostgreSQL)
│   ├── prisma/                ← schema.prisma (tables) + seed.ts
│   ├── src/
│   │   ├── server.ts          ← starts the server
│   │   ├── app.ts             ← builds the Express app
│   │   ├── config/            ← environment variables (one place)
│   │   ├── lib/               ← Prisma client
│   │   ├── middlewares/       ← 404 + error handler
│   │   ├── utils/             ← HttpError
│   │   ├── shared/            ← validation pieces used by many modules
│   │   ├── routes/            ← mounts every module under /api
│   │   └── modules/           ← one folder per feature
│   │       ├── health/  ngos/  opportunities/  campaigns/  contact/
│   │       │   (each has *.routes.ts and, if it accepts input, *.schemas.ts)
│   └── tests/                 ← API tests (run without a database)
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

**Website** (needs Node.js 20+, nothing to install):

```bash
npm run frontend
```

Open <http://localhost:5500>.

**Backend** (optional; the website doesn't call it yet):

```bash
npm run backend:install
npm run backend:test
npm run backend:dev
```

Health check: <http://localhost:4000/api/health>. For database setup see [backend/README.md](backend/README.md).

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
| Search, filters, registration, organizer tools | ✅ Working (browser storage) |
| Recommendations | ✅ Transparent rule-based scoring (not machine learning) |
| Donations | ⚠️ Demo only: no payment provider, no money moves |
| Login / accounts | ⚠️ Demo profile (name + email, no password) |
| Contact form | ⚠️ Saved in browser; no email is sent |
| NGO verification | ⚠️ New NGOs stay "Pending"; no admin review yet |
| Certificates | ⚠️ Generated in-browser; not independently verifiable |

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Next steps: [docs/ROADMAP.md](docs/ROADMAP.md)
