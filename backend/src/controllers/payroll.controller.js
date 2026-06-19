import {
  generatePayrollService,
  markPaidService,
  markAllPaidService,
  getMyPayrollService,
  getMySSFService,
  getMonthlyPayrollService,
} from '../services/payroll.service.js';

const getTeamId = (req) => req.headers['x-active-team'] || null;

export const generatePayroll = async (req, res, next) => {
  try {
    const result = await generatePayrollService(req.params.month, getTeamId(req));
    return res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const markPaid = async (req, res, next) => {
  try {
    const payroll = await markPaidService(req.params.id);
    return res.json({ success: true, data: payroll });
  } catch (err) { next(err); }
};

export const markAllPaid = async (req, res, next) => {
  try {
    const result = await markAllPaidService(req.params.month, getTeamId(req));
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getMyPayroll = async (req, res, next) => {
  try {
    const records = await getMyPayrollService(req.user.id);
    return res.json({ success: true, data: records });
  } catch (err) { next(err); }
};

export const getMySSF = async (req, res, next) => {
  try {
    const account = await getMySSFService(req.user.id);
    return res.json({ success: true, data: account });
  } catch (err) { next(err); }
};

export const getMonthlyPayroll = async (req, res, next) => {
  try {
    const records = await getMonthlyPayrollService(req.params.month, getTeamId(req));
    return res.json({ success: true, data: records });
  } catch (err) { next(err); }
};
