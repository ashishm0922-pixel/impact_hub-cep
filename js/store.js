/**
 * HopeConnect AI - Central Data Store (browser localStorage)
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

// ---------- Seed data ----------
const INITIAL_NGOS = [
  {
    id: 'ngo-1',
    name: 'Green Earth Foundation',
    category: 'Environment',
    verified: true,
    status: 'Verified',
    location: 'Pune, Maharashtra',
    logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=600&auto=format&fit=crop&q=80',
    description: 'Dedicated to urban afforestation, organic farming advocacy, and community waste segregation across Western India.',
    volunteersCount: 420,
    activeCampaignsCount: 3,
    foundedYear: 2017,
    rating: 4.9,
    website: 'https://greenearth.example.org'
  },
  {
    id: 'ngo-2',
    name: 'Smile Education Trust',
    category: 'Education',
    verified: true,
    status: 'Verified',
    location: 'Mumbai, Maharashtra',
    logo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    description: 'Empowering underprivileged youth through digital literacy, after-school mentoring, and scholarships for higher studies.',
    volunteersCount: 680,
    activeCampaignsCount: 4,
    foundedYear: 2015,
    rating: 4.8,
    website: 'https://smileeducation.example.org'
  },
  {
    id: 'ngo-3',
    name: 'HealthBridge Foundation',
    category: 'Healthcare',
    verified: true,
    status: 'Verified',
    location: 'Delhi NCR',
    logo: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    description: 'Organizing rural medical checkup camps, maternal healthcare initiatives, and subsidizing critical life-saving medications.',
    volunteersCount: 310,
    activeCampaignsCount: 2,
    foundedYear: 2019,
    rating: 4.9,
    website: 'https://healthbridge.example.org'
  },
  {
    id: 'ngo-4',
    name: 'Paws & Care Sanctuary',
    category: 'Animal Welfare',
    verified: true,
    status: 'Verified',
    location: 'Bengaluru, Karnataka',
    logo: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600&auto=format&fit=crop&q=80',
    description: 'Rescuing injured stray animals, conducting rabies vaccination drives, and facilitating compassionate pet adoptions.',
    volunteersCount: 250,
    activeCampaignsCount: 2,
    foundedYear: 2020,
    rating: 4.7,
    website: 'https://pawsandcare.example.org'
  },
  {
    id: 'ngo-5',
    name: 'Tejaswini Women Collective',
    category: 'Women Empowerment',
    verified: true,
    status: 'Verified',
    location: 'Jaipur, Rajasthan',
    logo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    description: 'Providing vocational skill development, financial literacy workshops, and micro-grant mentorship to rural artisan women.',
    volunteersCount: 190,
    activeCampaignsCount: 3,
    foundedYear: 2018,
    rating: 4.9,
    website: 'https://tejaswini.example.org'
  },
  {
    id: 'ngo-6',
    name: 'ChildHope India',
    category: 'Child Welfare',
    verified: true,
    status: 'Verified',
    location: 'Kolkata, West Bengal',
    logo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80',
    description: 'Nutritional meal distribution, safe shelter homes, and emotional support networks for children in vulnerable slums.',
    volunteersCount: 520,
    activeCampaignsCount: 3,
    foundedYear: 2016,
    rating: 4.8,
    website: 'https://childhope.example.org'
  },
  {
    id: 'ngo-7',
    name: 'Sahara Relief Corps',
    category: 'Disaster Relief',
    verified: true,
    status: 'Verified',
    location: 'Chennai, Tamil Nadu',
    logo: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80',
    description: 'Rapid response emergency disaster assistance, emergency flood relief kits, clean water supply, and rehabilitation.',
    volunteersCount: 380,
    activeCampaignsCount: 1,
    foundedYear: 2014,
    rating: 4.9,
    website: 'https://sahararelief.example.org'
  }
];

// Opportunity dates are generated relative to "today" when the demo data is
// first created, so the demo never shows only expired events.
function buildInitialOpportunities() {
  return [
    {
      id: 'opp-1',
      title: 'Mega Urban Tree Plantation Drive',
      ngoId: 'ngo-1',
      ngoName: 'Green Earth Foundation',
      category: 'Environment',
      location: 'Pune (Taljai Hills)',
      city: 'Pune',
      date: isoDaysFromToday(12),
      recurring: null,
      availability: 'Weekends',
      hours: 4,
      volunteersNeeded: 35,
      volunteersRegistered: 28,
      skillLevel: 'Beginner / Open for all',
      skills: ['gardening', 'physical work', 'teamwork'],
      remote: false,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
      description: 'Join hands to plant 500 native saplings in Pune. Tools, saplings, gloves, and refreshments will be provided.'
    },
    {
      id: 'opp-2',
      title: 'Weekend Math & Coding Mentorship',
      ngoId: 'ngo-2',
      ngoName: 'Smile Education Trust',
      category: 'Education',
      location: 'Mumbai (Dharavi Learning Hub)',
      city: 'Mumbai',
      date: isoDaysFromToday(4),
      recurring: 'Every Saturday',
      availability: 'Weekends',
      hours: 3,
      volunteersNeeded: 15,
      volunteersRegistered: 11,
      skillLevel: 'Intermediate (Math/Computer basics)',
      skills: ['teaching', 'math', 'coding', 'mentoring'],
      remote: false,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
      description: 'Teach basic computer literacy, logical puzzles, and fundamental algebra to 6th-8th grade enthusiastic students.'
    },
    {
      id: 'opp-3',
      title: 'Community Health Screening Assistant',
      ngoId: 'ngo-3',
      ngoName: 'HealthBridge Foundation',
      category: 'Healthcare',
      location: 'Delhi (East Delhi Clinic)',
      city: 'Delhi',
      date: isoDaysFromToday(18),
      recurring: null,
      availability: 'Weekdays',
      hours: 6,
      volunteersNeeded: 20,
      volunteersRegistered: 14,
      skillLevel: 'All welcome (Medical/Non-medical)',
      skills: ['first aid', 'admin', 'data entry', 'communication'],
      remote: false,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
      description: 'Help register patients, manage queue flow, and assist doctors in recording vitals for over 400 rural elders.'
    },
    {
      id: 'opp-4',
      title: 'Shelter Dog Socialization & Grooming',
      ngoId: 'ngo-4',
      ngoName: 'Paws & Care Sanctuary',
      category: 'Animal Welfare',
      location: 'Bengaluru (Sarjapur Shelter)',
      city: 'Bengaluru',
      date: isoDaysFromToday(9),
      recurring: null,
      availability: 'Weekends',
      hours: 3,
      volunteersNeeded: 12,
      volunteersRegistered: 9,
      skillLevel: 'Animal Lovers',
      skills: ['animal care', 'grooming', 'patience'],
      remote: false,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80',
      description: 'Spend an uplifting Sunday morning walking, grooming, feeding, and socializing recovered rescued stray dogs.'
    },
    {
      id: 'opp-5',
      title: 'Artisan Women Digital Marketing Training',
      ngoId: 'ngo-5',
      ngoName: 'Tejaswini Women Collective',
      category: 'Women Empowerment',
      location: 'Jaipur / Hybrid Online',
      city: 'Jaipur',
      date: isoDaysFromToday(15),
      recurring: null,
      availability: 'Weekday Evenings',
      hours: 2,
      volunteersNeeded: 10,
      volunteersRegistered: 6,
      skillLevel: 'Social Media / E-commerce basics',
      skills: ['social media', 'photography', 'marketing', 'e-commerce'],
      remote: true,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
      description: 'Train rural women artisans to photograph handmade textiles and list them on social marketplaces.'
    },
    {
      id: 'opp-6',
      title: 'Sunday Slum Nutrition & Fun Camp',
      ngoId: 'ngo-6',
      ngoName: 'ChildHope India',
      category: 'Child Welfare',
      location: 'Kolkata (Howrah Center)',
      city: 'Kolkata',
      date: isoDaysFromToday(20),
      recurring: null,
      availability: 'Weekends',
      hours: 5,
      volunteersNeeded: 25,
      volunteersRegistered: 18,
      skillLevel: 'Energetic & Caring',
      skills: ['storytelling', 'art', 'cooking', 'teaching'],
      remote: false,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80',
      description: 'Conduct fun drawing competitions, distribute healthy hot meals, and engage kids in storytelling games.'
    },
    {
      id: 'opp-7',
      title: 'Flood Relief Kit Packing Volunteers',
      ngoId: 'ngo-7',
      ngoName: 'Sahara Relief Corps',
      category: 'Disaster Relief',
      location: 'Chennai (Guindy Warehouse)',
      city: 'Chennai',
      date: isoDaysFromToday(6),
      recurring: null,
      availability: 'Flexible',
      hours: 4,
      volunteersNeeded: 40,
      volunteersRegistered: 22,
      skillLevel: 'Open for all',
      skills: ['logistics', 'physical work', 'teamwork'],
      remote: false,
      status: 'Open',
      image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&auto=format&fit=crop&q=80',
      description: 'Pack and label dry-ration and hygiene kits for families affected by coastal flooding.'
    }
  ];
}

function buildInitialCampaigns() {
  return [
    {
      id: 'camp-1',
      title: 'Help Build a Digital Classroom for 200 Students',
      ngoId: 'ngo-2',
      ngoName: 'Smile Education Trust',
      category: 'Education',
      location: 'Mumbai, Maharashtra',
      raised: 78500,
      goal: 100000,
      supporters: 142,
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
      description: 'Equipping a community learning center with 10 refurbished laptops, high-speed internet, and solar backup power.',
      featured: true,
      endDate: isoDaysFromToday(14),
      status: 'Active'
    },
    {
      id: 'camp-2',
      title: 'Clean Water & Afforestation Project in Western Ghats',
      ngoId: 'ngo-1',
      ngoName: 'Green Earth Foundation',
      category: 'Environment',
      location: 'Pune & Sahyadri Foothills',
      raised: 135000,
      goal: 180000,
      supporters: 215,
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
      description: 'Restoring damaged water catchment areas, creating check dams, and planting 5,000 broadleaf endemic trees.',
      featured: true,
      endDate: isoDaysFromToday(22),
      status: 'Active'
    },
    {
      id: 'camp-3',
      title: 'Mobile Health Van for Remote Village Clinics',
      ngoId: 'ngo-3',
      ngoName: 'HealthBridge Foundation',
      category: 'Healthcare',
      location: 'Delhi & NCR Outskirts',
      raised: 245000,
      goal: 300000,
      supporters: 380,
      image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
      description: 'Deploying an equipped medical van with diagnostic kits, ultrasound, ECG, and essential free medicines to 15 remote villages.',
      featured: true,
      endDate: isoDaysFromToday(9),
      status: 'Active'
    },
    {
      id: 'camp-4',
      title: 'Emergency Medical Care for Rescued Street Animals',
      ngoId: 'ngo-4',
      ngoName: 'Paws & Care Sanctuary',
      category: 'Animal Welfare',
      location: 'Bengaluru, Karnataka',
      raised: 42000,
      goal: 60000,
      supporters: 96,
      image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80',
      description: 'Funding critical orthopedic surgeries, medicines, and specialized foster care for injured community strays.',
      featured: false,
      endDate: isoDaysFromToday(18),
      status: 'Active'
    },
    {
      id: 'camp-5',
      title: 'Micro-grants for 50 Rural Women Entrepreneurs',
      ngoId: 'ngo-5',
      ngoName: 'Tejaswini Women Collective',
      category: 'Women Empowerment',
      location: 'Jaipur, Rajasthan',
      raised: 89000,
      goal: 125000,
      supporters: 130,
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
      description: 'Seed funding of ₹2,500 each to help women purchase sewing machines, dairy equipment, or organic seed kits.',
      featured: false,
      endDate: isoDaysFromToday(30),
      status: 'Active'
    }
  ];
}

const DEMO_PROFILE = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  role: 'volunteer',
  isDemo: true
};

// Past activity for the demo user, so the Impact page has something to show.
// "Attended" = the organizer confirmed attendance, so the hours count.
function buildInitialRegistrations() {
  const me = DEMO_PROFILE;
  return [
    {
      id: 'reg-seed-1', opportunityId: 'opp-past-1',
      opportunityTitle: 'Riverbank Clean-up Drive', ngoId: 'ngo-1', ngoName: 'Green Earth Foundation',
      category: 'Environment', eventDate: isoDaysFromToday(-75), hours: 4,
      name: me.name, email: me.email, phone: '+91 98765 43210', skills: 'Gardening, Photography',
      availability: 'Weekends', dateApplied: isoDaysFromToday(-82), status: 'Attended'
    },
    {
      id: 'reg-seed-2', opportunityId: 'opp-past-2',
      opportunityTitle: 'Weekend Reading Circle', ngoId: 'ngo-2', ngoName: 'Smile Education Trust',
      category: 'Education', eventDate: isoDaysFromToday(-40), hours: 3,
      name: me.name, email: me.email, phone: '+91 98765 43210', skills: 'Teaching',
      availability: 'Weekends', dateApplied: isoDaysFromToday(-45), status: 'Attended'
    },
    {
      id: 'reg-seed-3', opportunityId: 'opp-1',
      opportunityTitle: 'Mega Urban Tree Plantation Drive', ngoId: 'ngo-1', ngoName: 'Green Earth Foundation',
      category: 'Environment', eventDate: isoDaysFromToday(12), hours: 4,
      name: me.name, email: me.email, phone: '+91 98765 43210', skills: 'Gardening, Team Coordination',
      availability: 'Weekends', dateApplied: isoDaysFromToday(-3), status: 'Registered'
    },
    // Other volunteers (visible to organizers)
    {
      id: 'reg-seed-4', opportunityId: 'opp-1',
      opportunityTitle: 'Mega Urban Tree Plantation Drive', ngoId: 'ngo-1', ngoName: 'Green Earth Foundation',
      category: 'Environment', eventDate: isoDaysFromToday(12), hours: 4,
      name: 'Rohan Deshmukh', email: 'rohan.d@example.com', phone: '+91 90000 11111', skills: 'Physical labour, Driving',
      availability: 'Weekends', dateApplied: isoDaysFromToday(-6), status: 'Registered'
    },
    {
      id: 'reg-seed-5', opportunityId: 'opp-2',
      opportunityTitle: 'Weekend Math & Coding Mentorship', ngoId: 'ngo-2', ngoName: 'Smile Education Trust',
      category: 'Education', eventDate: isoDaysFromToday(4), hours: 3,
      name: 'Priya Nair', email: 'priya.nair@example.com', phone: '+91 90000 22222', skills: 'Teaching, Python',
      availability: 'Weekends', dateApplied: isoDaysFromToday(-10), status: 'Registered'
    }
  ];
}

function buildInitialDonations() {
  const me = DEMO_PROFILE;
  return [
    {
      id: 'don-seed-1', campaignId: 'camp-1', campaignTitle: 'Help Build a Digital Classroom for 200 Students',
      ngoId: 'ngo-2', ngoName: 'Smile Education Trust', category: 'Education',
      amount: 2500, date: isoDaysFromToday(-60), donorName: me.name, donorEmail: me.email,
      reference: 'DEMO-892144', isDemo: true
    },
    {
      id: 'don-seed-2', campaignId: 'camp-2', campaignTitle: 'Clean Water & Afforestation Project in Western Ghats',
      ngoId: 'ngo-1', ngoName: 'Green Earth Foundation', category: 'Environment',
      amount: 1500, date: isoDaysFromToday(-20), donorName: me.name, donorEmail: me.email,
      reference: 'DEMO-652190', isDemo: true
    }
  ];
}

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
    if (!reg) return null;

    const wasActive = reg.status !== 'Cancelled';
    reg.status = status;
    this.write(STORAGE_KEYS.REGISTRATIONS, registrations);

    // Free up the spot when a registration is cancelled
    if (wasActive && status === 'Cancelled') {
      const opp = this.getOpportunityById(reg.opportunityId);
      if (opp) this.updateOpportunity(opp.id, { volunteersRegistered: Math.max(0, opp.volunteersRegistered - 1) });
    }
    return reg;
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
