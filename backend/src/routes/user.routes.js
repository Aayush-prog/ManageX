import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import {
  listUsers,
  listAllUsers,
  createUser,
  updateSalary,
  updateSSF,
  adminSetPassword,
  changePassword,
  toggleActive,
} from '../controllers/user.controller.js';

const router = Router();
router.use(authenticate);

// Self-service (any auth)
router.patch('/change-password',     changePassword);

// Finance + Admin
router.get ('/',                     allowRoles('finance', 'admin', 'manager'), listUsers);
router.patch('/update-salary/:id',   allowRoles('finance', 'admin'),            updateSalary);
router.patch('/update-ssf/:id',      allowRoles('finance', 'admin'),            updateSSF);

// Admin only
router.get  ('/all',                 allowRoles('admin'), listAllUsers);
router.post ('/',                    allowRoles('admin'), createUser);
router.patch('/:id/set-password',    allowRoles('admin'), adminSetPassword);
router.patch('/:id/toggle-active',   allowRoles('admin'), toggleActive);

export default router;
