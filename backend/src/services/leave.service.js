import Leave from '../models/Leave.js';
import User  from '../models/User.js';
import { sendEmail } from '../utils/email.js';
import * as tpl from '../utils/emailTemplates.js';

const SICK_QUOTA   = 7; // days per year
const ANNUAL_QUOTA = 7; // days per year
const ANNUAL_ADVANCE_DAYS = 7; // must apply at least 7 days before start

/**
 * Calculate calendar days between two YYYY-MM-DD strings (inclusive).
 */
const calcDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const diff  = Math.round((end - start) / 86_400_000) + 1;
  return diff;
};

/**
 * How many approved/pending leave days a user has used for a given type in a given year.
 */
const usedDays = async (userId, type, year) => {
  const records = await Leave.find({
    user: userId,
    type,
    year,
    status: { $in: ['Approved', 'Pending'] },
  });
  return records.reduce((sum, r) => sum + r.days, 0);
};

// ── Request leave ──────────────────────────────────────────────────────────────

export const requestLeaveService = async (userId, { type, startDate, endDate, reason }) => {
  if (!type || !startDate || !endDate) throw new Error('type, startDate and endDate are required');

  const days = calcDays(startDate, endDate);
  if (days <= 0) throw new Error('endDate must be on or after startDate');

  const year = new Date(startDate).getFullYear();

  // Annual leave: must be requested at least ANNUAL_ADVANCE_DAYS ahead
  if (type === 'Annual') {
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveStart = new Date(startDate);
    const diffDays   = Math.round((leaveStart - today) / 86_400_000);
    if (diffDays < ANNUAL_ADVANCE_DAYS) {
      throw new Error(`Annual leave must be requested at least ${ANNUAL_ADVANCE_DAYS} days in advance`);
    }
  }

  // Quota check
  const quota = type === 'Sick' ? SICK_QUOTA : ANNUAL_QUOTA;
  const used  = await usedDays(userId, type, year);
  if (used + days > quota) {
    throw new Error(
      `Insufficient ${type} leave balance. Used: ${used}/${quota} days. Requested: ${days} day(s).`
    );
  }

  const leave = await Leave.create({ user: userId, type, startDate, endDate, days, reason, year });
  await leave.populate('user', 'name email role');

  // Notify all managers and admins
  const managers = await User.find({ permissionLevel: { $in: ['manager', 'admin'] }, isActive: true }).select('email').lean();
  const managerEmails = managers.map((m) => m.email).filter(Boolean);
  if (managerEmails.length) {
    const { subject, html } = tpl.leaveRequested({ employeeName: leave.user.name, type, startDate, endDate, days, reason });
    sendEmail({ to: managerEmails, subject, html });
  }

  return leave;
};

// ── My leaves ─────────────────────────────────────────────────────────────────

export const getMyLeavesService = async (userId, year) => {
  const filter = { user: userId };
  if (year) filter.year = Number(year);
  const leaves = await Leave.find(filter)
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const currentYear = year ? Number(year) : new Date().getFullYear();
  const [sickUsed, annualUsed] = await Promise.all([
    usedDays(userId, 'Sick', currentYear),
    usedDays(userId, 'Annual', currentYear),
  ]);

  return {
    leaves,
    quota: {
      year: currentYear,
      sick:   { total: SICK_QUOTA,   used: sickUsed,   remaining: SICK_QUOTA - sickUsed },
      annual: { total: ANNUAL_QUOTA, used: annualUsed, remaining: ANNUAL_QUOTA - annualUsed },
    },
  };
};

// ── All leaves (manager / admin) ───────────────────────────────────────────────

export const getAllLeavesService = async ({ year, status, userId: filterUserId } = {}) => {
  const filter = {};
  if (year)         filter.year   = Number(year);
  if (status)       filter.status = status;
  if (filterUserId) filter.user   = filterUserId;

  return Leave.find(filter)
    .populate('user',       'name email role')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

// ── Approve / Reject ──────────────────────────────────────────────────────────

export const approveLeaveService = async (leaveId, approverId) => {
  const leave = await Leave.findById(leaveId);
  if (!leave)                     throw new Error('Leave request not found');
  if (leave.status !== 'Pending') throw new Error('Leave request already reviewed');

  leave.status     = 'Approved';
  leave.approvedBy = approverId;
  leave.approvedAt = new Date();
  await leave.save();
  await leave.populate([{ path: 'user', select: 'name email role' }, { path: 'approvedBy', select: 'name' }]);

  if (leave.user?.email) {
    const { subject, html } = tpl.leaveApproved({
      employeeName: leave.user.name, type: leave.type,
      startDate: leave.startDate, endDate: leave.endDate,
      days: leave.days, approvedBy: leave.approvedBy?.name ?? 'Management',
    });
    sendEmail({ to: leave.user.email, subject, html });
  }

  return leave;
};

export const rejectLeaveService = async (leaveId, approverId, rejectionReason) => {
  const leave = await Leave.findById(leaveId);
  if (!leave)                     throw new Error('Leave request not found');
  if (leave.status !== 'Pending') throw new Error('Leave request already reviewed');

  leave.status          = 'Rejected';
  leave.approvedBy      = approverId;
  leave.approvedAt      = new Date();
  leave.rejectionReason = rejectionReason || null;
  await leave.save();
  await leave.populate([{ path: 'user', select: 'name email role' }, { path: 'approvedBy', select: 'name' }]);

  if (leave.user?.email) {
    const { subject, html } = tpl.leaveRejected({
      employeeName: leave.user.name, type: leave.type,
      startDate: leave.startDate, endDate: leave.endDate,
      days: leave.days, approvedBy: leave.approvedBy?.name ?? 'Management',
      reason: leave.rejectionReason,
    });
    sendEmail({ to: leave.user.email, subject, html });
  }

  return leave;
};

// ── Quota check ───────────────────────────────────────────────────────────────

export const getQuotaService = async (userId, year) => {
  const y = year ? Number(year) : new Date().getFullYear();
  const [sickUsed, annualUsed] = await Promise.all([
    usedDays(userId, 'Sick', y),
    usedDays(userId, 'Annual', y),
  ]);
  return {
    year: y,
    sick:   { total: SICK_QUOTA,   used: sickUsed,   remaining: SICK_QUOTA - sickUsed },
    annual: { total: ANNUAL_QUOTA, used: annualUsed, remaining: ANNUAL_QUOTA - annualUsed },
  };
};
