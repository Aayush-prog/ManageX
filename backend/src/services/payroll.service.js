import User from '../models/User.js';
import Payroll from '../models/Payroll.js';
import SSFAccount from '../models/SSFAccount.js';

const round2 = (n) => parseFloat(n.toFixed(2));

const calcSSF = (user) => {
  const base        = user.monthlySalary;
  const employeeSSF = round2(base * (user.ssfEmployeePercent / 100));
  const employerSSF = round2(base * (user.ssfEmployerPercent / 100));
  return {
    baseSalary:         base,
    employeeSSF,
    employerSSF,
    totalSSF:           round2(employeeSSF + employerSSF),
    finalPayableSalary: round2(base - employeeSSF),
  };
};

// ── Generate payroll for all active users for a given month ──────────────────

export const generatePayrollService = async (month) => {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error('Month must be YYYY-MM');
    err.statusCode = 400;
    throw err;
  }

  const users = await User.find({ isActive: true }).select(
    'name email role monthlySalary ssfEmployeePercent ssfEmployerPercent'
  );

  const created = [];
  const skipped = [];

  for (const user of users) {
    const exists = await Payroll.exists({ user: user._id, month });
    if (exists) {
      skipped.push({ id: user._id, name: user.name });
      continue;
    }

    const record = await Payroll.create({ user: user._id, month, ...calcSSF(user) });
    created.push(record);
  }

  return { created: created.length, skipped: skipped.length, records: created };
};

// ── Mark a payroll record as Paid + update SSFAccount ────────────────────────

export const markPaidService = async (payrollId) => {
  const payroll = await Payroll.findById(payrollId).populate('user', 'name email');
  if (!payroll) {
    const err = new Error('Payroll record not found');
    err.statusCode = 404;
    throw err;
  }
  if (payroll.status === 'Paid') {
    const err = new Error('Payroll is already marked as Paid');
    err.statusCode = 400;
    throw err;
  }

  payroll.status = 'Paid';
  payroll.paidAt = new Date();
  await payroll.save();

  // Upsert SSFAccount
  let account = await SSFAccount.findOne({ user: payroll.user._id });
  if (!account) {
    account = new SSFAccount({ user: payroll.user._id });
  }

  account.totalEmployeeContribution = round2(account.totalEmployeeContribution + payroll.employeeSSF);
  account.totalEmployerContribution = round2(account.totalEmployerContribution + payroll.employerSSF);
  account.totalAccumulated          = round2(account.totalAccumulated          + payroll.totalSSF);
  account.history.push({
    month:                payroll.month,
    employeeContribution: payroll.employeeSSF,
    employerContribution: payroll.employerSSF,
    payrollId:            payroll._id,
    paidAt:               payroll.paidAt,
  });

  await account.save();
  return payroll;
};

// ── Employee self-service ─────────────────────────────────────────────────────

export const getMyPayrollService = async (userId) =>
  Payroll.find({ user: userId }).sort({ month: -1 }).lean();

export const getMySSFService = async (userId) =>
  SSFAccount.findOne({ user: userId }).lean();

// ── Finance: list all payrolls for a month ────────────────────────────────────

export const getMonthlyPayrollService = async (month) =>
  Payroll.find({ month })
    .populate('user', 'name email role')
    .sort({ 'user.name': 1 })
    .lean();

// ── Finance: update salary or SSF rates ──────────────────────────────────────

export const updateSalaryService = async (userId, monthlySalary) => {
  if (typeof monthlySalary !== 'number' || monthlySalary < 0) {
    const err = new Error('Invalid salary value');
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { monthlySalary },
    { new: true, runValidators: true }
  ).select('-password -refreshTokenHash');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

export const updateSSFService = async (userId, ssfEmployeePercent, ssfEmployerPercent) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { ssfEmployeePercent, ssfEmployerPercent },
    { new: true, runValidators: true }
  ).select('-password -refreshTokenHash');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

// ── Finance: list users with salary/SSF info ─────────────────────────────────

export const listUsersService = async () =>
  User.find({ isActive: true })
    .select('name email role monthlySalary ssfEmployeePercent ssfEmployerPercent isActive')
    .sort({ name: 1 })
    .lean();
