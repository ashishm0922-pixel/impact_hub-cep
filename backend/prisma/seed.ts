/**
 * Seeds the database with a few of the demo NGOs, drives and campaigns
 * from the frontend (js/store.js). Run with: npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const daysFromToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function main() {
  const greenEarth = await prisma.ngo.upsert({
    where: { slug: 'green-earth-foundation' },
    update: {},
    create: {
      name: 'Green Earth Foundation',
      slug: 'green-earth-foundation',
      category: 'ENVIRONMENT',
      location: 'Pune, Maharashtra',
      email: 'contact@greenearth.example.org',
      website: 'https://greenearth.example.org',
      description: 'Dedicated to urban afforestation, organic farming advocacy, and community waste segregation across Western India.',
      foundedYear: 2017,
      status: 'VERIFIED',
      verifiedAt: new Date()
    }
  });

  const smile = await prisma.ngo.upsert({
    where: { slug: 'smile-education-trust' },
    update: {},
    create: {
      name: 'Smile Education Trust',
      slug: 'smile-education-trust',
      category: 'EDUCATION',
      location: 'Mumbai, Maharashtra',
      email: 'hello@smileeducation.example.org',
      website: 'https://smileeducation.example.org',
      description: 'Empowering underprivileged youth through digital literacy, after-school mentoring, and scholarships for higher studies.',
      foundedYear: 2015,
      status: 'VERIFIED',
      verifiedAt: new Date()
    }
  });

  // Only create sample drives/campaigns once
  if ((await prisma.opportunity.count()) === 0) {
    await prisma.opportunity.createMany({
      data: [
        {
          ngoId: greenEarth.id,
          title: 'Mega Urban Tree Plantation Drive',
          description: 'Join hands to plant 500 native saplings in Pune. Tools, saplings, gloves, and refreshments will be provided.',
          category: 'ENVIRONMENT', city: 'Pune', location: 'Pune (Taljai Hills)',
          date: daysFromToday(12), availability: 'WEEKENDS', hours: 4, volunteersNeeded: 35,
          skills: ['gardening', 'physical work', 'teamwork']
        },
        {
          ngoId: smile.id,
          title: 'Weekend Math & Coding Mentorship',
          description: 'Teach basic computer literacy, logical puzzles, and fundamental algebra to 6th-8th grade students.',
          category: 'EDUCATION', city: 'Mumbai', location: 'Mumbai (Dharavi Learning Hub)',
          date: daysFromToday(4), recurring: 'Every Saturday', availability: 'WEEKENDS', hours: 3, volunteersNeeded: 15,
          skills: ['teaching', 'math', 'coding', 'mentoring']
        }
      ]
    });
  }

  if ((await prisma.campaign.count()) === 0) {
    await prisma.campaign.create({
      data: {
        ngoId: smile.id,
        title: 'Help Build a Digital Classroom for 200 Students',
        description: 'Equipping a community learning center with 10 refurbished laptops, high-speed internet, and solar backup power.',
        category: 'EDUCATION', location: 'Mumbai, Maharashtra',
        goalPaise: 100000 * 100, endDate: daysFromToday(14), featured: true
      }
    });
  }

  console.log('Seed complete.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
