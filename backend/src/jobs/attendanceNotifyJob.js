import Attendance from '../models/Attendance.js';
import { notify } from '../utils/notify.js';
import env from '../config/env.js';

const fmtClock = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: env.TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

const RESTART_DELAY_MS = 5_000;

let activeStream = null;

// Ensure the collection records pre-images so we can tell clockOut went null → set.
const enablePreImages = async () => {
  try {
    await Attendance.db.db.command({
      collMod: Attendance.collection.collectionName,
      changeStreamPreAndPostImages: { enabled: true },
    });
  } catch (err) {
    console.warn('[attendanceNotify] could not enable pre-images:', err.message);
  }
};

const handleChange = (change) => {
  try {
    if (change.operationType === 'insert') {
      const doc = change.fullDocument;
      if (!doc?.user || !doc.clockIn) return;
      notify(doc.user, {
        type:    'clock_in',
        title:   'Clocked in',
        message: `You clocked in at ${fmtClock(doc.clockIn)}.`,
        link:    '/attendance',
      });
      return;
    }

    if (change.operationType === 'update') {
      const updated = change.updateDescription?.updatedFields ?? {};
      const newClockOut = updated.clockOut;
      if (!newClockOut) return; // not a clockOut-set update

      const before = change.fullDocumentBeforeChange;
      // If we have the pre-image, only notify when clockOut transitioned from null/missing.
      // Without it, fall back to notifying whenever clockOut appears in updatedFields.
      if (before && before.clockOut) return;

      const doc = change.fullDocument;
      if (!doc?.user) return;
      notify(doc.user, {
        type:    'clock_out',
        title:   'Clocked out',
        message: `You clocked out at ${fmtClock(newClockOut)}.`,
        link:    '/attendance',
      });
    }
  } catch (err) {
    console.error('[attendanceNotify] handler error:', err.message);
  }
};

const watch = () => {
  // Ensure only one stream is active at a time
  if (activeStream) {
    try { activeStream.close(); } catch {}
    activeStream = null;
  }

  const stream = Attendance.watch([], {
    fullDocument:              'updateLookup',
    fullDocumentBeforeChange:  'whenAvailable',
  });

  activeStream = stream;

  stream.on('change', handleChange);
  stream.on('error', (err) => {
    console.error('[attendanceNotify] stream error:', err.message);
    if (activeStream === stream) activeStream = null;
    try { stream.close(); } catch {}
    setTimeout(watch, RESTART_DELAY_MS);
  });
  stream.on('close', () => {
    if (activeStream === stream) activeStream = null;
  });
};

export const startAttendanceNotifyJob = async () => {
  await enablePreImages();
  watch();
  console.log('[attendanceNotify] Watching attendance for clock-in / clock-out events');
};
