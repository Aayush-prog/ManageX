import Excursion  from '../models/Excursion.js';
import Attendance from '../models/Attendance.js';
import User       from '../models/User.js';
import { isLocalDaySaturday, makeLocalDateTime } from '../utils/time.js';

// Default excursion work hours
const EXCURSION_CLOCK_IN_HOUR  = 9;
const EXCURSION_CLOCK_OUT_HOUR = 17;

/**
 * Returns all dates (YYYY-MM-DD) between startDate and endDate inclusive,
 * skipping Saturdays.
 */
const getWorkingDates = (startDate, endDate) => {
  const dates = [];
  const cur   = new Date(startDate + 'T12:00:00Z');
  const end   = new Date(endDate   + 'T12:00:00Z');
  while (cur <= end) {
    if (!isLocalDaySaturday(cur)) {
      // Format as YYYY-MM-DD from the UTC date we used (noon UTC → always correct dateStr)
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const d = String(cur.getUTCDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
};

export const createExcursionService = async (topic, startDate, endDate, createdById) => {
  const excursion = await Excursion.create({ topic, startDate, endDate, createdBy: createdById });

  const users       = await User.find({ isActive: true }).select('_id').lean();
  const workingDays = getWorkingDates(startDate, endDate);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    for (const dateStr of workingDays) {
      const exists = await Attendance.findOne({ user: user._id, date: dateStr }).lean();
      if (exists) { skipped++; continue; }

      const clockIn  = makeLocalDateTime(dateStr, EXCURSION_CLOCK_IN_HOUR);
      const clockOut = makeLocalDateTime(dateStr, EXCURSION_CLOCK_OUT_HOUR);

      await Attendance.create({
        user:       user._id,
        date:       dateStr,
        clockIn,
        clockOut,
        totalHours: EXCURSION_CLOCK_OUT_HOUR - EXCURSION_CLOCK_IN_HOUR,
        isLate:     false,
        type:       'excursion',
        excursion:  excursion._id,
      });
      created++;
    }
  }

  return { excursion, created, skipped, days: workingDays.length };
};

export const getExcursionsService = async () =>
  Excursion.find().populate('createdBy', 'name').sort({ startDate: -1 }).lean();

export const deleteExcursionService = async (id) => {
  const excursion = await Excursion.findByIdAndDelete(id);
  if (!excursion) {
    const err = new Error('Excursion not found');
    err.statusCode = 404;
    throw err;
  }
  // Remove auto-generated attendance records tied to this excursion
  await Attendance.deleteMany({ excursion: id });
  return excursion;
};
