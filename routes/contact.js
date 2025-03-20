import express from 'express';
import { sendContactMessage, getContactMessages } from '../controllers/contact.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(sendContactMessage)
  .get(protect, admin, getContactMessages);

export default router;
