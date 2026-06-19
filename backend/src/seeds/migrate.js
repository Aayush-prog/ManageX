/**
 * Migration script: Convert to new role architecture + team-scope all data
 * Run: node src/seeds/migrate.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import User from '../models/User.js';
import Team from '../models/Team.js';
import TeamMembership from '../models/TeamMembership.js';
import Project from '../models/Project.js';
import Expense from '../models/Expense.js';
import Bill from '../models/Bill.js';
import Payroll from '../models/Payroll.js';
import Excursion from '../models/Excursion.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[migrate] Connected');

  // 1. Create teams
  const teamDefs = [
    { name: 'RaceTiming', description: 'Race timing operations team' },
    { name: 'Nepal Marathon', description: 'Nepal Marathon event team' },
  ];

  const teamMap = {};
  for (const t of teamDefs) {
    let team = await Team.findOne({ name: t.name });
    if (!team) {
      team = await Team.create(t);
      console.log(`[migrate] Created team: ${t.name}`);
    } else {
      console.log(`[migrate] Team exists: ${t.name}`);
    }
    teamMap[t.name] = team;
  }

  const raceTimingId   = teamMap['RaceTiming']._id;
  const nepalMarathonId = teamMap['Nepal Marathon']._id;

  // 2. Migrate admin users → Super Admin
  const adminUsers = await User.find({ permissionLevel: 'admin' });
  for (const user of adminUsers) {
    user.isSuperAdmin = true;
    await user.save();
    console.log(`[migrate] ${user.name} → isSuperAdmin: true`);
  }

  // 3. Migrate manager users → coordinator in Nepal Marathon only
  const managerUsers = await User.find({ permissionLevel: 'manager' });
  for (const user of managerUsers) {
    user.permissionLevel = 'coordinator';
    user.salaryFromTeam  = nepalMarathonId;
    await user.save();
    await TeamMembership.findOneAndUpdate(
      { user: user._id, team: nepalMarathonId },
      { role: 'coordinator' },
      { upsert: true }
    );
    console.log(`[migrate] ${user.name} → Nepal Marathon / coordinator`);
  }

  // 4. Migrate finance users → finance in both teams, salary from Nepal Marathon
  const financeUsers = await User.find({ permissionLevel: 'finance' });
  for (const user of financeUsers) {
    user.salaryFromTeam = nepalMarathonId;
    await user.save();
    for (const [teamName, team] of Object.entries(teamMap)) {
      await TeamMembership.findOneAndUpdate(
        { user: user._id, team: team._id },
        { role: 'finance' },
        { upsert: true }
      );
      console.log(`[migrate] ${user.name} → ${teamName} / finance`);
    }
  }

  // 5. Migrate staff users → Nepal Marathon / staff, salary from Nepal Marathon
  const staffUsers = await User.find({ permissionLevel: 'staff' });
  for (const user of staffUsers) {
    user.salaryFromTeam = nepalMarathonId;
    await user.save();
    await TeamMembership.findOneAndUpdate(
      { user: user._id, team: nepalMarathonId },
      { role: 'staff' },
      { upsert: true }
    );
    console.log(`[migrate] ${user.name} → Nepal Marathon / staff`);
  }

  // 6. Set isSuperAdmin users' salaryFromTeam
  // Aayush Tamang (bombhu15@gmail.com) → RaceTiming
  // Labin Gurung → Nepal Marathon (if has salary)
  const aayush = await User.findOne({ email: 'bombhu15@gmail.com' });
  if (aayush) {
    aayush.salaryFromTeam = raceTimingId;
    await aayush.save();
    // Remove any existing team membership — Super Admin accesses all teams without one
    await TeamMembership.deleteMany({ user: aayush._id });
    console.log('[migrate] Aayush Tamang → salary from RaceTiming (no team membership — Super Admin)');
  }

  // 7. Assign all existing projects to Nepal Marathon
  const projectResult = await Project.updateMany(
    { team: { $exists: false } },
    { $set: { team: nepalMarathonId } }
  );
  // Also update any that have team: null
  const projectResult2 = await Project.updateMany(
    { team: null },
    { $set: { team: nepalMarathonId } }
  );
  console.log(`[migrate] Projects → Nepal Marathon: ${projectResult.modifiedCount + projectResult2.modifiedCount} updated`);

  // 8. Assign all existing expenses to Nepal Marathon
  const expResult = await Expense.updateMany(
    { $or: [{ team: { $exists: false } }, { team: null }] },
    { $set: { team: nepalMarathonId } }
  );
  console.log(`[migrate] Expenses → Nepal Marathon: ${expResult.modifiedCount} updated`);

  // 9. Assign all existing bills to Nepal Marathon
  const billResult = await Bill.updateMany(
    { $or: [{ team: { $exists: false } }, { team: null }] },
    { $set: { team: nepalMarathonId } }
  );
  console.log(`[migrate] Bills → Nepal Marathon: ${billResult.modifiedCount} updated`);

  // 10. Assign all existing payroll records to their user's salaryFromTeam
  //     For now, default all to Nepal Marathon (Aayush's will be updated separately if needed)
  const payrollResult = await Payroll.updateMany(
    { $or: [{ team: { $exists: false } }, { team: null }] },
    { $set: { team: nepalMarathonId } }
  );
  console.log(`[migrate] Payroll → Nepal Marathon: ${payrollResult.modifiedCount} updated`);

  // Update Aayush's payroll to RaceTiming if he has any
  if (aayush) {
    const aayushPayroll = await Payroll.updateMany(
      { user: aayush._id },
      { $set: { team: raceTimingId } }
    );
    if (aayushPayroll.modifiedCount) {
      console.log(`[migrate] Aayush payroll → RaceTiming: ${aayushPayroll.modifiedCount} updated`);
    }
  }

  // 11. Assign all existing excursions to Nepal Marathon
  const excursionResult = await Excursion.updateMany(
    { $or: [{ team: { $exists: false } }, { team: null }] },
    { $set: { team: nepalMarathonId } }
  );
  console.log(`[migrate] Excursions → Nepal Marathon: ${excursionResult.modifiedCount} updated`);

  console.log('[migrate] Done');
  await mongoose.disconnect();
};

run().catch((err) => { console.error('[migrate]', err); process.exit(1); });
