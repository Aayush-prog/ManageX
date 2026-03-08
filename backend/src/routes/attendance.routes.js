import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import env from '../config/env.js';
import {
  getToday,
  clockOut,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  editAttendance,
} from '../controllers/attendance.controller.js';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

router.get  ('/config',    (_, res) => res.json({ trackFrom: env.ATTENDANCE_TRACK_FROM }));
router.get  ('/me/today',  getToday);
router.post ('/clock-out', clockOut);
router.get  ('/me',        getMyAttendance);
router.get  ('/team',      allowRoles('manager', 'admin'), getTeamAttendance);
router.get  ('/all',       allowRoles('admin'),            getAllAttendance);
router.patch('/:id',       allowRoles('manager', 'admin'), editAttendance);

export default router;
