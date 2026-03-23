import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { getExcursions, createExcursion, deleteExcursion } from '../controllers/excursion.controller.js';

const router = Router();
router.use(authenticate);

router.get   ('/',    allowRoles('manager', 'admin'), getExcursions);
router.post  ('/',    allowRoles('manager', 'admin'), createExcursion);
router.delete('/:id', allowRoles('manager', 'admin'), deleteExcursion);

export default router;
