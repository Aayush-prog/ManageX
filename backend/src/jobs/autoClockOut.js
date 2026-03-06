import Attendance from '../models/Attendance.js';
import env from '../config/env.js';
import { getLocalDateString, getLocalTimeParts, getClockOutTime } from '../utils/time.js';

const POLL_INTERVAL = 5 * 60_000; // check every 5 minutes

/**
 * Checks whether the current local time falls within the auto clock-out window:
 * [CLOCKOUT_TIME - GRACE, CLOCKOUT_TIME + GRACE]
 * e.g. 17:00 ± 15 min → fires between 16:45 and 17:15
 */
const isWithinClockOutWindow = () => {
  const { hour, minute } = getLocalTimeParts();
  const currentMin   = hour * 60 + minute;
  const clockoutMin  = env.CLOCKOUT_HOUR * 60 + env.CLOCKOUT_MINUTE;
  return Math.abs(currentMin - clockoutMin) <= env.CLOCKOUT_GRACE_MINUTES;
};

export const startAutoClockOutJob = () => {
  const run = async () => {
    if (!isWithinClockOutWindow()) return;

    try {
      const today    = getLocalDateString();
      const clockOut = getClockOutTime(); // exactly 5:00 PM local, as UTC Date

      const openSessions = await Attendance.find({ date: today, clockOut: null });
      if (!openSessions.length) return;

      const bulkOps = openSessions.map((record) => {
        // Guard: if user clocked in after the scheduled clockout, don't go negative
        const effectiveClockOut = clockOut > record.clockIn ? clockOut : new Date();
        const totalHours = parseFloat(((effectiveClockOut - record.clockIn) / 3_600_000).toFixed(2));
        return {
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { clockOut: effectiveClockOut, totalHours, clockOutLocationType: record.locationType } },
          },
        };
      });

      await Attendance.bulkWrite(bulkOps);
      console.log(
        `[autoClockOut] Clocked out ${openSessions.length} session(s) at ${env.CLOCKOUT_HOUR}:${String(env.CLOCKOUT_MINUTE).padStart(2, '0')}`
      );
    } catch (err) {
      console.error('[autoClockOut] Error:', err.message);
    }
  };

  const interval = setInterval(run, POLL_INTERVAL);

  console.log(
    `[autoClockOut] Started — fires at ${env.CLOCKOUT_HOUR}:${String(env.CLOCKOUT_MINUTE).padStart(2, '0')} ±${env.CLOCKOUT_GRACE_MINUTES} min`
  );

  return interval;
};
