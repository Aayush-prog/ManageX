import {
  generatePayrollService,
  markPaidService,
  markAllPaidService,
  getMyPayrollService,
  getMySSFService,
  getMonthlyPayrollService,
} from '../services/payroll.service.js';

// POST /api/payroll/generate/:month   [finance, ceo]
export const generatePayroll = async (req, res, next) => {
  try {
    const { month } = req.params;
    const result = await generatePayrollService(month);
    return res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// PATCH /api/payroll/mark-paid/:id   [finance, ceo]
export const markPaid = async (req, res, next) => {
  try {
    const payroll = await markPaidService(req.params.id);
    return res.json({ success: true, data: payroll });
  } catch (err) { next(err); }
};

// PATCH /api/payroll/mark-all-paid/:month   [finance, ceo]
export const markAllPaid = async (req, res, next) => {
  try {
    const result = await markAllPaidService(req.params.month);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /api/payroll/my-payroll   [all authenticated]
export const getMyPayroll = async (req, res, next) => {
  try {
    const records = await getMyPayrollService(req.user.id);
    return res.json({ success: true, data: records });
  } catch (err) { next(err); }
};

// GET /api/payroll/my-ssf   [all authenticated]
export const getMySSF = async (req, res, next) => {
  try {
    const account = await getMySSFService(req.user.id);
    return res.json({ success: true, data: account });
  } catch (err) { next(err); }
};

// GET /api/payroll/month/:month   [finance, ceo]
export const getMonthlyPayroll = async (req, res, next) => {
  try {
    const records = await getMonthlyPayrollService(req.params.month);
    return res.json({ success: true, data: records });
  } catch (err) { next(err); }
};
