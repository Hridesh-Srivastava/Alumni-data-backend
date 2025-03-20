import express from 'express';
import { 
  createAlumni, 
  getAlumni, 
  getAlumniById, 
  updateAlumni, 
  deleteAlumni,
  searchAlumni
} from '../controllers/alumni.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, admin, createAlumni)
  .get(protect, getAlumni);

router.get('/search', protect, searchAlumni);

router.route('/:id')
  .get(protect, getAlumniById)
  .put(protect, admin, updateAlumni)
  .delete(protect, admin, deleteAlumni);

export default router;