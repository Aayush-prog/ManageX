import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import env from '../config/env.js';
import { getLocalDateString, getLocalTimeParts, getClockOutTime } from '../utils/time.js';

const POLL_INTERVAL = 5 * 60_000; // check every 5 minutes

/**
 * Fires on every poll — each open session is closed at its own user's
 * workEnd time, but only once "now" is past (workEnd - grace). This lets
 * users on different shifts auto-clockout at their own end time.
 */
const isCandidateForAutoClockOut = (now, user) => {
  const endH = user.workEndHour ?? env.CLOCKOUT_HOUR;
  const endM = user.workEndMinute ?? env.CLOCKOUT_MINUTE;
  const { hour, minute } = getLocalTimeParts(now);
  const currentMin = hour * 60 + minute;
  const endMin     = endH * 60 + endM;
  return currentMin >= endMin - env.CLOCKOUT_GRACE_MINUTES;
};

export const startAutoClockOutJob = () => {
  const run = async () => {
    try {
      const today       = getLocalDateString();
      const now         = new Date();
      const openSessions = await Attendance.find({ date: today, clockOut: null });
      if (!openSessions.length) return;

      const userIds = [...new Set(openSessions.map((s) => String(s.user)))];
      const users   = await User.find({ _id: { $in: userIds } })
        .select('workStartHour workStartMinute workEndHour workEndMinute')
        .lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      const bulkOps = [];
      for (const record of openSessions) {
        const user = userMap.get(String(record.user)) ?? {};
        if (!isCandidateForAutoClockOut(now, user)) continue;

        const clockOut = getClockOutTime(now, user);
        // Guard: if user clocked in after the scheduled clockout, don't go negative
        const effectiveClockOut = clockOut > record.clockIn ? clockOut : new Date();
        const totalHours = parseFloat(((effectiveClockOut - record.clockIn) / 3_600_000).toFixed(2));
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { clockOut: effectiveClockOut, totalHours } },
          },
        });
      }

      if (!bulkOps.length) return;

      await Attendance.bulkWrite(bulkOps);
      console.log(`[autoClockOut] Clocked out ${bulkOps.length} session(s) at their shift end`);
    } catch (err) {
      console.error('[autoClockOut] Error:', err.message);
    }
  };

  const interval = setInterval(run, POLL_INTERVAL);

  console.log(`[autoClockOut] Started — fires at each user's shift end (±${env.CLOCKOUT_GRACE_MINUTES} min grace)`);

  return interval;
};
