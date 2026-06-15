import Attendance from '../models/Attendance.js';
import { getLocalDateString } from '../utils/time.js';

// ── Manager edit ─────────────────────────────────────────────────────────────

export const editAttendanceService = async (attendanceId, fields) => {
  const record = await Attendance.findById(attendanceId);
  if (!record) {
    const err = new Error('Attendance record not found');
    err.statusCode = 404;
    throw err;
  }

  const { clockIn, clockOut, isLate } = fields;

  if (clockIn  !== undefined) record.clockIn  = new Date(clockIn);
  if (isLate   !== undefined) record.isLate   = isLate;
  if (clockOut             !== undefined) record.clockOut             = clockOut ? new Date(clockOut) : null;

  // Recalculate totalHours whenever both times are present
  if (record.clockIn && record.clockOut) {
    record.totalHours = parseFloat(((record.clockOut - record.clockIn) / 3_600_000).toFixed(2));
  } else {
    record.totalHours = null;
  }

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

// ── Manual creation (manager/admin) ──────────────────────────────────────────

export const createAttendanceService = async ({ userId, date, clockIn, clockOut, isLate }) => {
  const existing = await Attendance.findOne({ user: userId, date });
  if (existing) {
    const err = new Error('Attendance record already exists for this user on this date');
    err.statusCode = 409;
    throw err;
  }

  const clockInDate  = new Date(clockIn);
  const clockOutDate = clockOut ? new Date(clockOut) : null;
  const totalHours   = clockOutDate
    ? parseFloat(((clockOutDate - clockInDate) / 3_600_000).toFixed(2))
    : null;

  const record = await Attendance.create({
    user: userId,
    date,
    clockIn:    clockInDate,
    clockOut:   clockOutDate,
    totalHours,
    isLate:     isLate ?? false,
    type:       'regular',
  });

  return Attendance.findById(record._id).populate('user', 'name email role').lean();
};
