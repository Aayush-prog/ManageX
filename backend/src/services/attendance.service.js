import Attendance from '../models/Attendance.js';
import CalendarEvent from '../models/CalendarEvent.js';
import User from '../models/User.js';
import { getLocalDateString, isLateClockIn, isOfficeIP, isOutsideCheckInWindow, isLocalDaySaturday } from '../utils/time.js';
import { notify } from '../utils/notify.js';

// ── Clock-in ─────────────────────────────────────────────────────────────────

/**
 * Returns { record, skipped: true } when outside working hours (login succeeds, no attendance).
 * Returns { record, skipped: false } when check-in is recorded.
 */
export const clockInService = async (userId, requestIP) => {
  const now = new Date();

  // Outside working hours — allow login but skip attendance
  if (isOutsideCheckInWindow(now)) {
    return { record: null, skipped: true };
  }

  // Saturday is always a holiday
  if (isLocalDaySaturday(now)) {
    return { record: null, skipped: true, reason: 'holiday' };
  }

  const date = getLocalDateString(now);

  // Check if today is a declared holiday
  const holiday = await CalendarEvent.findOne({
    type: 'holiday',
    date: { $gte: new Date(date + 'T00:00:00'), $lte: new Date(date + 'T23:59:59') },
  }).lean();
  if (holiday) {
    return { record: null, skipped: true, reason: 'holiday' };
  }

  // Guard: already clocked in today
  const existing = await Attendance.findOne({ user: userId, date });
  if (existing) {
    return { record: existing, skipped: false }; // idempotent
  }

  const locationType = isOfficeIP(requestIP) ? 'Office' : 'Remote';
  const isLate = isLateClockIn(now);

  const record = await Attendance.create({
    user: userId,
    date,
    clockIn: now,
    locationType,
    isLate,
  });

  if (isLate) {
    // Notify the user they clocked in late
    notify(userId, {
      type: 'late',
      title: 'Late Clock-in',
      message: `You clocked in late today. Please try to arrive on time.`,
      link: '/attendance',
    });

    // Count lates this month to check for 3-lates = 1 absent rule
    const monthStart = date.slice(0, 7) + '-01';
    const monthEnd   = date.slice(0, 7) + '-31';
    const monthlyLateCount = await Attendance.countDocuments({
      user: userId,
      date: { $gte: monthStart, $lte: monthEnd },
      isLate: true,
    });

    if (monthlyLateCount % 3 === 0) {
      const absentsFromLates = monthlyLateCount / 3;

      // Notify the employee
      notify(userId, {
        type: 'late_absent',
        title: 'Attendance Warning — Absence Recorded',
        message: `You have been late ${monthlyLateCount} time(s) this month. Every 3 lates count as 1 absent — ${absentsFromLates} absence(s) are now recorded against your attendance.`,
        link: '/attendance',
      });

      // Notify all admins and managers
      const targetUser = await User.findById(userId).select('name').lean();
      const managers   = await User.find({ permissionLevel: { $in: ['admin', 'manager'] }, isActive: true }).select('_id').lean();
      managers.forEach((mgr) => {
        if (String(mgr._id) === String(userId)) return; // skip if the late user is also a manager
        notify(mgr._id, {
          type: 'late_absent',
          title: 'Employee Absence from Lates',
          message: `${targetUser?.name} has been late ${monthlyLateCount} time(s) this month — ${absentsFromLates} absence(s) recorded.`,
          link: '/attendance',
        });
      });
    }
  }

  return { record, skipped: false };
};

// ── Clock-out ─────────────────────────────────────────────────────────────────

export const clockOutService = async (userId, requestIP) => {
  const date = getLocalDateString();

  const record = await Attendance.findOne({ user: userId, date, clockOut: null });
  if (!record) return null; // already clocked out or no record today

  const now = new Date();
  record.clockOut = now;
  record.totalHours = parseFloat(((now - record.clockIn) / 3_600_000).toFixed(2));
  record.clockOutLocationType = isOfficeIP(requestIP) ? 'Office' : 'Remote';
  await record.save();

  return record;
};

// ── Today's status ────────────────────────────────────────────────────────────

export const getTodayService = async (userId) => {
  const date = getLocalDateString();
  return Attendance.findOne({ user: userId, date }).lean();
};

// ── Monthly list + summary ────────────────────────────────────────────────────

const buildSummary = (records) => {
  const daysPresent = records.length;
  const daysLate    = records.filter((r) => r.isLate).length;
  const totalHours  = records.reduce((sum, r) => sum + (r.totalHours ?? 0), 0);
  return {
    daysPresent,
    daysLate,
    lateAbsents: Math.floor(daysLate / 3), // every 3 lates = 1 absent
    totalHours: parseFloat(totalHours.toFixed(2)),
    avgHoursPerDay: daysPresent
      ? parseFloat((totalHours / daysPresent).toFixed(2))
      : 0,
  };
};

export const getMyAttendanceService = async (userId, start, end) => {
  const records = await Attendance
    .find({ user: userId, date: { $gte: start, $lte: end } })
    .sort({ date: -1 })
    .lean();

  return { records, summary: buildSummary(records) };
};

export const getTeamAttendanceService = async (start, end) => {
  return Attendance
    .find({ date: { $gte: start, $lte: end } })
    .populate('user', 'name email role')
    .sort({ date: -1, clockIn: -1 })
    .lean();
};

export const getAllAttendanceService = getTeamAttendanceService; // same query, different role gate
