import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getExcursions,
  createExcursion,
  deleteExcursion,
  uploadGpx,
  removeGpx,
} from '../controllers/excursion.controller.js';

const router = Router();
router.use(authenticate);

router.get   ('/',         allowRoles('manager', 'admin'), getExcursions);
router.post  ('/',         allowRoles('manager', 'admin'), createExcursion);
router.delete('/:id',      allowRoles('manager', 'admin'), deleteExcursion);
router.post  ('/:id/gpx',  allowRoles('manager', 'admin'), upload.single('gpx'), uploadGpx);
router.delete('/:id/gpx',  allowRoles('manager', 'admin'), removeGpx);

export default router;
