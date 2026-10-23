/**
 * HopeConnect AI - Seed (demo) data + date helpers
 * Loaded BEFORE store.js. store.js copies this data into localStorage the
 * first time the site is opened (or after "Reset demo data").
 * Later, this data moves to the database seed (backend/prisma/seed.ts).
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
