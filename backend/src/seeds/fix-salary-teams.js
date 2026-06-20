/**
 * Fix script: Correct salary team assignments after migrate.js incorrectly
 * set all staff users to Nepal Marathon.
 *
 * Usage: node src/seeds/fix-salary-teams.js
 *
 * Fixes:
 *   - Prila Shrestha → salaryFromTeam = RaceTiming
 *   - Remove Prila's Nepal Marathon TeamMembership (migration added it, seed didn't intend it)
 *   - Delete Prila's payroll records tagged to Nepal Marathon team
 *   - Ensure Aayush Tamang → salaryFromTeam = RaceTiming, no TeamMembership
 *   - Fix any of Aayush's payroll records still tagged to Nepal Marathon
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import User from '../models/User.js';
import Team from '../models/Team.js';
import TeamMembership from '../models/TeamMembership.js';
import Payroll from '../models/Payroll.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[fix] Connected');

  const raceTeam   = await Team.findOne({ name: 'RaceTiming' });
  const nepalTeam  = await Team.findOne({ name: 'Nepal Marathon' });

  if (!raceTeam || !nepalTeam) {
    console.error('[fix] Teams not found — run seed.js or migrate.js first');
    process.exit(1);
  }

  // ── Prila Shrestha ──────────────────────────────────────────────────────────
  const prila = await User.findOne({ email: 'prilazshrestha090@gmail.com' });
  if (prila) {
    prila.salaryFromTeam = raceTeam._id;
    await prila.save();
    console.log('[fix] Prila Shrestha → salaryFromTeam = RaceTiming');

    // Remove Nepal Marathon TeamMembership (migrate.js created it wrongly)
    const removed = await TeamMembership.deleteOne({ user: prila._id, team: nepalTeam._id });
    if (removed.deletedCount) console.log('[fix] Prila → removed Nepal Marathon TeamMembership');

    // Delete payroll records tagged to Nepal Marathon
    const deleted = await Payroll.deleteMany({ user: prila._id, team: nepalTeam._id });
    console.log(`[fix] Prila → deleted ${deleted.deletedCount} Nepal Marathon payroll record(s)`);
  } else {
    console.log('[fix] Prila Shrestha not found — skipping');
  }

  // ── Aayush Tamang ───────────────────────────────────────────────────────────
  const aayush = await User.findOne({ email: 'bombhu15@gmail.com' });
  if (aayush) {
    aayush.salaryFromTeam = raceTeam._id;
    await aayush.save();
    console.log('[fix] Aayush Tamang → salaryFromTeam = RaceTiming');

    // Super Admin: should have no TeamMembership
    const removedA = await TeamMembership.deleteMany({ user: aayush._id });
    if (removedA.deletedCount) console.log(`[fix] Aayush → removed ${removedA.deletedCount} TeamMembership(s)`);

    // Fix any of Aayush's payroll records still tagged to Nepal Marathon
    const fixedA = await Payroll.updateMany(
      { user: aayush._id, team: nepalTeam._id },
      { $set: { team: raceTeam._id } }
    );
    if (fixedA.modifiedCount) console.log(`[fix] Aayush → moved ${fixedA.modifiedCount} payroll record(s) to RaceTiming`);
  } else {
    console.log('[fix] Aayush Tamang not found — skipping');
  }

  console.log('[fix] Done');
  await mongoose.disconnect();
};

run().catch((err) => { console.error('[fix]', err); process.exit(1); });
