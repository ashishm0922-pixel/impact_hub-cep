# HopeConnect API (backend foundation)

Node.js + Express 5 + TypeScript + PostgreSQL via Prisma.

This is a **foundation**: schema, validation, error handling and a first set of routes.
The frontend still uses `localStorage` and does not call this API yet.

## Folder layout
```
backend/
├── prisma/
│   ├── schema.prisma          Tables: User, Ngo, Opportunity, Registration, Campaign, Donation, ContactMessage
│   └── seed.ts                Sample NGOs, drives and a campaign
├── src/
│   ├── server.ts              Loads .env and starts the HTTP server
│   ├── app.ts                 Express app: security headers, CORS, JSON, routes, errors
│   ├── config/env.ts          Every environment variable, read in one place
│   ├── lib/prisma.ts          Shared Prisma client + requireDb()
│   ├── middlewares/
│   │   └── error-handler.ts   404 handler + JSON error handler
│   ├── utils/http-error.ts    HttpError(status, message)
│   ├── shared/schemas.ts      Validation shared by modules (category, list query, email)
│   ├── routes/index.ts        Mounts every module under /api
│   └── modules/               One folder per feature
│       ├── health/            health.routes.ts
│       ├── ngos/              ngos.routes.ts, ngos.schemas.ts
│       ├── opportunities/     opportunities.routes.ts, opportunities.schemas.ts
│       ├── campaigns/         campaigns.routes.ts
│       └── contact/           contact.routes.ts, contact.schemas.ts
├── tests/app.test.ts          Tests (run without a database)
├── tsconfig.json              Type-checking (src + tests + prisma)
├── tsconfig.build.json        Build (src → dist)
└── .env.example
```

## Setup

Requirements: Node.js 20+ and (for data routes) PostgreSQL 14+.

```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL
npx prisma generate
```

Without PostgreSQL you can still run the server: `/api/health` works and data routes reply `503`.

### With PostgreSQL
```bash
npm run prisma:migrate      # creates the tables
npm run prisma:seed         # adds sample data
npm run dev                 # http://localhost:4000/api/health
```

No local Postgres? A free hosted database (e.g. Neon or Supabase) works too: paste its connection string into `DATABASE_URL`.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload (tsx) |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run typecheck` | TypeScript check (src, tests, seed) |
| `npm test` | Run tests (no database needed) |

## Endpoints
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Server + database configuration status |
| GET | `/api/ngos?category=&search=` | Lists verified + pending NGOs |
| POST | `/api/ngos` | NGO application → always `PENDING_VERIFICATION` |
| GET | `/api/opportunities?category=&city=&search=` | Upcoming open drives with sign-up counts |
| POST | `/api/opportunities/:id/registrations` | Validated, capacity-checked in a transaction |
| GET | `/api/campaigns?category=` | Active campaigns; "raised" counts only `SUCCEEDED` payments |
| POST | `/api/campaigns/:id/donations` | Returns `501` until a payment provider is connected |
| POST | `/api/contact` | Saves a contact message |

## Environment variables
| Name | Required | Example |
|---|---|---|
| `DATABASE_URL` | for data routes | `postgresql://postgres:postgres@localhost:5432/hopeconnect?schema=public` |
| `PORT` | no (default 4000) | `4000` |
| `CORS_ORIGIN` | no (default `http://localhost:5500`) | `http://localhost:5500,https://your-site.com` |

## Payments (not implemented, on purpose)
Real donations need a provider such as Razorpay:
1. Server creates an order (`PENDING` donation, amount in **paise**).
2. Browser completes checkout with the provider.
3. Provider calls your **webhook**; the server verifies the signature, then marks the donation `SUCCEEDED`.

Never mark a payment successful based on a message from the browser.

## Next steps
1. Authentication (hashed passwords or OAuth, httpOnly session cookies) and role checks for NGO admins.
2. Organizer routes (create/close campaigns and drives, mark attendance).
3. Admin route to verify NGOs.
4. Switch `frontend/assets/js/core/store.js` to call this API instead of `localStorage`.
