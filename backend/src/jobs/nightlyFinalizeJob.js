import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import env from '../config/env.js';
import { getLocalDateString, getLocalTimeParts, getClockOutTime } from '../utils/time.js';

const POLL_INTERVAL   = 5 * 60_000; // check every 5 minutes
const NIGHTLY_HOUR    = 23;          // 11 PM Kathmandu
const NIGHTLY_MINUTE  = 0;
const GRACE_MINUTES   = 15;          // ±15 min window → fires between 22:45 and 23:15

let firedToday = null; // tracks the date on which the job last ran so it only fires once per day

const isWithinNightlyWindow = () => {
  const { hour, minute } = getLocalTimeParts();
  const currentMin = hour * 60 + minute;
  const nightlyMin = NIGHTLY_HOUR * 60 + NIGHTLY_MINUTE;
  return Math.abs(currentMin - nightlyMin) <= GRACE_MINUTES;
};

export const startNightlyFinalizeJob = () => {
  const run = async () => {
    const today = getLocalDateString();

    if (!isWithinNightlyWindow()) return;
    if (firedToday === today) return; // already ran tonight

    firedToday = today;

    try {
      const openSessions = await Attendance.find({ date: today, clockOut: null });

      if (!openSessions.length) {
        console.log('[nightlyFinalize] No open sessions to close.');
        return;
      }

      const userIds = [...new Set(openSessions.map((s) => String(s.user)))];
      const users   = await User.find({ _id: { $in: userIds } })
        .select('workEndHour workEndMinute')
        .lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      const bulkOps = openSessions.map((record) => {
        const user = userMap.get(String(record.user)) ?? {};
        // Close each session at that user's own end-of-day time.
        const clockOut = getClockOutTime(new Date(), user);
        const effectiveClockOut = clockOut > record.clockIn ? clockOut : new Date();
        const totalHours = parseFloat(((effectiveClockOut - record.clockIn) / 3_600_000).toFixed(2));
        return {
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { clockOut: effectiveClockOut, totalHours } },
          },
        };
      });

      await Attendance.bulkWrite(bulkOps);
      console.log(`[nightlyFinalize] Closed ${openSessions.length} open session(s) for ${today}`);
    } catch (err) {
      console.error('[nightlyFinalize] Error:', err.message);
      firedToday = null; // allow retry on next poll if it failed
    }
  };

  setInterval(run, POLL_INTERVAL);
  console.log(`[nightlyFinalize] Started — fires at ${NIGHTLY_HOUR}:${String(NIGHTLY_MINUTE).padStart(2, '0')} ±${GRACE_MINUTES} min (Kathmandu time)`);
};
