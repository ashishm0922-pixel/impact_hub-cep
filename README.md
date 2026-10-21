# HopeConnect AI

A platform that connects **volunteers**, **donors** and **NGOs**: discover verified NGOs, join volunteer drives, support campaigns, and track your impact.

> **Current status: working demo (frontend MVP) + backend foundation.**
> The website runs fully in the browser and saves data in `localStorage`.
> **No real payments, emails or logins happen.** Everything that is simulated is labelled "demo" in the UI.

---

## Project structure

```
hopeconnect-ai/
├── index.html          Home: hero, smart cause matcher, impact calculator
├── volunteer.html      Volunteer drives: search, filters, registration
├── campaigns.html      Campaigns: filters, sorting, demo donations + receipt
├── ngos.html           NGO directory + profiles (verified / pending)
├── impact.html         Your impact: hours, donations, badges, charts, certificate
├── dashboard.html      Organizer portal: create/close/delete, mark attendance
├── about.html          About the platform
├── contact.html        Contact form + NGO registration form
├── css/
│   ├── style.css       Main styles (design tokens at the top)
│   └── responsive.css  Tablet / mobile layouts
├── js/
│   ├── store.js        Data layer (localStorage) + seed data + calculated stats
│   ├── app.js          Shared: safe HTML helpers, validation, toasts, modals, demo profile
│   ├── volunteer.js    Volunteer page logic
│   ├── campaigns.js    Campaigns page + demo donation flow
│   ├── ngos.js         NGO directory logic
│   ├── contact.js      Contact + NGO registration forms
│   ├── dashboard.js    Impact dashboard + organizer portal
│   ├── recommendations.js  Rule-based cause matcher (explainable scores)
│   ├── calculator.js   Donation impact estimator
│   └── certificate.js  Canvas certificate generator (PNG download)
└── backend/            Express + TypeScript + Prisma (PostgreSQL) API foundation
```

## Run the website (frontend)

No build step and no dependencies. Serve the folder with any static server:

```bash
python -m http.server 5500
```

Then open <http://localhost:5500>. (Opening `index.html` directly also works, but a server is closer to production.)

**Reset the demo:** use the "Reset demo data" button in any page footer.

### Try the main journeys
1. **Volunteer:** Volunteer → search "pune tree" → *Join Opportunity* → the form rejects invalid name/email/phone → registration confirmed.
2. **Organizer:** Organizer Portal → *New Drive* (date = today) → register for it on the Volunteer page → back in the portal mark it **Attended** → hours appear on **Impact**.
3. **Donor:** Campaigns → *Support This Cause* → demo donation → receipt says "Not charged (demo)" → Impact page updates.
4. **Matcher:** Home → pick causes, city, skills → *Find My Matches* → each result explains **why** it matched.
5. **Certificate:** Impact → enter name → *Download* (only once you have attended hours).

## How the data works (important for learning)
- `js/store.js` stores **raw records** (registrations, donations, campaigns, ...).
- Totals (hours, ₹ contributed, badges, charts) are **calculated** from those records every time, so the numbers never contradict each other.
- Volunteer hours count only after an organizer marks attendance (on or after the event date).
- Badges unlock automatically from rules (e.g. 20 attended hours → Community Hero).
- All user text is escaped with `HC.escape()` before going into HTML, and URLs pass through `HC.safeUrl()`. This blocks XSS.

## Run the backend (optional, foundation only)
See [`backend/README.md`](backend/README.md). The frontend does **not** call the backend yet.

## What is simulated vs real
| Feature | Status |
|---|---|
| Search, filters, registration, organizer tools | ✅ Working (browser storage) |
| Donations | ⚠️ Demo only: no payment provider connected, no money moves |
| Login / accounts | ⚠️ Demo profile (name + email, no password) |
| Contact form | ⚠️ Saved in browser; no email is sent |
| NGO verification | ⚠️ New NGOs stay "Pending"; no admin review flow yet |
| Recommendations | ✅ Transparent rule-based scoring (not machine learning) |
| Certificates | ⚠️ Generated in-browser; not independently verifiable yet |
