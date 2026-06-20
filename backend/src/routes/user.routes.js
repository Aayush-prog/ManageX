import { Router } from 'express';
import { authenticate, allowRoles, allowSuperAdmin } from '../middleware/auth.js';
import {
  listUsers,
  listAllUsers,
  createUser,
  updateUser,
  updateSalary,
  updateSSF,
  updateTDS,
  adminSetPassword,
  changePassword,
  toggleActive,
  updateSalaryFromTeam,
} from '../controllers/user.controller.js';

const router = Router();
router.use(authenticate);

// Self-service (any auth)
router.patch('/change-password',     changePassword);

// Finance + Admin + coordinator (can list users)
router.get ('/',                     allowRoles('finance', 'admin', 'coordinator'), listUsers);
router.patch('/update-salary/:id',   allowRoles('finance', 'admin'),               updateSalary);
router.patch('/update-ssf/:id',      allowRoles('finance', 'admin'),               updateSSF);
router.patch('/update-tds/:id',      allowRoles('finance', 'admin'),               updateTDS);

// Super Admin only
router.get  ('/all',                    allowSuperAdmin(), listAllUsers);
router.post ('/',                       allowSuperAdmin(), createUser);
router.patch('/:id/set-password',       allowSuperAdmin(), adminSetPassword);
router.patch('/:id/toggle-active',      allowSuperAdmin(), toggleActive);
router.patch('/:id',                    allowSuperAdmin(), updateUser);
router.patch('/:id/salary-from-team',   allowRoles('finance', 'admin'), updateSalaryFromTeam);

export default router;
