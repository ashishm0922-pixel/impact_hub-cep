# Roadmap

## Phase 1: Make it real (next)
- [x] MongoDB Atlas connection (Mongoose)
- [x] Accounts: sign-up/login with hashed passwords, httpOnly session cookies, roles (volunteer, donor, NGO)
- [x] Admin approval of new accounts (approve / reject / suspend)
- [ ] Forgot password / change password (needs an email service)
- [ ] Email verification on sign-up
- [ ] Switch `frontend/assets/js/core/store.js` from localStorage to the API, one feature at a time (start with volunteer registration)
- [ ] Organizer API: create/close campaigns and drives, mark attendance
- [ ] Admin panel: also verify or reject NGOs (check registration + 80G/12A documents)
- [ ] Organizer portal only for approved NGO accounts

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
