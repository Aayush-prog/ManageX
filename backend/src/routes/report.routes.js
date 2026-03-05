import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { getUserReport } from '../controllers/report.controller.js';

const router = Router();
router.use(authenticate);
router.use(allowRoles('manager', 'admin'));

router.get('/user/:id', getUserReport);

export default router;
