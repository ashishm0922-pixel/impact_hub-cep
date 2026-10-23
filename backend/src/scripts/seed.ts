/**
 * Adds a few sample NGOs, drives and a campaign (mirrors frontend/assets/js/core/seed-data.js).
 * Safe to run more than once: it skips data that already exists.
 *   npm run seed
 */
import 'dotenv/config';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../db/connect';
import { CampaignModel } from '../models/campaign.model';
import { NgoModel } from '../models/ngo.model';
import { OpportunityModel } from '../models/opportunity.model';

const daysFromToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function upsertNgo(data: Record<string, unknown> & { slug: string }) {
  return NgoModel.findOneAndUpdate({ slug: data.slug }, { $setOnInsert: data }, { upsert: true, new: true });
}

async function main() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is missing in backend/.env');
  await connectDb(env.mongoUri);

  const greenEarth = await upsertNgo({
    name: 'Green Earth Foundation', slug: 'green-earth-foundation', category: 'Environment',
    location: 'Pune, Maharashtra', email: 'contact@greenearth.example.org', website: 'https://greenearth.example.org',
    description: 'Dedicated to urban afforestation, organic farming advocacy, and community waste segregation across Western India.',
    foundedYear: 2017, status: 'verified', verifiedAt: new Date()
  });
  const smile = await upsertNgo({
    name: 'Smile Education Trust', slug: 'smile-education-trust', category: 'Education',
    location: 'Mumbai, Maharashtra', email: 'hello@smileeducation.example.org', website: 'https://smileeducation.example.org',
    description: 'Empowering underprivileged youth through digital literacy, after-school mentoring, and scholarships for higher studies.',
    foundedYear: 2015, status: 'verified', verifiedAt: new Date()
  });

  if ((await OpportunityModel.countDocuments()) === 0) {
    await OpportunityModel.create([
      {
        ngo: greenEarth._id, title: 'Mega Urban Tree Plantation Drive',
        description: 'Join hands to plant 500 native saplings in Pune. Tools, saplings, gloves, and refreshments will be provided.',
        category: 'Environment', city: 'Pune', location: 'Pune (Taljai Hills)', date: daysFromToday(12),
        availability: 'Weekends', hours: 4, volunteersNeeded: 35, skills: ['gardening', 'physical work', 'teamwork']
      },
      {
        ngo: smile._id, title: 'Weekend Math & Coding Mentorship',
        description: 'Teach basic computer literacy, logical puzzles, and fundamental algebra to 6th-8th grade students.',
        category: 'Education', city: 'Mumbai', location: 'Mumbai (Dharavi Learning Hub)', date: daysFromToday(4),
        recurring: 'Every Saturday', availability: 'Weekends', hours: 3, volunteersNeeded: 15, skills: ['teaching', 'math', 'coding']
      }
    ]);
  }

  if ((await CampaignModel.countDocuments()) === 0) {
    await CampaignModel.create({
      ngo: smile._id, title: 'Help Build a Digital Classroom for 200 Students',
      description: 'Equipping a community learning center with 10 refurbished laptops, high-speed internet, and solar backup power.',
      category: 'Education', location: 'Mumbai, Maharashtra', goalPaise: 100000 * 100, endDate: daysFromToday(14), featured: true
    });
  }

  console.log('Seed complete.');
}

main()
  .catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
