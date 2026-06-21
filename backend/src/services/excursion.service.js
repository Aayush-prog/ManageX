import fs             from 'fs';
import path           from 'path';
import Excursion      from '../models/Excursion.js';
import Attendance     from '../models/Attendance.js';
import User           from '../models/User.js';
import TeamMembership from '../models/TeamMembership.js';
import { isLocalDaySaturday, makeLocalDateTime } from '../utils/time.js';
import { UPLOAD_DIR } from '../middleware/upload.js';

// Default excursion work hours (12 PM – 5 PM)
const EXCURSION_CLOCK_IN_HOUR  = 12;
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

export const createExcursionService = async (topic, startDate, endDate, createdById, teamId, userIds) => {
  const excursion = await Excursion.create({ topic, startDate, endDate, createdBy: createdById, team: teamId || null });

  let users;
  if (userIds && userIds.length > 0) {
    users = await User.find({ _id: { $in: userIds }, isActive: true }).select('_id').lean();
  } else if (teamId) {
    const memberships = await TeamMembership.find({ team: teamId }).select('user').lean();
    const memberIds   = memberships.map((m) => m.user);
    users = await User.find({ _id: { $in: memberIds }, isActive: true }).select('_id').lean();
  } else {
    users = await User.find({ isActive: true }).select('_id').lean();
  }
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
        excursion:  excursion._id,
      });
      created++;
    }
  }

  return { excursion, created, skipped, days: workingDays.length };
};

export const getExcursionsService = async (teamId) => {
  const filter = teamId ? { team: teamId } : {};
  return Excursion.find(filter).populate('createdBy', 'name').sort({ startDate: -1 }).lean();
};

export const deleteExcursionService = async (id) => {
  const excursion = await Excursion.findById(id);
  if (!excursion) {
    const err = new Error('Excursion not found');
    err.statusCode = 404;
    throw err;
  }
  // Delete associated GPX file from disk if present
  if (excursion.gpxFile) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, excursion.gpxFile)); } catch (_) {}
  }
  await excursion.deleteOne();
  await Attendance.deleteMany({ excursion: id });
  return excursion.toObject();
};

export const attachGpxService = async (id, filename) => {
  const excursion = await Excursion.findByIdAndUpdate(
    id,
    { gpxFile: filename },
    { new: true }
  ).populate('createdBy', 'name').lean();
  if (!excursion) {
    const err = new Error('Excursion not found');
    err.statusCode = 404;
    throw err;
  }
  return excursion;
};

export const detachGpxService = async (id) => {
  const excursion = await Excursion.findById(id);
  if (!excursion) {
    const err = new Error('Excursion not found');
    err.statusCode = 404;
    throw err;
  }
  if (excursion.gpxFile) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, excursion.gpxFile)); } catch (_) {}
    excursion.gpxFile = null;
    await excursion.save();
  }
  return excursion.toObject();
};
