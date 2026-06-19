import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import env from '../config/env.js';
import {
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  editAttendance,
  createAttendance,
} from '../controllers/attendance.controller.js';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

router.get  ('/config',    (_, res) => res.json({ trackFrom: env.ATTENDANCE_TRACK_FROM }));
router.get  ('/me',        getMyAttendance);
router.get  ('/team',      allowRoles('coordinator', 'admin'), getTeamAttendance);
router.get  ('/all',       allowRoles('coordinator', 'admin'), getAllAttendance);
router.post ('/',          allowRoles('coordinator', 'admin'), createAttendance);
router.patch('/:id',       allowRoles('coordinator', 'admin'), editAttendance);

export default router;
