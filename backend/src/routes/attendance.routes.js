import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import {
  getToday,
  clockOut,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
} from '../controllers/attendance.controller.js';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

router.get ('/me/today',  getToday);
router.post('/clock-out', clockOut);
router.get ('/me',        getMyAttendance);
router.get ('/team',      allowRoles('manager', 'ceo'), getTeamAttendance);
router.get ('/all',       allowRoles('ceo'),             getAllAttendance);

export default router;
