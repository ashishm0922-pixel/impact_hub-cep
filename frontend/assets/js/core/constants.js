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
