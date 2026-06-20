/**
 * One-time fix: delete Aayush Tamang's payroll record for Ashad 2083 (2026-06)
 * Usage: node src/seeds/delete-aayush-ashad-payroll.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import User from '../models/User.js';
import Payroll from '../models/Payroll.js';

const MONTH = '2026-06'; // Ashad 2083

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[fix] Connected');

  const aayush = await User.findOne({ email: 'bombhu15@gmail.com' });
  if (!aayush) {
    console.error('[fix] Aayush Tamang not found');
    process.exit(1);
  }

  const result = await Payroll.deleteOne({ user: aayush._id, month: MONTH });
  if (result.deletedCount) {
    console.log(`[fix] Deleted Aayush Tamang's payroll for ${MONTH} (Ashad 2083)`);
  } else {
    console.log(`[fix] No payroll record found for Aayush for ${MONTH} — nothing to delete`);
  }

  await mongoose.disconnect();
};

run().catch((err) => { console.error('[fix]', err); process.exit(1); });
