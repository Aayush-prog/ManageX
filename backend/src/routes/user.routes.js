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

// Finance + CEO
router.get ('/',                     allowRoles('finance', 'ceo', 'manager'), listUsers);
router.patch('/update-salary/:id',   allowRoles('finance', 'ceo'),           updateSalary);
router.patch('/update-ssf/:id',      allowRoles('finance', 'ceo'),           updateSSF);

// CEO only
router.get  ('/all',                 allowRoles('ceo'), listAllUsers);
router.post ('/',                    allowRoles('ceo'), createUser);
router.patch('/:id/set-password',    allowRoles('ceo'), adminSetPassword);
router.patch('/:id/toggle-active',   allowRoles('ceo'), toggleActive);

export default router;
