import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import {
  generatePayroll,
  markPaid,
  markAllPaid,
  getMyPayroll,
  getMySSF,
  getMonthlyPayroll,
} from '../controllers/payroll.controller.js';

const router = Router();
router.use(authenticate);

// ── Employee (all roles) ──────────────────────────────────────────────────────
router.get('/my-payroll', getMyPayroll);
router.get('/my-ssf',     getMySSF);

// ── Finance / CEO only ────────────────────────────────────────────────────────
const financeGate = allowRoles('finance', 'admin');

router.get('/month/:month',     financeGate, getMonthlyPayroll);
router.post('/generate/:month', financeGate, generatePayroll);
router.patch('/mark-paid/:id',         financeGate, markPaid);
router.patch('/mark-all-paid/:month',  financeGate, markAllPaid);

export default router;
