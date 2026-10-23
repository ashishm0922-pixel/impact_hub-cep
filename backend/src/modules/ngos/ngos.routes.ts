import { Router } from 'express';
import { NgoModel } from '../../models/ngo.model';
import { escapeRegex, listQuerySchema } from '../../shared/schemas';
import { ngoApplicationSchema } from './ngos.schemas';

export const ngoRoutes = Router();

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

// GET /api/ngos?category=&search=
ngoRoutes.get('/', async (req, res) => {
  const { category, search } = listQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = { status: { $ne: 'rejected' } };
  if (category) filter.category = category;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { location: pattern }];
  }
  const ngos = await NgoModel.find(filter).sort({ status: -1, name: 1 });
  res.json(ngos);
});

// POST /api/ngos — new NGOs always start as "pending" (an admin verifies them later)
ngoRoutes.post('/', async (req, res) => {
  const data = ngoApplicationSchema.parse(req.body);
  const ngo = await NgoModel.create({ ...data, website: data.website || undefined, slug: slugify(data.name), status: 'pending' });
  res.status(201).json(ngo);
});
