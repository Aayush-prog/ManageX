/**
 * One-shot script: mark all overdue tasks as Done.
 * "Overdue" = dueDate is in the past AND status is not Done.
 * Run: node src/seeds/markOverdueDone.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import Task from '../models/Task.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[markOverdueDone] Connected');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await Task.updateMany(
    { status: { $ne: 'Done' }, dueDate: { $lt: today } },
    { $set: { status: 'Done' } }
  );

  console.log(`[markOverdueDone] Marked ${result.modifiedCount} overdue task(s) as Done`);

  await mongoose.disconnect();
};

run().catch((err) => { console.error('[markOverdueDone]', err); process.exit(1); });
