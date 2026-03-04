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

// All leaves — manager and admin only
router.get  ('/all', allowRoles('manager', 'admin'), ctrl.getAllLeaves);

// Approve / Reject — manager and admin only
router.patch('/:id/approve', allowRoles('manager', 'admin'), ctrl.approveLeave);
router.patch('/:id/reject',  allowRoles('manager', 'admin'), ctrl.rejectLeave);

export default router;
