import { Router } from 'express';
import authRoutes        from './auth.routes.js';
import attendanceRoutes  from './attendance.routes.js';
import payrollRoutes     from './payroll.routes.js';
import userRoutes        from './user.routes.js';
import projectRoutes     from './project.routes.js';
import taskRoutes        from './task.routes.js';
import accountingRoutes  from './accounting.routes.js';
import leaveRoutes       from './leave.routes.js';
import notificationRoutes   from './notification.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'ManageX API is running', timestamp: new Date().toISOString() });
});

router.use('/auth',        authRoutes);
router.use('/attendance',  attendanceRoutes);
router.use('/payroll',     payrollRoutes);
router.use('/users',       userRoutes);
router.use('/projects',    projectRoutes);
router.use('/tasks',       taskRoutes);
router.use('/accounting',  accountingRoutes);
router.use('/leaves',      leaveRoutes);
router.use('/notifications',  notificationRoutes);

export default router;
