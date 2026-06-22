import Attendance    from '../models/Attendance.js';
import User          from '../models/User.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { getLocalDateString, makeLocalDateTime, isLocalDaySaturday, getAbsenceCutoffDate } from '../utils/time.js';

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

export const getTeamAttendanceService = async (start, end, teamId = null) => {
  const filter = { date: { $gte: start, $lte: end } };

  if (teamId) {
    const teamUsers = await User.find({ isActive: true, salaryFromTeam: teamId }).select('_id').lean();
    filter.user = { $in: teamUsers.map((u) => u._id) };
  }

  return Attendance
    .find(filter)
    .populate('user', 'name email role')
    .sort({ date: -1, clockIn: -1 })
    .lean();
};

export const getAllAttendanceService = (start, end) => getTeamAttendanceService(start, end); // no team filter for admin /all

// ── Team attendance summary (per-user aggregation) ───────────────────────────

export const getTeamAttendanceSummaryService = async (start, end, teamId = null) => {
  const filter = { date: { $gte: start, $lte: end } };

  if (teamId) {
    const teamUsers = await User.find({ isActive: true, salaryFromTeam: teamId }).select('_id').lean();
    filter.user = { $in: teamUsers.map((u) => u._id) };
  }

  const records = await Attendance
    .find(filter)
    .populate('user', 'name email role permissionLevel isActive')
    .sort({ date: 1 })
    .lean();

  // Group by user
  const byUser = new Map();
  for (const r of records) {
    if (!r.user?._id) continue;
    const key = r.user._id.toString();
    if (!byUser.has(key)) byUser.set(key, { user: r.user, records: [] });
    byUser.get(key).records.push(r);
  }

  const summaries = [];
  for (const { user, records: userRecords } of byUser.values()) {
    const totalHours = parseFloat(userRecords.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(2));
    summaries.push({
      user,
      daysPresent:    userRecords.length,
      daysLate:       userRecords.filter(r => r.isLate).length,
      totalHours,
      records:        userRecords,
    });
  }

  return summaries;
};

// ── Bulk seed (coordinator/admin) ────────────────────────────────────────────

export const seedAttendanceService = async (startDate, endDate) => {
  const [users, holidays] = await Promise.all([
    User.find({ isActive: true }).select('_id').lean(),
    CalendarEvent.find({
      type: 'holiday',
      date: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59Z') },
    }).lean(),
  ]);

  const holidaySet = new Set(holidays.map((h) => {
    const d = new Date(h.date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }));

  // Cap at the absence cutoff (yesterday before 11 PM Kathmandu, today after)
  // so backfilling never creates a fake "present" record for the still-open day.
  const cutoff = getAbsenceCutoffDate();
  const capEnd = endDate > cutoff ? cutoff : endDate;

  const dates = [];
  const cur = new Date(startDate + 'T12:00:00Z');
  const end = new Date(capEnd + 'T12:00:00Z');
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cur.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (!holidaySet.has(dateStr)) {
      dates.push({ dateStr, isSat: isLocalDaySaturday(cur) });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  if (!dates.length || !users.length) return { created: 0, skipped: 0 };

  const dateStrings = dates.map((d) => d.dateStr);
  const userIds     = users.map((u) => u._id);

  const existing = await Attendance.find({
    user: { $in: userIds },
    date: { $in: dateStrings },
  }).select('user date').lean();

  const existingSet = new Set(existing.map((r) => `${r.user}:${r.date}`));

  const docs = [];
  for (const user of users) {
    for (const { dateStr, isSat } of dates) {
      if (existingSet.has(`${user._id}:${dateStr}`)) continue;
      const clockInHour = isSat ? 12 : 9;
      docs.push({
        user:       user._id,
        date:       dateStr,
        clockIn:    makeLocalDateTime(dateStr, clockInHour),
        clockOut:   makeLocalDateTime(dateStr, 17),
        totalHours: 17 - clockInHour,
        isLate:     false,
      });
    }
  }

  const skipped = users.length * dates.length - docs.length;
  if (!docs.length) return { created: 0, skipped };

  try {
    const result = await Attendance.insertMany(docs, { ordered: false });
    return { created: result.length, skipped };
  } catch (err) {
    const created = err.result?.nInserted ?? err.insertedDocs?.length ?? 0;
    return { created, skipped: users.length * dates.length - created };
  }
};

// ── Mark all active users present today 12:00–17:00 (coordinator/admin) ──────

export const markAllPresentTodayService = async () => {
  const today = getLocalDateString();

  const users = await User.find({ isActive: true }).select('_id').lean();
  if (!users.length) return { created: 0, updated: 0, skipped: 0 };

  const userIds = users.map((u) => u._id);

  const existing = await Attendance.find({ user: { $in: userIds }, date: today })
    .select('user clockOut')
    .lean();

  const existingMap = new Map(existing.map((r) => [r.user.toString(), r]));

  const clockIn  = makeLocalDateTime(today, 12);
  const clockOut = makeLocalDateTime(today, 17);
  const totalHours = 5;

  const toCreate = [];
  let updated = 0;

  for (const user of users) {
    const key = user._id.toString();
    const record = existingMap.get(key);

    if (!record) {
      toCreate.push({ user: user._id, date: today, clockIn, clockOut, totalHours, isLate: false });
    } else if (record.clockOut === null) {
      await Attendance.updateOne(
        { user: user._id, date: today },
        { $set: { clockOut, totalHours } },
      );
      updated++;
    }
    // already fully clocked out → skip
  }

  let created = 0;
  if (toCreate.length) {
    try {
      const result = await Attendance.insertMany(toCreate, { ordered: false });
      created = result.length;
    } catch (err) {
      created = err.result?.nInserted ?? err.insertedDocs?.length ?? 0;
    }
  }

  const skipped = users.length - created - updated;
  return { created, updated, skipped };
};

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
  });

  return Attendance.findById(record._id).populate('user', 'name email role').lean();
};
