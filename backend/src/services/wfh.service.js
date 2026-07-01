import WorkFromHome from '../models/WorkFromHome.js';
import User         from '../models/User.js';
import TeamMembership from '../models/TeamMembership.js';
import { sendEmail } from '../utils/email.js';
import * as tpl from '../utils/emailTemplates.js';
import { notify } from '../utils/notify.js';

const calcDays = (startDate, endDate) => {
  const diff = Math.round((new Date(endDate) - new Date(startDate)) / 86_400_000) + 1;
  return diff;
};

// ── Request WFH ───────────────────────────────────────────────────────────────

export const requestWFHService = async (userId, { startDate, endDate, reason }) => {
  if (!startDate || !endDate) throw new Error('startDate and endDate are required');

  const days = calcDays(startDate, endDate);
  if (days <= 0) throw new Error('endDate must be on or after startDate');

  const year = new Date(startDate).getFullYear();

  const wfh = await WorkFromHome.create({ user: userId, startDate, endDate, days, reason, year });
  await wfh.populate('user', 'name email role');

  const managers = await User.find({
    $or: [
      { permissionLevel: { $in: ['coordinator', 'admin'] } },
      { isSuperAdmin: true },
    ],
    isActive: true,
  }).select('email').lean();
  const managerEmails = managers.map((m) => m.email).filter(Boolean);
  if (managerEmails.length) {
    const { subject, html } = tpl.wfhRequested({ employeeName: wfh.user.name, startDate, endDate, days, reason });
    sendEmail({ to: managerEmails, subject, html });
  }

  return wfh;
};

// ── My WFH requests ───────────────────────────────────────────────────────────

export const getMyWFHService = async (userId, year, startFrom, startTo) => {
  const filter = { user: userId };
  if (startFrom && startTo) {
    filter.startDate = { $gte: startFrom, $lte: startTo };
  } else if (year) {
    filter.year = Number(year);
  }

  const requests = await WorkFromHome.find(filter)
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return { requests };
};

// ── All WFH (manager / admin) ─────────────────────────────────────────────────

export const getAllWFHService = async ({ year, startFrom, startTo, status, userId: filterUserId, teamId, requesterId } = {}) => {
  const filter = {};
  if (startFrom && startTo) {
    filter.startDate = { $gte: startFrom, $lte: startTo };
  } else if (year) {
    filter.year = Number(year);
  }
  if (status)       filter.status = status;
  if (filterUserId) filter.user   = filterUserId;

  if (teamId) {
    const memberships = await TeamMembership.find({ team: teamId }).select('user').lean();
    const memberIds   = memberships.map((m) => String(m.user));
    // Include the requester (coordinator/admin) so they can manage their own
    // WFH request in the same view they use to review others'.
    if (requesterId && !memberIds.includes(String(requesterId))) {
      memberIds.push(String(requesterId));
    }
    if (filterUserId) {
      filter.user = memberIds.includes(String(filterUserId)) ? filterUserId : null;
    } else {
      filter.user = { $in: memberIds };
    }
    if (filter.user === null) return [];
  }

  return WorkFromHome.find(filter)
    .populate('user',       'name email role')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

// ── Approve / Reject ──────────────────────────────────────────────────────────

export const approveWFHService = async (wfhId, approverId) => {
  const wfh = await WorkFromHome.findById(wfhId);
  if (!wfh)                    throw new Error('WFH request not found');
  if (wfh.status !== 'Pending') throw new Error('WFH request already reviewed');

  wfh.status     = 'Approved';
  wfh.approvedBy = approverId;
  wfh.approvedAt = new Date();
  await wfh.save();
  await wfh.populate([{ path: 'user', select: 'name email role' }, { path: 'approvedBy', select: 'name' }]);

  const approverName = wfh.approvedBy?.name ?? 'Management';

  notify(wfh.user._id, {
    type:    'wfh_approved',
    title:   'WFH Approved',
    message: `Your work-from-home request (${wfh.days} day${wfh.days > 1 ? 's' : ''}) was approved by ${approverName}`,
    link:    '/wfh',
  });

  if (wfh.user?.email) {
    const { subject, html } = tpl.wfhApproved({
      employeeName: wfh.user.name,
      startDate: wfh.startDate,
      endDate: wfh.endDate,
      days: wfh.days,
      approvedBy: approverName,
    });
    sendEmail({ to: wfh.user.email, subject, html });
  }

  return wfh;
};

export const rejectWFHService = async (wfhId, approverId, rejectionReason) => {
  const wfh = await WorkFromHome.findById(wfhId);
  if (!wfh)                    throw new Error('WFH request not found');
  if (wfh.status !== 'Pending') throw new Error('WFH request already reviewed');

  wfh.status          = 'Rejected';
  wfh.approvedBy      = approverId;
  wfh.approvedAt      = new Date();
  wfh.rejectionReason = rejectionReason || null;
  await wfh.save();
  await wfh.populate([{ path: 'user', select: 'name email role' }, { path: 'approvedBy', select: 'name' }]);

  const rejectorName = wfh.approvedBy?.name ?? 'Management';
  const reasonSuffix = wfh.rejectionReason ? `: ${wfh.rejectionReason}` : '';

  notify(wfh.user._id, {
    type:    'wfh_rejected',
    title:   'WFH Rejected',
    message: `Your work-from-home request (${wfh.days} day${wfh.days > 1 ? 's' : ''}) was rejected by ${rejectorName}${reasonSuffix}`,
    link:    '/wfh',
  });

  if (wfh.user?.email) {
    const { subject, html } = tpl.wfhRejected({
      employeeName: wfh.user.name,
      startDate: wfh.startDate,
      endDate: wfh.endDate,
      days: wfh.days,
      approvedBy: rejectorName,
      reason: wfh.rejectionReason,
    });
    sendEmail({ to: wfh.user.email, subject, html });
  }

  return wfh;
};
