/**
 * Sample NGOs, drives and campaigns so a brand-new database is not empty.
 * Added by seedSampleData() for any sample NGO that is missing (never duplicates).
 * Generated from the original frontend demo data. Dates are relative to today.
 */
import { CampaignModel } from '../models/campaign.model';
import { NgoModel } from '../models/ngo.model';
import { OpportunityModel } from '../models/opportunity.model';
import { daysFromToday } from '../utils/dates';

const SAMPLE_NGOS = [
  {
    key: "ngo-1",
    name: "Green Earth Foundation",
    category: "Environment",
    location: "Pune, Maharashtra",
    logoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Dedicated to urban afforestation, organic farming advocacy, and community waste segregation across Western India.",
    foundedYear: 2017,
    website: "https://greenearth.example.org"
  },
  {
    key: "ngo-2",
    name: "Smile Education Trust",
    category: "Education",
    location: "Mumbai, Maharashtra",
    logoUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    description: "Empowering underprivileged youth through digital literacy, after-school mentoring, and scholarships for higher studies.",
    foundedYear: 2015,
    website: "https://smileeducation.example.org"
  },
  {
    key: "ngo-3",
    name: "HealthBridge Foundation",
    category: "Healthcare",
    location: "Delhi NCR",
    logoUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    description: "Organizing rural medical checkup camps, maternal healthcare initiatives, and subsidizing critical life-saving medications.",
    foundedYear: 2019,
    website: "https://healthbridge.example.org"
  },
  {
    key: "ngo-4",
    name: "Paws & Care Sanctuary",
    category: "Animal Welfare",
    location: "Bengaluru, Karnataka",
    logoUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600&auto=format&fit=crop&q=80",
    description: "Rescuing injured stray animals, conducting rabies vaccination drives, and facilitating compassionate pet adoptions.",
    foundedYear: 2020,
    website: "https://pawsandcare.example.org"
  },
  {
    key: "ngo-5",
    name: "Tejaswini Women Collective",
    category: "Women Empowerment",
    location: "Jaipur, Rajasthan",
    logoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    description: "Providing vocational skill development, financial literacy workshops, and micro-grant mentorship to rural artisan women.",
    foundedYear: 2018,
    website: "https://tejaswini.example.org"
  },
  {
    key: "ngo-6",
    name: "ChildHope India",
    category: "Child Welfare",
    location: "Kolkata, West Bengal",
    logoUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
    description: "Nutritional meal distribution, safe shelter homes, and emotional support networks for children in vulnerable slums.",
    foundedYear: 2016,
    website: "https://childhope.example.org"
  },
  {
    key: "ngo-7",
    name: "Sahara Relief Corps",
    category: "Disaster Relief",
    location: "Chennai, Tamil Nadu",
    logoUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80",
    description: "Rapid response emergency disaster assistance, emergency flood relief kits, clean water supply, and rehabilitation.",
    foundedYear: 2014,
    website: "https://sahararelief.example.org"
  },
  {
    key: "ngo-8",
    name: "Ganga Saaf Trust",
    category: "Environment",
    location: "Varanasi, Uttar Pradesh",
    logoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Cleaning ghats and riverbanks, setting up waste-collection points and teaching boatmen and vendors about plastic-free livelihoods.",
    foundedYear: 2016,
    website: "https://gangasaaftrust.example.org"
  },
  {
    key: "ngo-9",
    name: "Vidya Jyoti Foundation",
    category: "Education",
    location: "Lucknow, Uttar Pradesh",
    logoUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    description: "Running free evening classes, book libraries and exam-prep support for first-generation learners in city slums.",
    foundedYear: 2014,
    website: "https://vidyajyotifoundation.example.org"
  },
  {
    key: "ngo-10",
    name: "Arogya Seva Mission",
    category: "Healthcare",
    location: "Hyderabad, Telangana",
    logoUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    description: "Organising free diabetes and blood-pressure screening camps and low-cost diagnostics for informal workers and their families.",
    foundedYear: 2018,
    website: "https://arogyasevamission.example.org"
  },
  {
    key: "ngo-11",
    name: "Street Paws Rescue",
    category: "Animal Welfare",
    location: "Chennai, Tamil Nadu",
    logoUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600&auto=format&fit=crop&q=80",
    description: "Rescuing, sterilising and vaccinating community dogs and cats, and finding loving adopters through weekend adoption drives.",
    foundedYear: 2019,
    website: "https://streetpawsrescue.example.org"
  },
  {
    key: "ngo-12",
    name: "Shakti Sewing Circle",
    category: "Women Empowerment",
    location: "Indore, Madhya Pradesh",
    logoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    description: "Training women in tailoring and small-business skills, then helping them form cooperatives that sell to local boutiques.",
    foundedYear: 2017,
    website: "https://shaktisewingcircle.example.org"
  },
  {
    key: "ngo-13",
    name: "Little Steps Trust",
    category: "Child Welfare",
    location: "Patna, Bihar",
    logoUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
    description: "Running day-care and nutrition centres for children of migrant labourers, with health check-ups and school-enrolment help.",
    foundedYear: 2015,
    website: "https://littlestepstrust.example.org"
  },
  {
    key: "ngo-14",
    name: "Rapid Relief Network",
    category: "Disaster Relief",
    location: "Bhubaneswar, Odisha",
    logoUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80",
    description: "A trained volunteer force that delivers food, clean water and shelter kits within 24 hours of cyclones and floods on the eastern coast.",
    foundedYear: 2013,
    website: "https://rapidreliefnetwork.example.org"
  },
  {
    key: "ngo-15",
    name: "Urban Green Roofs",
    category: "Environment",
    location: "Ahmedabad, Gujarat",
    logoUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Turning bare city rooftops and school terraces into shaded vegetable gardens that cool buildings and feed neighbourhoods.",
    foundedYear: 2020,
    website: "https://urbangreenroofs.example.org"
  },
  {
    key: "ngo-16",
    name: "Digital Gurukul India",
    category: "Education",
    location: "Kochi, Kerala",
    logoUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    description: "Bringing refurbished computers, coding clubs and English-speaking practice to government schools and coastal communities.",
    foundedYear: 2021,
    website: "https://digitalgurukulindia.example.org"
  },
  {
    key: "ngo-17",
    name: "Drishti Eye Care Foundation",
    category: "Healthcare",
    location: "Nagpur, Maharashtra",
    logoUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    description: "Free eye check-ups, spectacles and cataract surgeries for elderly people and schoolchildren in rural Vidarbha.",
    foundedYear: 2012,
    website: "https://drishtieyecarefoundation.example.org"
  }
];

const SAMPLE_OPPORTUNITIES = [
  {
    ngo: "ngo-1",
    title: "Mega Urban Tree Plantation Drive",
    category: "Environment",
    location: "Pune (Taljai Hills)",
    city: "Pune",
    days: 12,
    recurring: null,
    availability: "Weekends",
    hours: 4,
    volunteersNeeded: 35,
    skillLevel: "Beginner / Open for all",
    skills: [
      "gardening",
      "physical work",
      "teamwork"
    ],
    remote: false,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Join hands to plant 500 native saplings in Pune. Tools, saplings, gloves, and refreshments will be provided."
  },
  {
    ngo: "ngo-2",
    title: "Weekend Math & Coding Mentorship",
    category: "Education",
    location: "Mumbai (Dharavi Learning Hub)",
    city: "Mumbai",
    days: 4,
    recurring: "Every Saturday",
    availability: "Weekends",
    hours: 3,
    volunteersNeeded: 15,
    skillLevel: "Intermediate (Math/Computer basics)",
    skills: [
      "teaching",
      "math",
      "coding",
      "mentoring"
    ],
    remote: false,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    description: "Teach basic computer literacy, logical puzzles, and fundamental algebra to 6th-8th grade enthusiastic students."
  },
  {
    ngo: "ngo-3",
    title: "Community Health Screening Assistant",
    category: "Healthcare",
    location: "Delhi (East Delhi Clinic)",
    city: "Delhi",
    days: 18,
    recurring: null,
    availability: "Weekdays",
    hours: 6,
    volunteersNeeded: 20,
    skillLevel: "All welcome (Medical/Non-medical)",
    skills: [
      "first aid",
      "admin",
      "data entry",
      "communication"
    ],
    remote: false,
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    description: "Help register patients, manage queue flow, and assist doctors in recording vitals for over 400 rural elders."
  },
  {
    ngo: "ngo-4",
    title: "Shelter Dog Socialization & Grooming",
    category: "Animal Welfare",
    location: "Bengaluru (Sarjapur Shelter)",
    city: "Bengaluru",
    days: 9,
    recurring: null,
    availability: "Weekends",
    hours: 3,
    volunteersNeeded: 12,
    skillLevel: "Animal Lovers",
    skills: [
      "animal care",
      "grooming",
      "patience"
    ],
    remote: false,
    imageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80",
    description: "Spend an uplifting Sunday morning walking, grooming, feeding, and socializing recovered rescued stray dogs."
  },
  {
    ngo: "ngo-5",
    title: "Artisan Women Digital Marketing Training",
    category: "Women Empowerment",
    location: "Jaipur / Hybrid Online",
    city: "Jaipur",
    days: 15,
    recurring: null,
    availability: "Weekday Evenings",
    hours: 2,
    volunteersNeeded: 10,
    skillLevel: "Social Media / E-commerce basics",
    skills: [
      "social media",
      "photography",
      "marketing",
      "e-commerce"
    ],
    remote: true,
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    description: "Train rural women artisans to photograph handmade textiles and list them on social marketplaces."
  },
  {
    ngo: "ngo-6",
    title: "Sunday Slum Nutrition & Fun Camp",
    category: "Child Welfare",
    location: "Kolkata (Howrah Center)",
    city: "Kolkata",
    days: 20,
    recurring: null,
    availability: "Weekends",
    hours: 5,
    volunteersNeeded: 25,
    skillLevel: "Energetic & Caring",
    skills: [
      "storytelling",
      "art",
      "cooking",
      "teaching"
    ],
    remote: false,
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
    description: "Conduct fun drawing competitions, distribute healthy hot meals, and engage kids in storytelling games."
  },
  {
    ngo: "ngo-7",
    title: "Flood Relief Kit Packing Volunteers",
    category: "Disaster Relief",
    location: "Chennai (Guindy Warehouse)",
    city: "Chennai",
    days: 6,
    recurring: null,
    availability: "Flexible",
    hours: 4,
    volunteersNeeded: 40,
    skillLevel: "Open for all",
    skills: [
      "logistics",
      "physical work",
      "teamwork"
    ],
    remote: false,
    imageUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&auto=format&fit=crop&q=80",
    description: "Pack and label dry-ration and hygiene kits for families affected by coastal flooding."
  }
];

const SAMPLE_CAMPAIGNS = [
  {
    ngo: "ngo-2",
    title: "Help Build a Digital Classroom for 200 Students",
    category: "Education",
    location: "Mumbai, Maharashtra",
    raised: 78500,
    goal: 100000,
    supporters: 142,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    description: "Equipping a community learning center with 10 refurbished laptops, high-speed internet, and solar backup power.",
    featured: true,
    days: 14
  },
  {
    ngo: "ngo-1",
    title: "Clean Water & Afforestation Project in Western Ghats",
    category: "Environment",
    location: "Pune & Sahyadri Foothills",
    raised: 135000,
    goal: 180000,
    supporters: 215,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Restoring damaged water catchment areas, creating check dams, and planting 5,000 broadleaf endemic trees.",
    featured: true,
    days: 22
  },
  {
    ngo: "ngo-3",
    title: "Mobile Health Van for Remote Village Clinics",
    category: "Healthcare",
    location: "Delhi & NCR Outskirts",
    raised: 245000,
    goal: 300000,
    supporters: 380,
    imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
    description: "Deploying an equipped medical van with diagnostic kits, ultrasound, ECG, and essential free medicines to 15 remote villages.",
    featured: true,
    days: 9
  },
  {
    ngo: "ngo-4",
    title: "Emergency Medical Care for Rescued Street Animals",
    category: "Animal Welfare",
    location: "Bengaluru, Karnataka",
    raised: 42000,
    goal: 60000,
    supporters: 96,
    imageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80",
    description: "Funding critical orthopedic surgeries, medicines, and specialized foster care for injured community strays.",
    featured: false,
    days: 18
  },
  {
    ngo: "ngo-5",
    title: "Micro-grants for 50 Rural Women Entrepreneurs",
    category: "Women Empowerment",
    location: "Jaipur, Rajasthan",
    raised: 89000,
    goal: 125000,
    supporters: 130,
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    description: "Seed funding of ₹2,500 each to help women purchase sewing machines, dairy equipment, or organic seed kits.",
    featured: false,
    days: 30
  },
  {
    ngo: "ngo-8",
    title: "Plastic-Free Ghats: 20 Waste Collection Points",
    category: "Environment",
    location: "Varanasi, Uttar Pradesh",
    raised: 41000,
    goal: 80000,
    supporters: 87,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Installing 20 covered collection points and paying local women to sort and recycle riverside waste every day.",
    featured: false,
    days: 21
  },
  {
    ngo: "ngo-9",
    title: "Evening Classes and Library for 300 Children",
    category: "Education",
    location: "Lucknow, Uttar Pradesh",
    raised: 52500,
    goal: 75000,
    supporters: 118,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    description: "Setting up two learning rooms with books, desks and trained tutors so 300 children can study safely after school.",
    featured: true,
    days: 26
  },
  {
    ngo: "ngo-10",
    title: "Free Diabetes Screening Camps in 40 Colonies",
    category: "Healthcare",
    location: "Hyderabad, Telangana",
    raised: 96000,
    goal: 120000,
    supporters: 204,
    imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
    description: "Mobile screening teams, test kits and follow-up consultations for informal workers who cannot afford a clinic visit.",
    featured: true,
    days: 12
  },
  {
    ngo: "ngo-11",
    title: "Vaccinate and Sterilise 500 Street Dogs",
    category: "Animal Welfare",
    location: "Chennai, Tamil Nadu",
    raised: 33500,
    goal: 60000,
    supporters: 76,
    imageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80",
    description: "Paying for vets, anti-rabies vaccines and post-surgery care to keep Chennai neighbourhoods safe for people and animals.",
    featured: false,
    days: 19
  },
  {
    ngo: "ngo-12",
    title: "Sewing Machines for 40 Women Entrepreneurs",
    category: "Women Empowerment",
    location: "Indore, Madhya Pradesh",
    raised: 64000,
    goal: 100000,
    supporters: 142,
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    description: "Each woman receives a machine, a fabric starter pack and three months of business mentoring to earn her own income.",
    featured: false,
    days: 28
  },
  {
    ngo: "ngo-13",
    title: "Nutritious Meals for 200 Migrant Children",
    category: "Child Welfare",
    location: "Patna, Bihar",
    raised: 47000,
    goal: 70000,
    supporters: 133,
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
    description: "Daily hot meals, health check-ups and school-readiness classes at two day-care centres near construction sites.",
    featured: true,
    days: 15
  },
  {
    ngo: "ngo-14",
    title: "Cyclone Response Kits for 1,000 Families",
    category: "Disaster Relief",
    location: "Bhubaneswar, Odisha",
    raised: 138000,
    goal: 200000,
    supporters: 261,
    imageUrl: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80",
    description: "Pre-packed kits with dry rations, water purifiers, tarpaulins and first-aid supplies, stored ahead of the cyclone season.",
    featured: true,
    days: 10
  },
  {
    ngo: "ngo-15",
    title: "Rooftop Vegetable Gardens for 25 Schools",
    category: "Environment",
    location: "Ahmedabad, Gujarat",
    raised: 28500,
    goal: 65000,
    supporters: 69,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
    description: "Building grow-beds and rain-water tanks on school terraces so children learn farming and take home fresh vegetables.",
    featured: false,
    days: 33
  },
  {
    ngo: "ngo-16",
    title: "Computer Lab for 5 Government Schools",
    category: "Education",
    location: "Kochi, Kerala",
    raised: 71000,
    goal: 90000,
    supporters: 156,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    description: "Refurbished laptops, solar backup and trained volunteer teachers for coding clubs in five coastal schools.",
    featured: false,
    days: 17
  },
  {
    ngo: "ngo-17",
    title: "Free Cataract Surgeries for 150 Elders",
    category: "Healthcare",
    location: "Nagpur, Maharashtra",
    raised: 105000,
    goal: 135000,
    supporters: 227,
    imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
    description: "Covers surgery, lens, medicines and transport so elderly villagers can see clearly again, at no cost to them.",
    featured: true,
    days: 14
  }
];

const DEAD_BANNER = 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=600&auto=format&fit=crop&q=80';
const WORKING_BANNER = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80';

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Adds every sample NGO that is not in the database yet, together with ITS drives and campaigns.
 * Safe to run on every start-up: NGOs that already exist (same slug or name) are skipped,
 * so nothing is duplicated and real NGOs are never touched.
 * Returns how many sample NGOs were added.
 */
export async function seedSampleData() {
  // Repair: this banner image was removed from Unsplash, so databases created earlier have a dead link
  await NgoModel.updateMany({ bannerUrl: DEAD_BANNER }, { bannerUrl: WORKING_BANNER });

  const addedKeys = new Set<string>();
  const idByKey = new Map<string, unknown>();

  for (const { key, ...ngo } of SAMPLE_NGOS) {
    const slug = slugify(ngo.name);
    if (await NgoModel.exists({ $or: [{ slug }, { name: ngo.name }] })) continue;
    const doc = await NgoModel.create({
      ...ngo,
      slug,
      email: `contact@${slug}.example.org`,
      status: 'verified',
      reviewedAt: new Date(),
      isSample: true
    });
    idByKey.set(key, doc._id);
    addedKeys.add(key);
  }

  const newOpportunities = SAMPLE_OPPORTUNITIES.filter(o => addedKeys.has(o.ngo));
  const newCampaigns = SAMPLE_CAMPAIGNS.filter(c => addedKeys.has(c.ngo));

  if (newOpportunities.length) {
    await OpportunityModel.insertMany(
      newOpportunities.map(({ ngo, days, ...opp }) => ({ ...opp, ngo: idByKey.get(ngo), date: daysFromToday(days) }))
    );
  }
  if (newCampaigns.length) {
    await CampaignModel.insertMany(
      newCampaigns.map(({ ngo, days, raised, goal, supporters, ...c }) => ({
        ...c,
        ngo: idByKey.get(ngo),
        goalPaise: goal * 100,
        baselineRaisedPaise: raised * 100,
        baselineSupporters: supporters,
        endDate: daysFromToday(days)
      }))
    );
  }
  return addedKeys.size;
}
