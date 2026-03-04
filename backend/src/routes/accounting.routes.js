import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import * as ctrl from '../controllers/accounting.controller.js';

const router = Router();
const fin = [authenticate, allowRoles('finance', 'admin')];

// Expenses
router.get   ('/expenses',           ...fin, ctrl.getExpenses);
router.post  ('/expenses',           ...fin, ctrl.addExpense);
router.patch ('/expenses/:id/status',...fin, ctrl.reviewExpense);

// Bills
router.get   ('/bills',              ...fin, ctrl.getBills);
router.post  ('/bills',              ...fin, ctrl.addBill);
router.patch ('/bills/:id/paid',     ...fin, ctrl.payBill);

// Budgets
router.get   ('/budgets',            ...fin, ctrl.getBudgets);
router.post  ('/budgets',            ...fin, ctrl.setBudget);

// Summary
router.get   ('/summary',            ...fin, ctrl.getSummary);

export default router;
