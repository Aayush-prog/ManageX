import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import env from '../config/env.js';
import {
  getMyAttendance,
  getTeamAttendance,
  getTeamAttendanceSummary,
  getAllAttendance,
  editAttendance,
  createAttendance,
  createSelfAttendance,
  seedAttendance,
  markAllPresentToday,
} from '../controllers/attendance.controller.js';

const router = Router();

router.use(authenticate);

router.get  ('/config',        (_, res) => res.json({ trackFrom: env.ATTENDANCE_TRACK_FROM }));
router.get  ('/me',            getMyAttendance);
router.post ('/self',          createSelfAttendance);
router.get  ('/team',          allowRoles('coordinator', 'admin'), getTeamAttendance);
router.get  ('/team-summary',  allowRoles('coordinator', 'admin'), getTeamAttendanceSummary);
router.get  ('/all',           allowRoles('coordinator', 'admin'), getAllAttendance);
router.post ('/seed',          allowRoles('coordinator', 'admin'), seedAttendance);
router.post ('/mark-today',    allowRoles('coordinator', 'admin'), markAllPresentToday);
router.post ('/',              allowRoles('coordinator', 'admin'), createAttendance);
router.patch('/:id',           allowRoles('coordinator', 'admin'), editAttendance);

export default router;
