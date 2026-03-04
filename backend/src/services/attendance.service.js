import Attendance from '../models/Attendance.js';
import { getLocalDateString, isLateClockIn, isOfficeIP } from '../utils/time.js';

// ── Clock-in ─────────────────────────────────────────────────────────────────

export const clockInService = async (userId, requestIP) => {
  const now = new Date();
  const date = getLocalDateString(now);

  // Guard: already clocked in today
  const existing = await Attendance.findOne({ user: userId, date });
  if (existing) {
    return existing; // idempotent — return the existing record silently
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

  return record;
};

// ── Clock-out ─────────────────────────────────────────────────────────────────

export const clockOutService = async (userId) => {
  const date = getLocalDateString();

  const record = await Attendance.findOne({ user: userId, date, clockOut: null });
  if (!record) return null; // already clocked out or no record today

  const now = new Date();
  record.clockOut = now;
  record.totalHours = parseFloat(((now - record.clockIn) / 3_600_000).toFixed(2));
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
    totalHours: parseFloat(totalHours.toFixed(2)),
    avgHoursPerDay: daysPresent
      ? parseFloat((totalHours / daysPresent).toFixed(2))
      : 0,
  };
};

export const getMyAttendanceService = async (userId, year, month) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to   = `${year}-${String(month).padStart(2, '0')}-31`;

  const records = await Attendance
    .find({ user: userId, date: { $gte: from, $lte: to } })
    .sort({ date: -1 })
    .lean();

  return { records, summary: buildSummary(records) };
};

export const getTeamAttendanceService = async (year, month) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to   = `${year}-${String(month).padStart(2, '0')}-31`;

  return Attendance
    .find({ date: { $gte: from, $lte: to } })
    .populate('user', 'name email role')
    .sort({ date: -1, clockIn: -1 })
    .lean();
};

export const getAllAttendanceService = getTeamAttendanceService; // same query, different role gate
