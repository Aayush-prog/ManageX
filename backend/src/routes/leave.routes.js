import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import * as ctrl from '../controllers/leave.controller.js';

const router = Router();

// All leave routes require authentication
router.use(authenticate);

// Quota & my leaves — any authenticated user
router.get  ('/quota', ctrl.getQuota);
router.get  ('/my',    ctrl.getMyLeaves);
router.post ('/',      ctrl.requestLeave);

// All leaves — coordinator and admin only
router.get  ('/all', allowRoles('coordinator', 'admin'), ctrl.getAllLeaves);

// Approve / Reject — coordinator and admin only
router.patch('/:id/approve', allowRoles('coordinator', 'admin'), ctrl.approveLeave);
router.patch('/:id/reject',  allowRoles('coordinator', 'admin'), ctrl.rejectLeave);

export default router;
