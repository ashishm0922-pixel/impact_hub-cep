import { Router } from 'express';
import { ContactMessageModel } from '../../models/contact-message.model';
import { contactMessageSchema } from './contact.schemas';

export const contactRoutes = Router();

// POST /api/contact
contactRoutes.post('/', async (req, res) => {
  const data = contactMessageSchema.parse(req.body);
  const message = await ContactMessageModel.create(data);
  res.status(201).json({ id: String(message._id), receivedAt: message.createdAt });
});
