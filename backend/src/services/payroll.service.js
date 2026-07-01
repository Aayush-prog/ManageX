import User from '../models/User.js';
import Payroll from '../models/Payroll.js';
import SSFAccount from '../models/SSFAccount.js';

const round2 = (n) => parseFloat(n.toFixed(2));

const calcSSF = (user) => {
  const baseSalary  = user.monthlySalary;
  const ssfBase     = round2(baseSalary * 0.60);           // SSF applies to 60% of salary
  const employeeSSF = round2(ssfBase * (user.ssfEmployeePercent / 100));
  const employerSSF = round2(ssfBase * (user.ssfEmployerPercent / 100));
  const tdsPercent  = user.tdsPercent ?? 1;
  const tds         = round2(baseSalary * (tdsPercent / 100));
  return {
    baseSalary,
    ssfBase,
    employeeSSF,
    employerSSF,
    totalSSF:           round2(employeeSSF + employerSSF),
    tdsPercent,
    tds,
    finalPayableSalary: round2(baseSalary - employeeSSF - tds),
  };
};

// ── Generate payroll for all active users for a given month ──────────────────

export const generatePayrollService = async (month, teamId) => {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error('Month must be YYYY-MM');
    err.statusCode = 400;
    throw err;
  }

  const userFilter = { isActive: true };
  if (teamId) userFilter.salaryFromTeam = teamId;

  const [users, existingIds] = await Promise.all([
    User.find(userFilter).select(
      'name email role monthlySalary ssfEmployeePercent ssfEmployerPercent tdsPercent salaryFromTeam'
    ),
    Payroll.distinct('user', teamId ? { month, team: teamId } : { month }),
  ]);

  const existingSet = new Set(existingIds.map((id) => id.toString()));
  const toCreate = [];
  const skipped  = [];

  for (const user of users) {
    if (existingSet.has(user._id.toString())) {
      skipped.push({ id: user._id, name: user.name });
    } else {
      toCreate.push({ user: user._id, month, team: teamId || user.salaryFromTeam || null, ...calcSSF(user) });
    }
  }

  const created = toCreate.length ? await Payroll.insertMany(toCreate) : [];
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

// ── Mark all pending payrolls for a month as Paid ────────────────────────────

export const markAllPaidService = async (month, teamId) => {
  const filter = { month, status: 'Pending' };
  if (teamId) filter.team = teamId;
  const pending = await Payroll.find(filter).populate('user', 'name email');
  if (!pending.length) return { count: 0 };

  const now = new Date();

  // Bulk-update all payroll statuses in one query
  await Payroll.updateMany(
    { _id: { $in: pending.map((p) => p._id) } },
    { $set: { status: 'Paid', paidAt: now } }
  );

  // Fetch all relevant SSFAccounts in one query, then update in memory
  const userIds  = pending.map((p) => p.user._id);
  const accounts = await SSFAccount.find({ user: { $in: userIds } });
  const accountMap = new Map(accounts.map((a) => [a.user.toString(), a]));

  for (const payroll of pending) {
    const uid = payroll.user._id.toString();
    let account = accountMap.get(uid);
    if (!account) {
      account = new SSFAccount({ user: payroll.user._id });
      accountMap.set(uid, account);
    }
    account.totalEmployeeContribution = round2(account.totalEmployeeContribution + payroll.employeeSSF);
    account.totalEmployerContribution = round2(account.totalEmployerContribution + payroll.employerSSF);
    account.totalAccumulated          = round2(account.totalAccumulated          + payroll.totalSSF);
    account.history.push({
      month,
      employeeContribution: payroll.employeeSSF,
      employerContribution: payroll.employerSSF,
      payrollId:            payroll._id,
      paidAt:               now,
    });
  }

  await Promise.all([...accountMap.values()].map((a) => a.save()));
  return { count: pending.length };
};

// ── Employee self-service ─────────────────────────────────────────────────────

export const getMyPayrollService = async (userId) => {
  const user = await User.findById(userId).select('salaryFromTeam').lean();
  const filter = { user: userId };
  if (user?.salaryFromTeam) filter.team = user.salaryFromTeam;
  return Payroll.find(filter).sort({ month: -1 }).lean();
};

export const getMySSFService = async (userId) =>
  SSFAccount.findOne({ user: userId }).lean();

// ── Finance: list all payrolls for a month ────────────────────────────────────

export const getMonthlyPayrollService = async (month, teamId) => {
  const filter = { month };
  if (teamId) filter.team = teamId;
  return Payroll.find(filter)
    .populate('user', 'name email role salaryFromTeam')
    .populate('team', 'name')
    .sort({ 'user.name': 1 })
    .lean();
};

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

export const updateTDSService = async (userId, tdsPercent) => {
  if (typeof tdsPercent !== 'number' || tdsPercent < 0) {
    const err = new Error('Invalid TDS value');
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { tdsPercent },
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

export const listUsersService = async (teamId) => {
  const userFilter = { isActive: true };
  if (teamId) userFilter.salaryFromTeam = teamId;
  return User.find(userFilter)
    .select('name email role monthlySalary ssfEmployeePercent ssfEmployerPercent tdsPercent isActive salaryFromTeam workStartHour workStartMinute workEndHour workEndMinute lateGraceMinutes')
    .populate('salaryFromTeam', 'name')
    .sort({ name: 1 })
    .lean();
};
