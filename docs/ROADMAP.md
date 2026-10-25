# Roadmap

## Phase 1: Make it real (next)
- [x] MongoDB Atlas connection (Mongoose)
- [x] Accounts: sign-up/login with hashed passwords, httpOnly session cookies, roles (volunteer, donor, NGO)
- [x] Email verification on sign-up (one-time link) + optional admin approval
- [ ] Connect a real email service (Gmail SMTP / Brevo / Resend)
- [ ] Forgot password / change password (uses the same email service)
- [x] Drives, campaigns, sign-ups and pledges live in MongoDB (`store.js` talks to the API)
- [x] NGO console: publish drives/campaigns, see participants, mark attendance
- [x] Admin panel: NGO verification queue, users, audit logs, leaderboard, flagged content
- [ ] NGO document uploads (registration certificate, 80G/12A) for the verification queue
- [x] NGO tools only for verified NGO accounts
- [ ] Upgrade `zod` to v4 (npm audit advisory; low risk today because request bodies are capped at 20 KB)

## Phase 2: Money & trust
- [ ] Razorpay donations: server creates the order, webhook confirms → `SUCCEEDED`
- [ ] Emailed donation receipts (and 80G receipts for eligible NGOs)
- [ ] QR check-in at events for verified attendance
- [ ] Certificates with a unique ID and a public `/verify/:id` page

## Phase 3: Engagement
- [ ] Map view + "near me" filter for drives
- [ ] Campaign updates feed (NGOs post progress photos; donors get notified)
- [ ] NGO ratings and reviews
- [ ] Calendar (.ics) export and reminders
- [ ] Shareable impact cards (WhatsApp / Instagram / LinkedIn)
- [ ] Recurring monthly donations

## Phase 4: More ways to help
- [ ] In-kind donations (books, clothes, food)
- [ ] Skill-based / remote volunteering marketplace
- [ ] Corporate CSR portal and college/NSS hour tracking
- [ ] Emergency / disaster mode with urgent volunteer calls

## Phase 5: AI features (only after real data exists)
- [ ] Natural-language matcher ("I'm free Sundays in Pune and love animals") on top of the rule-based scores
- [ ] Campaign-writing assistant for NGOs
- [ ] Anomaly checks on new NGOs and campaigns

## Platform quality (ongoing)
- [ ] Hindi / Marathi translations
- [ ] Accessibility audit (WCAG AA)
- [ ] Installable PWA
- [ ] Deploy: frontend on a static host, API + database on Render/Railway
