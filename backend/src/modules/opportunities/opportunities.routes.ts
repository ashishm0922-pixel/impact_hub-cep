import { Router } from 'express';
import { requireDb } from '../../lib/prisma';
import { listQuerySchema } from '../../shared/schemas';
import { HttpError } from '../../utils/http-error';
import { registrationSchema } from './opportunities.schemas';

export const opportunityRoutes = Router();

// GET /api/opportunities?category=&city=&search=
opportunityRoutes.get('/', async (req, res) => {
  const db = requireDb();
  const { category, search, city } = listQuerySchema.parse(req.query);
  const opportunities = await db.opportunity.findMany({
    where: {
      category,
      status: 'OPEN',
      date: { gte: new Date(new Date().toDateString()) },
      ...(city && { city: { equals: city, mode: 'insensitive' } }),
      ...(search && { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ] })
    },
    include: {
      ngo: { select: { id: true, name: true, status: true } },
      _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } }
    },
    orderBy: { date: 'asc' }
  });
  res.json(opportunities);
});

// POST /api/opportunities/:id/registrations
opportunityRoutes.post('/:id/registrations', async (req, res) => {
  const db = requireDb();
  const data = registrationSchema.parse(req.body);

  // A transaction so two people can't take the last spot at the same time
  const registration = await db.$transaction(async tx => {
    const opportunity = await tx.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opportunity) throw new HttpError(404, 'Opportunity not found.');
    if (opportunity.status !== 'OPEN') throw new HttpError(409, 'Registration is closed for this opportunity.');

    const taken = await tx.registration.count({
      where: { opportunityId: opportunity.id, status: { not: 'CANCELLED' } }
    });
    if (taken >= opportunity.volunteersNeeded) throw new HttpError(409, 'All spots are filled.');

    return tx.registration.create({
      data: { ...data, opportunityId: opportunity.id, hours: opportunity.hours }
    });
  });

  res.status(201).json(registration);
});
