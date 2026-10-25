/**
 * HopeConnect AI - Data store (talks to the backend API)
 * Depends on: core/constants.js (CATEGORIES, date helpers) and core/app.js (HC.api).
 *
 * Pages read data with simple, instant calls (HCStore.getOpportunities() ...) from an
 * in-memory copy that is loaded from the server once and refreshed when it gets old.
 * Changes (join a drive, pledge, create a campaign...) are sent to the server, and the
 * copy is updated with the server's answer.
 *
 * Rule kept from before: store raw records and CALCULATE totals (hours, ₹, badges) from them.
 */

const PREFERENCES_KEY = 'hopeconnect_match_preferences';
const CATALOG_MAX_AGE_MS = 30 * 1000; // re-load public data when navigating after 30 s

// Badges are earned by RULES computed from your data — never by clicking.
const BADGE_RULES = [
  { id: 'first-step', title: 'First Step', icon: '🌱',
    description: 'Attend your first volunteering activity.',
    progress: s => ({ current: s.eventsAttended, target: 1 }) },
  { id: 'change-maker', title: 'Change Maker', icon: '🔥',
    description: 'Attend 5 volunteering activities.',
    progress: s => ({ current: s.eventsAttended, target: 5 }) },
  { id: 'community-hero', title: 'Community Hero', icon: '💛',
    description: 'Contribute 20 attended volunteer hours.',
    progress: s => ({ current: s.volunteerHours, target: 20 }) },
  { id: 'first-gift', title: 'First Gift', icon: '🎁',
    description: 'Make your first pledge to a campaign.',
    progress: s => ({ current: s.donationCount, target: 1 }) },
  { id: 'super-supporter', title: 'Super Supporter', icon: '❤️',
    description: 'Pledge ₹5,000 in total across campaigns.',
    progress: s => ({ current: s.totalContributed, target: 5000 }) },
  { id: 'impact-champion', title: 'Impact Champion', icon: '🌍',
    description: 'Support 3 different causes (by volunteering or pledging).',
    progress: s => ({ current: s.causesSupported, target: 3 }) },
  { id: 'century', title: 'Century Achiever', icon: '🏆',
    description: 'Reach 100 attended volunteer hours.',
    progress: s => ({ current: s.volunteerHours, target: 100 }) },
  { id: 'organizer', title: 'Master Organizer', icon: '🏢',
    description: 'Publish 3 campaigns or drives as an NGO.',
    progress: s => ({ current: s.itemsCreated, target: 3 }) }
];

/** Turns an API failure into { success: false, error, code, fields } */
function failure(result) {
  return { success: false, status: result.status, error: result.data?.error || 'Something went wrong.', code: result.data?.code, fields: result.data?.fields || [] };
}

class StoreManager {
  constructor() {
    this.catalog = { ngos: [], opportunities: [], campaigns: [] };
    this.activity = { registrations: [], pledges: [] };
    this.ngoConsole = null; // loaded on the dashboard for NGO accounts
    this.user = null;
    this.catalogLoadedAt = 0;
    this.loadError = null;
    this.ready = this.load();
  }

  /* ---------------- Loading ---------------- */
  async load() {
    const [catalog, session] = await Promise.all([this.loadCatalog(), HC.api('GET', '/api/auth/session')]);
    this.user = session.ok ? session.data.user : null;
    if (this.user) await this.loadActivity();
    return catalog;
  }

  async loadCatalog() {
    const res = await HC.api('GET', '/api/catalog');
    if (res.ok) {
      this.catalog = res.data;
      this.catalogLoadedAt = Date.now();
      this.loadError = null;
    } else {
      this.loadError = res.data?.error || 'Could not load data from the server.';
    }
    return res.ok;
  }

  async loadActivity() {
    if (!this.user) {
      this.activity = { registrations: [], pledges: [] };
      return;
    }
    const res = await HC.api('GET', '/api/me/activity');
    this.activity = res.ok ? res.data : { registrations: [], pledges: [] };
  }

  /** Called before each page runs: refresh public data if it's older than 30 s */
  async ensureFresh() {
    await this.ready;
    if (Date.now() - this.catalogLoadedAt > CATALOG_MAX_AGE_MS) await this.loadCatalog();
  }

  /** Called by auth.js after login / logout */
  async setUser(user) {
    this.user = user;
    this.ngoConsole = null;
    await this.loadActivity();
  }

  /* ---------------- Profile ---------------- */
  getProfile() {
    if (!this.user) return { name: '', email: '', phone: '', role: 'guest', isDemo: true };
    const { name, email, phone, role, emailVerified, city, anonymous } = this.user;
    return { name, email, phone, role, emailVerified, city: city || '', anonymous: Boolean(anonymous), isDemo: false };
  }

  isLoggedIn() {
    return Boolean(this.user);
  }

  /* ---------------- Catalog (public) ---------------- */
  getNGOs() { return this.catalog.ngos; }
  getNGOById(id) { return this.catalog.ngos.find(n => n.id === id); }
  getOpportunities() { return this.catalog.opportunities; }
  getOpportunityById(id) { return this.catalog.opportunities.find(o => o.id === id); }
  getCampaigns() { return this.catalog.campaigns; }
  getCampaignById(id) { return this.catalog.campaigns.find(c => c.id === id); }

  replaceInCatalog(listName, item) {
    const list = this.catalog[listName];
    const index = list.findIndex(x => x.id === item.id);
    if (index >= 0) list[index] = item;
    else list.unshift(item);
  }

  // Is this opportunity still joinable? Returns { ok, reason }
  getOpportunityAvailability(opp) {
    if (opp.status === 'Closed') return { ok: false, reason: 'Closed by organizer' };
    if (!opp.recurring && opp.date && opp.date < todayISO()) return { ok: false, reason: 'Event has passed' };
    if ((opp.volunteersRegistered || 0) >= opp.volunteersNeeded) return { ok: false, reason: 'All spots filled' };
    return { ok: true, reason: '' };
  }

  getDaysLeft(campaign) {
    if (!campaign.endDate) return null;
    return Math.max(0, daysBetween(todayISO(), campaign.endDate));
  }

  isCampaignOpen(campaign) {
    return campaign.status !== 'Closed' && (this.getDaysLeft(campaign) ?? 1) > 0;
  }

  /** The logged-in user's active registration for a drive, if any */
  getMyRegistrationFor(opportunityId) {
    return this.activity.registrations.find(r => r.opportunityId === opportunityId && r.status !== 'Cancelled');
  }

  /* ---------------- Volunteer & donor actions ---------------- */
  async registerVolunteer({ opportunityId, skills, availability }) {
    const res = await HC.api('POST', `/api/opportunities/${encodeURIComponent(opportunityId)}/registrations`, { skills, availability });
    if (!res.ok) return failure(res);
    this.replaceInCatalog('opportunities', res.data.opportunity);
    this.activity.registrations = [res.data.registration, ...this.activity.registrations.filter(r => r.id !== res.data.registration.id)];
    return { success: true, registration: res.data.registration, opportunity: res.data.opportunity };
  }

  async cancelRegistration(id) {
    const res = await HC.api('POST', `/api/me/registrations/${encodeURIComponent(id)}/cancel`);
    if (!res.ok) return failure(res);
    this.activity.registrations = this.activity.registrations.map(r => (r.id === id ? res.data.registration : r));
    await this.loadCatalog(); // spot counts changed
    return { success: true };
  }

  // DEMO pledge: recorded on the server, but no money is charged
  async recordPledge(campaignId, amount) {
    const res = await HC.api('POST', `/api/campaigns/${encodeURIComponent(campaignId)}/pledges`, { amount });
    if (!res.ok) return failure(res);
    this.replaceInCatalog('campaigns', res.data.campaign);
    this.activity.pledges = [res.data.pledge, ...this.activity.pledges];
    return { success: true, donation: res.data.pledge, campaign: res.data.campaign };
  }

  async reportContent(targetType, targetId, reason, details) {
    const res = await HC.api('POST', '/api/reports', { targetType, targetId, reason, details });
    return res.ok ? { success: true, message: res.data.message } : failure(res);
  }

  /** Public leaderboard (first name + initial only): type = 'volunteers' | 'donors' */
  async getLeaderboard(type) {
    const res = await HC.api('GET', `/api/leaderboard?type=${encodeURIComponent(type)}`);
    return res.ok ? { success: true, rows: res.data.rows } : failure(res);
  }

  /** Save name / city / "anonymous on leaderboards" for the logged-in user */
  async updateProfile(data) {
    const res = await HC.api('PATCH', '/api/me/profile', data);
    if (!res.ok) return failure(res);
    this.user = res.data.user;
    return { success: true, user: res.data.user, message: res.data.message };
  }

  async saveContactMessage(message) {
    const res = await HC.api('POST', '/api/contact', message);
    return res.ok ? { success: true } : failure(res);
  }

  getUserRegistrations() { return this.activity.registrations; }
  getUserDonations() { return this.activity.pledges; }

  /* ---------------- NGO console ---------------- */
  async loadNgoConsole() {
    const res = await HC.api('GET', '/api/ngo/console');
    if (!res.ok) return failure(res);
    this.ngoConsole = res.data;
    return { success: true, console: res.data };
  }

  async ngoRequest(method, path, body) {
    const res = await HC.api(method, `/api/ngo${path}`, body);
    if (!res.ok) return failure(res);
    await Promise.all([this.loadNgoConsole(), this.loadCatalog()]);
    return { success: true, data: res.data };
  }

  submitOrganization(data) { return this.ngoRequest('POST', '/organization', data); }
  createOpportunity(data) { return this.ngoRequest('POST', '/opportunities', data); }
  setOpportunityStatus(id, status) { return this.ngoRequest('PATCH', `/opportunities/${encodeURIComponent(id)}`, { status }); }
  deleteOpportunity(id) { return this.ngoRequest('DELETE', `/opportunities/${encodeURIComponent(id)}`); }
  createCampaign(data) { return this.ngoRequest('POST', '/campaigns', data); }
  setCampaignStatus(id, status) { return this.ngoRequest('PATCH', `/campaigns/${encodeURIComponent(id)}`, { status }); }
  deleteCampaign(id) { return this.ngoRequest('DELETE', `/campaigns/${encodeURIComponent(id)}`); }
  setRegistrationStatus(id, status) { return this.ngoRequest('PATCH', `/registrations/${encodeURIComponent(id)}`, { status }); }

  /* ---------------- Matching preferences (this browser only) ---------------- */
  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(PREFERENCES_KEY)) || null;
    } catch {
      return null;
    }
  }

  savePreferences(prefs) {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      /* storage blocked: preferences just aren't remembered */
    }
  }

  /* ---------------- Derived impact stats (always calculated) ---------------- */
  getUserStats() {
    const registrations = this.getUserRegistrations();
    const donations = this.getUserDonations();
    const attended = registrations.filter(r => r.status === 'Attended');
    const upcoming = registrations.filter(r => r.status === 'Registered');
    const causes = new Set([...attended.map(r => r.category), ...donations.map(d => d.category)].filter(Boolean));
    const consoleData = this.ngoConsole;
    const itemsCreated = consoleData ? consoleData.opportunities.length + consoleData.campaigns.length : 0;

    return {
      volunteerHours: attended.reduce((sum, r) => sum + (Number(r.hours) || 0), 0),
      upcomingHours: upcoming.reduce((sum, r) => sum + (Number(r.hours) || 0), 0),
      eventsAttended: attended.length,
      eventsUpcoming: upcoming.length,
      totalContributed: donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      donationCount: donations.length,
      campaignsSupported: new Set(donations.map(d => d.campaignId)).size,
      causesSupported: causes.size,
      itemsCreated
    };
  }

  getUserBadges() {
    const stats = this.getUserStats();
    return BADGE_RULES.map(rule => {
      const { current, target } = rule.progress(stats);
      return {
        id: rule.id, title: rule.title, icon: rule.icon, description: rule.description,
        current: Math.min(current, target), target, unlocked: current >= target
      };
    });
  }

  // Last 6 months of attended hours + pledges, for the chart
  getMonthlyHistory(monthCount = 6) {
    const registrations = this.getUserRegistrations().filter(r => r.status === 'Attended');
    const donations = this.getUserDonations();
    const months = [];
    const now = new Date();
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = toLocalISO(d).slice(0, 7); // "YYYY-MM"
      months.push({
        key,
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
        hours: registrations.filter(r => (r.eventDate || '').startsWith(key)).reduce((s, r) => s + r.hours, 0),
        donation: donations.filter(x => (x.date || '').startsWith(key)).reduce((s, x) => s + x.amount, 0)
      });
    }
    return months;
  }

  getCauseDistribution() {
    const counts = {};
    this.getUserRegistrations().filter(r => r.status === 'Attended')
      .forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    this.getUserDonations().forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
    return counts;
  }
}

// Global Store Instance
window.HCStore = new StoreManager();
window.HC_CATEGORIES = CATEGORIES;
window.HC_DATE = { todayISO, isoDaysFromToday, daysBetween };
window.HC_TIERS = { volunteer: VOLUNTEER_TIERS, donor: DONOR_TIERS, info: tierInfo };
