import { Router } from 'express';
import { requireDb } from '../../lib/prisma';
import { listQuerySchema } from '../../shared/schemas';
import { ngoApplicationSchema } from './ngos.schemas';

export const ngoRoutes = Router();

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

// GET /api/ngos?category=&search=
ngoRoutes.get('/', async (req, res) => {
  const db = requireDb();
  const { category, search } = listQuerySchema.parse(req.query);
  const ngos = await db.ngo.findMany({
    where: {
      category,
      status: { not: 'REJECTED' },
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ] })
    },
    orderBy: [{ status: 'desc' }, { name: 'asc' }]
  });
  res.json(ngos);
});

// POST /api/ngos — new NGOs always start as PENDING_VERIFICATION (an admin verifies them later)
ngoRoutes.post('/', async (req, res) => {
  const db = requireDb();
  const data = ngoApplicationSchema.parse(req.body);
  const ngo = await db.ngo.create({
    data: { ...data, website: data.website || null, slug: slugify(data.name), status: 'PENDING_VERIFICATION' }
  });
  res.status(201).json(ngo);
});
