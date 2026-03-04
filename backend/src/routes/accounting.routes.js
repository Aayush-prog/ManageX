import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as ctrl from '../controllers/accounting.controller.js';

const router = Router();
const fin = [authenticate, allowRoles('finance', 'admin')];

// Expenses
router.get   ('/expenses',                    ...fin, ctrl.getExpenses);
router.post  ('/expenses',                    ...fin, ctrl.addExpense);
router.patch ('/expenses/:id/status',         ...fin, ctrl.reviewExpense);
router.post  ('/expenses/:id/attachment',     ...fin, upload.single('file'), ctrl.attachExpense);

// Bills
router.get   ('/bills',                   ...fin, ctrl.getBills);
router.post  ('/bills',                   ...fin, ctrl.addBill);
router.patch ('/bills/:id/paid',          ...fin, ctrl.payBill);
router.post  ('/bills/:id/attachment',    ...fin, upload.single('file'), ctrl.attachBill);

// Budgets
router.get   ('/budgets',            ...fin, ctrl.getBudgets);
router.post  ('/budgets',            ...fin, ctrl.setBudget);

// Summary
router.get   ('/summary',            ...fin, ctrl.getSummary);

// Project Deposits
router.get   ('/deposits',                       ...fin, ctrl.getDeposits);
router.post  ('/deposits',                       ...fin, ctrl.addDeposit);
router.post  ('/deposits/:id/attachment',        ...fin, upload.single('file'), ctrl.attachDeposit);
router.get   ('/projects/:projectId/financials', ...fin, ctrl.getProjectFinancials);

export default router;
