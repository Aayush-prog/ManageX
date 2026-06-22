/**
 * One-off backfill: marks every active user as "present" on every working day
 * (Sun–Fri, non-holidays) from Baisakh 1, 2083 (2026-04-13) through TODAY in
 * Kathmandu time. Saturdays get a 12pm–5pm slot; other days get 9am–5pm.
 *
 * Idempotent: existing (user, date) records are skipped via unique constraint.
 *
 * Usage: node src/seeds/backfill-all-present.js [startDate=YYYY-MM-DD]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

import env from '../config/env.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { getLocalDateString, makeLocalDateTime, isLocalDaySaturday } from '../utils/time.js';

const DEFAULT_START = '2026-04-13'; // Baisakh 1, 2083 BS

const run = async () => {
  const startDate = process.argv[2] || DEFAULT_START;
  const endDate   = getLocalDateString(); // today in Kathmandu

  await mongoose.connect(env.MONGO_URI);
  console.log(`[backfill-all-present] Connected. Range ${startDate} → ${endDate}`);

  const [users, holidays] = await Promise.all([
    User.find({ isActive: true }).select('_id name').lean(),
    CalendarEvent.find({
      type: 'holiday',
      date: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59Z') },
    }).lean(),
  ]);

  const holidaySet = new Set(holidays.map((h) => {
    const d = new Date(h.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }));

  const dates = [];
  const cur = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate   + 'T12:00:00Z');
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

  console.log(`[backfill-all-present] ${users.length} users × ${dates.length} working days = ${users.length * dates.length} candidate records`);

  const dateStrings = dates.map((d) => d.dateStr);
  const userIds     = users.map((u) => u._id);

  const existing = await Attendance.find({
    user: { $in: userIds },
    date: { $in: dateStrings },
  }).select('user date').lean();

  const existingSet = new Set(existing.map((r) => `${r.user}:${r.date}`));
  console.log(`[backfill-all-present] ${existing.length} already exist`);

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

  if (!docs.length) {
    console.log('[backfill-all-present] Nothing to insert.');
    await mongoose.disconnect();
    return;
  }

  try {
    const result = await Attendance.insertMany(docs, { ordered: false });
    console.log(`[backfill-all-present] Inserted ${result.length} records.`);
  } catch (err) {
    const created = err.result?.nInserted ?? err.insertedDocs?.length ?? 0;
    console.log(`[backfill-all-present] Inserted ${created} (some skipped due to existing).`);
  }

  await mongoose.disconnect();
  console.log('[backfill-all-present] Done.');
};

run().catch((err) => {
  console.error('[backfill-all-present] Error:', err);
  process.exit(1);
});
