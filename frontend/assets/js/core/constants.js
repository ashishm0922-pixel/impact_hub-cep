/**
 * HopeConnect AI - Shared constants + date helpers (loaded first on every page).
 * All real data (NGOs, drives, campaigns, sign-ups) now comes from the server: see store.js.
 */
const CATEGORIES = [
  'Environment', 'Education', 'Healthcare', 'Animal Welfare',
  'Women Empowerment', 'Child Welfare', 'Disaster Relief'
];

// ---------- Date helpers (all dates are stored as ISO "YYYY-MM-DD") ----------
// Uses the LOCAL date (toISOString() would use UTC and can be off by a day in India).
function toLocalISO(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoDaysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

function todayISO() {
  return toLocalISO(new Date());
}

function daysBetween(fromISO, toISO) {
  const ms = new Date(toISO + 'T00:00:00') - new Date(fromISO + 'T00:00:00');
  return Math.round(ms / 86400000);
}

// ---------- Recognition tiers (same thresholds as backend/src/modules/admin/leaderboard.service.ts) ----------
// Volunteers rise by CONFIRMED hours (attended); donors by total pledged ₹.
const VOLUNTEER_TIERS = [
  { name: 'Bronze', label: 'Bronze Changemaker', min: 0, rule: '0+ hours' },
  { name: 'Silver', label: 'Silver Advocate', min: 15, rule: '15+ confirmed hours' },
  { name: 'Gold', label: 'Gold Leader', min: 35, rule: '35+ confirmed hours' },
  { name: 'Platinum', label: 'Platinum Guardian', min: 70, rule: '70+ confirmed hours' }
];
const DONOR_TIERS = [
  { name: 'Bronze', label: 'Community Supporter', min: 0, rule: 'Up to ₹2,500' },
  { name: 'Silver', label: 'Cause Patron', min: 2500, rule: '₹2,500 – ₹10,000' },
  { name: 'Gold', label: 'Impact Champion', min: 10000, rule: '₹10,000 – ₹50,000' },
  { name: 'Platinum', label: 'Ecosystem Guardian', min: 50000, rule: '₹50,000+' }
];

/** Where am I? → { current, next, percent, remaining } for a list of tiers and a value (hours or ₹). */
function tierInfo(tiers, value) {
  let index = 0;
  tiers.forEach((tier, i) => { if (value >= tier.min) index = i; });
  const current = tiers[index];
  const next = tiers[index + 1] || null;
  const percent = next ? Math.min(100, Math.round(((value - current.min) / (next.min - current.min)) * 100)) : 100;
  return { current, next, percent, remaining: next ? next.min - value : 0 };
}
