/**
 * One-off backfill: marks every active user as present on every past working
 * day (Sun–Fri, non-holidays) from ATTENDANCE_TRACK_FROM up to yesterday
 * (Kathmandu). Existing records are left untouched. Safe to re-run.
 *
 * Usage: node src/seeds/backfill-attendance.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

import env from '../config/env.js';
import { seedAttendanceService } from '../services/attendance.service.js';
import { getAbsenceCutoffDate } from '../utils/time.js';

const run = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('[backfill] Connected to MongoDB');

  const start = env.ATTENDANCE_TRACK_FROM;
  const end   = getAbsenceCutoffDate();

  console.log(`[backfill] Range: ${start} → ${end}`);
  const result = await seedAttendanceService(start, end);
  console.log(`[backfill] Created ${result.created}, skipped ${result.skipped}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('[backfill] Error:', err.message);
  process.exit(1);
});
