/**
 * HopeConnect AI - Central Data Store (browser localStorage)
 * Depends on: core/seed-data.js (CATEGORIES, date helpers, seed builders)
 *
 * IMPORTANT: This is a DEMO data layer. Everything is saved only in this
 * browser's localStorage. No data is sent to a server, no emails are sent
 * and no money is ever transferred.
 *
 * Design rule: we store raw records (registrations, donations, campaigns...)
 * and CALCULATE totals (hours, amounts, badges) from them. That way the
 * dashboard numbers can never drift out of sync with the actual data.
 */

const DATA_VERSION = '2';

const STORAGE_KEYS = {
  VERSION: 'hopeconnect_data_version',
  NGOS: 'hopeconnect_ngos',
  OPPORTUNITIES: 'hopeconnect_opportunities',
  CAMPAIGNS: 'hopeconnect_campaigns',
  REGISTRATIONS: 'hopeconnect_user_registrations',
  DONATIONS: 'hopeconnect_user_donations',
  MESSAGES: 'hopeconnect_contact_messages',
  PROFILE: 'hopeconnect_profile',
  PREFERENCES: 'hopeconnect_match_preferences',
  CURRENT_ROLE: 'hopeconnect_current_role',
  ORGANIZER_NGO: 'hopeconnect_organizer_ngo'
};


// Badges are earned by RULES computed from your data — never by clicking.
// Each rule returns { current, target } so we can show progress.
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
    description: 'Make your first (demo) donation to a campaign.',
    progress: s => ({ current: s.donationCount, target: 1 }) },
  { id: 'super-supporter', title: 'Super Supporter', icon: '❤️',
    description: 'Contribute ₹5,000 in total across campaigns.',
    progress: s => ({ current: s.totalContributed, target: 5000 }) },
  { id: 'impact-champion', title: 'Impact Champion', icon: '🌍',
    description: 'Support 3 different causes (by volunteering or donating).',
    progress: s => ({ current: s.causesSupported, target: 3 }) },
  { id: 'century', title: 'Century Achiever', icon: '🏆',
    description: 'Reach 100 attended volunteer hours.',
    progress: s => ({ current: s.volunteerHours, target: 100 }) },
  { id: 'organizer', title: 'Master Organizer', icon: '🏢',
    description: 'Create 3 campaigns or opportunities as an organizer.',
    progress: s => ({ current: s.itemsCreated, target: 3 }) }
];

class StoreManager {
  constructor() {
    this.init();
  }

  // ---------- low-level helpers ----------
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('HopeConnect: could not read', key, err);
      return fallback;
    }
  }

  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('HopeConnect: could not save', key, err);
    }
  }

  newId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  init() {
    // If the saved data is from an older version of the app, start fresh.
    if (localStorage.getItem(STORAGE_KEYS.VERSION) !== DATA_VERSION) {
      this.resetDemoData();
    }
  }

  resetDemoData() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('hopeconnect_'))
      .forEach(k => localStorage.removeItem(k));

    this.write(STORAGE_KEYS.NGOS, INITIAL_NGOS);
    this.write(STORAGE_KEYS.OPPORTUNITIES, buildInitialOpportunities());
    this.write(STORAGE_KEYS.CAMPAIGNS, buildInitialCampaigns());
    this.write(STORAGE_KEYS.REGISTRATIONS, buildInitialRegistrations());
    this.write(STORAGE_KEYS.DONATIONS, buildInitialDonations());
    this.write(STORAGE_KEYS.MESSAGES, []);
    this.write(STORAGE_KEYS.PROFILE, DEMO_PROFILE);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, 'volunteer');
    localStorage.setItem(STORAGE_KEYS.ORGANIZER_NGO, 'ngo-1');
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
  }

  // ---------- Profile (demo only — no password, no real login) ----------
  getProfile() {
    return this.read(STORAGE_KEYS.PROFILE, DEMO_PROFILE);
  }

  saveProfile({ name, email, role }) {
    const profile = { name, email: email.toLowerCase(), role, isDemo: false };
    this.write(STORAGE_KEYS.PROFILE, profile);
    this.setCurrentRole(role);
    return profile;
  }

  isMine(email) {
    return (email || '').toLowerCase() === (this.getProfile().email || '').toLowerCase();
  }

  // ---------- NGOs ----------
  getNGOs() {
    return this.read(STORAGE_KEYS.NGOS, []);
  }

  getNGOById(id) {
    return this.getNGOs().find(n => n.id === id);
  }

  // New NGOs always start as "Pending" — nobody is verified automatically.
  addNGO(ngo) {
    const ngos = this.getNGOs();
    const newNgo = {
      ...ngo,
      id: this.newId('ngo'),
      verified: false,
      status: 'Pending Verification',
      volunteersCount: 0,
      rating: null,
      submittedAt: todayISO()
    };
    ngos.push(newNgo);
    this.write(STORAGE_KEYS.NGOS, ngos);
    return newNgo;
  }

  // ---------- Opportunities ----------
  getOpportunities() {
    return this.read(STORAGE_KEYS.OPPORTUNITIES, []);
  }

  getOpportunityById(id) {
    return this.getOpportunities().find(o => o.id === id);
  }

  addOpportunity(opp) {
    const opps = this.getOpportunities();
    const newOpp = {
      volunteersRegistered: 0,
      recurring: null,
      remote: false,
      status: 'Open',
      createdByOrganizer: true,
      ...opp,
      id: this.newId('opp')
    };
    opps.unshift(newOpp);
    this.write(STORAGE_KEYS.OPPORTUNITIES, opps);
    return newOpp;
  }

  updateOpportunity(id, changes) {
    const opps = this.getOpportunities();
    const opp = opps.find(o => o.id === id);
    if (!opp) return null;
    Object.assign(opp, changes);
    this.write(STORAGE_KEYS.OPPORTUNITIES, opps);
    return opp;
  }

  deleteOpportunity(id) {
    this.write(STORAGE_KEYS.OPPORTUNITIES, this.getOpportunities().filter(o => o.id !== id));
  }

  // Is this opportunity still joinable? Returns { ok, reason }
  getOpportunityAvailability(opp) {
    if (opp.status === 'Closed') return { ok: false, reason: 'Closed by organizer' };
    if (!opp.recurring && opp.date && opp.date < todayISO()) return { ok: false, reason: 'Event has passed' };
    if ((opp.volunteersRegistered || 0) >= opp.volunteersNeeded) return { ok: false, reason: 'All spots filled' };
    return { ok: true, reason: '' };
  }

  // ---------- Campaigns ----------
  getCampaigns() {
    return this.read(STORAGE_KEYS.CAMPAIGNS, []);
  }

  getCampaignById(id) {
    return this.getCampaigns().find(c => c.id === id);
  }

  getDaysLeft(campaign) {
    if (!campaign.endDate) return null;
    return Math.max(0, daysBetween(todayISO(), campaign.endDate));
  }

  isCampaignOpen(campaign) {
    return campaign.status !== 'Closed' && (this.getDaysLeft(campaign) ?? 1) > 0;
  }

  addCampaign(campaign) {
    const campaigns = this.getCampaigns();
    const newCampaign = {
      ...campaign,
      id: this.newId('camp'),
      raised: 0,
      supporters: 0,
      goal: Number(campaign.goal),
      featured: false,
      status: 'Active',
      createdByOrganizer: true
    };
    campaigns.unshift(newCampaign);
    this.write(STORAGE_KEYS.CAMPAIGNS, campaigns);
    return newCampaign;
  }

  updateCampaign(id, changes) {
    const campaigns = this.getCampaigns();
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return null;
    Object.assign(campaign, changes);
    this.write(STORAGE_KEYS.CAMPAIGNS, campaigns);
    return campaign;
  }

  deleteCampaign(id) {
    this.write(STORAGE_KEYS.CAMPAIGNS, this.getCampaigns().filter(c => c.id !== id));
  }

  // DEMO donation: updates numbers in localStorage only. No payment happens.
  recordDemoDonation(campaignId, amount, donorName, donorEmail) {
    const campaigns = this.getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return { success: false, error: 'Campaign not found.' };
    if (!this.isCampaignOpen(campaign)) return { success: false, error: 'This campaign is no longer accepting support.' };

    campaign.raised += amount;
    campaign.supporters += 1;
    this.write(STORAGE_KEYS.CAMPAIGNS, campaigns);

    const donation = {
      id: this.newId('don'),
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      ngoId: campaign.ngoId,
      ngoName: campaign.ngoName,
      category: campaign.category,
      amount,
      date: todayISO(),
      donorName,
      donorEmail: (donorEmail || '').toLowerCase(),
      reference: 'DEMO-' + Math.floor(100000 + Math.random() * 900000),
      isDemo: true
    };
    const donations = this.getAllDonations();
    donations.unshift(donation);
    this.write(STORAGE_KEYS.DONATIONS, donations);
    return { success: true, campaign, donation };
  }

  getAllDonations() {
    return this.read(STORAGE_KEYS.DONATIONS, []);
  }

  getUserDonations() {
    return this.getAllDonations().filter(d => this.isMine(d.donorEmail));
  }

  // ---------- Volunteer registrations ----------
  getAllRegistrations() {
    return this.read(STORAGE_KEYS.REGISTRATIONS, []);
  }

  getUserRegistrations() {
    return this.getAllRegistrations().filter(r => this.isMine(r.email));
  }

  // Returns { success, registration } or { success: false, error }
  registerVolunteer(data) {
    const opps = this.getOpportunities();
    const opp = opps.find(o => o.id === data.opportunityId);
    if (!opp) return { success: false, error: 'Opportunity not found.' };

    const availability = this.getOpportunityAvailability(opp);
    if (!availability.ok) return { success: false, error: `Registration closed: ${availability.reason}.` };

    const registrations = this.getAllRegistrations();
    const duplicate = registrations.some(r =>
      r.opportunityId === opp.id && r.email.toLowerCase() === data.email.toLowerCase() && r.status !== 'Cancelled');
    if (duplicate) return { success: false, error: 'This email is already registered for this opportunity.' };

    const registration = {
      id: this.newId('reg'),
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      ngoId: opp.ngoId,
      ngoName: opp.ngoName,
      category: opp.category,
      eventDate: opp.date,
      hours: opp.hours || 4,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      skills: data.skills,
      availability: data.availability,
      dateApplied: todayISO(),
      status: 'Registered'
    };
    registrations.unshift(registration);
    this.write(STORAGE_KEYS.REGISTRATIONS, registrations);

    opp.volunteersRegistered = (opp.volunteersRegistered || 0) + 1;
    this.write(STORAGE_KEYS.OPPORTUNITIES, opps);

    return { success: true, registration, opportunity: opp };
  }

  // Organizer action: Registered -> Attended / No-show / Cancelled
  setRegistrationStatus(id, status) {
    const registrations = this.getAllRegistrations();
    const reg = registrations.find(r => r.id === id);
    if (!reg) return { success: false, error: 'Registration not found.' };

    // You can't attend (or miss) an event that hasn't happened yet
    if ((status === 'Attended' || status === 'No-show') && reg.eventDate > todayISO()) {
      return { success: false, error: 'Attendance can be marked on or after the event date.' };
    }

    const wasActive = reg.status !== 'Cancelled';
    reg.status = status;
    this.write(STORAGE_KEYS.REGISTRATIONS, registrations);

    // Free up the spot when a registration is cancelled
    if (wasActive && status === 'Cancelled') {
      const opp = this.getOpportunityById(reg.opportunityId);
      if (opp) this.updateOpportunity(opp.id, { volunteersRegistered: Math.max(0, opp.volunteersRegistered - 1) });
    }
    return { success: true, registration: reg };
  }

  // ---------- Contact messages (stored locally; NOT emailed) ----------
  saveContactMessage(message) {
    const messages = this.read(STORAGE_KEYS.MESSAGES, []);
    const saved = { ...message, id: this.newId('msg'), date: todayISO() };
    messages.unshift(saved);
    this.write(STORAGE_KEYS.MESSAGES, messages);
    return saved;
  }

  // ---------- Matching preferences ----------
  getPreferences() {
    return this.read(STORAGE_KEYS.PREFERENCES, null);
  }

  savePreferences(prefs) {
    this.write(STORAGE_KEYS.PREFERENCES, prefs);
  }

  // ---------- Derived impact stats (always calculated, never stored) ----------
  getUserStats() {
    const registrations = this.getUserRegistrations();
    const donations = this.getUserDonations();
    const attended = registrations.filter(r => r.status === 'Attended');
    const upcoming = registrations.filter(r => r.status === 'Registered');

    const causes = new Set([
      ...attended.map(r => r.category),
      ...donations.map(d => d.category)
    ].filter(Boolean));

    const itemsCreated =
      this.getCampaigns().filter(c => c.createdByOrganizer).length +
      this.getOpportunities().filter(o => o.createdByOrganizer).length;

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
        id: rule.id,
        title: rule.title,
        icon: rule.icon,
        description: rule.description,
        current: Math.min(current, target),
        target,
        unlocked: current >= target
      };
    });
  }

  // Last 6 months of attended hours + donations, for the chart
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
        donation: donations.filter(d2 => (d2.date || '').startsWith(key)).reduce((s, d2) => s + d2.amount, 0)
      });
    }
    return months;
  }

  // How the user's activity is spread across causes (hours + donations count as activities)
  getCauseDistribution() {
    const counts = {};
    this.getUserRegistrations().filter(r => r.status === 'Attended')
      .forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    this.getUserDonations()
      .forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
    return counts;
  }

  // ---------- Role & organizer identity (demo switches) ----------
  getCurrentRole() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE) || 'volunteer';
  }

  setCurrentRole(role) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, role);
  }

  getOrganizerNgoId() {
    return localStorage.getItem(STORAGE_KEYS.ORGANIZER_NGO) || 'ngo-1';
  }

  setOrganizerNgoId(id) {
    localStorage.setItem(STORAGE_KEYS.ORGANIZER_NGO, id);
  }
}

// Global Store Instance
window.HCStore = new StoreManager();
window.HC_CATEGORIES = CATEGORIES;
window.HC_DATE = { todayISO, isoDaysFromToday, daysBetween };
