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

router.get   ('/',         allowRoles('coordinator', 'admin'), getExcursions);
router.post  ('/',         allowRoles('coordinator', 'admin'), createExcursion);
router.delete('/:id',      allowRoles('coordinator', 'admin'), deleteExcursion);
router.post  ('/:id/gpx',  allowRoles('coordinator', 'admin'), upload.single('gpx'), uploadGpx);
router.delete('/:id/gpx',  allowRoles('coordinator', 'admin'), removeGpx);

export default router;
