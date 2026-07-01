import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import * as ctrl from '../controllers/wfh.controller.js';

const router = Router();

router.use(authenticate);

router.get  ('/my',  ctrl.getMyWFH);
router.post ('/',    ctrl.requestWFH);

router.get  ('/all',          allowRoles('coordinator', 'admin'), ctrl.getAllWFH);
router.patch('/:id/approve',  allowRoles('coordinator', 'admin'), ctrl.approveWFH);
router.patch('/:id/reject',   allowRoles('coordinator', 'admin'), ctrl.rejectWFH);

export default router;
