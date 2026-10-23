import { Router } from 'express';
import { requireDb } from '../../lib/prisma';
import { contactMessageSchema } from './contact.schemas';

export const contactRoutes = Router();

// POST /api/contact
contactRoutes.post('/', async (req, res) => {
  const db = requireDb();
  const data = contactMessageSchema.parse(req.body);
  const message = await db.contactMessage.create({ data });
  res.status(201).json({ id: message.id, receivedAt: message.createdAt });
});
