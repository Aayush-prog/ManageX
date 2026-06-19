/**
 * ManageX Seed Script
 * Usage: node src/seeds/seed.js
 *
 * Creates users, teams, and team memberships with correct salary assignments.
 * Safe to re-run — skips existing emails and teams.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

import User from "../models/User.js";
import Team from "../models/Team.js";
import TeamMembership from "../models/TeamMembership.js";

const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_PASSWORD = "ManageX@2024";

const SEED_USERS = [
  {
    name: "Labin Gurung",
    email: "labingurung0@gmail.com",
    role: "ceo",
    permissionLevel: "admin",
    isSuperAdmin: true,
    monthlySalary: 0,
  },
  {
    name: "Abhishek Rai",
    email: "abhishekraii216@gmail.com",
    role: "coordinator",
    permissionLevel: "coordinator",
    monthlySalary: 35000,
    // salaryFromTeam set after teams are created
  },
  {
    name: "Aayush Tamang",
    email: "bombhu15@gmail.com",
    role: "it",
    permissionLevel: "admin",
    isSuperAdmin: true,
    monthlySalary: 35000,
    // salaryFromTeam: RaceTiming — set after teams are created
  },
  {
    name: "Jackson Aryal",
    email: "javksonaryal123@gmail.com",
    role: "finance",
    permissionLevel: "finance",
    monthlySalary: 20000,
    // salaryFromTeam: Nepal Marathon
  },
  {
    name: "Bijaya Rai",
    email: "donvj1998@gmail.com",
    role: "videographer",
    permissionLevel: "staff",
    monthlySalary: 20000,
    // salaryFromTeam: Nepal Marathon
  },
  {
    name: "Pradip Tamang",
    email: "undersidepradip75@gmail.com",
    role: "photographer",
    permissionLevel: "staff",
    monthlySalary: 20000,
    // salaryFromTeam: Nepal Marathon
  },
  {
    name: "Prilaz Shrestha",
    email: "prilazshrestha090@gmail.com",
    role: "staff",
    permissionLevel: "staff",
    monthlySalary: 20000,
    // salaryFromTeam: RaceTiming
  },
];

const SEED_TEAMS = [
  { name: "RaceTiming", description: "Race timing operations team" },
  { name: "Nepal Marathon", description: "Nepal Marathon event team" },
];

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`[seed] Connected to MongoDB: ${MONGO_URI}`);

  // ── Seed Users (basic info, no salaryFromTeam yet) ─────────────────────────
  let created = 0;
  let skipped = 0;
  const userMap = {};

  for (const data of SEED_USERS) {
    let user = await User.findOne({ email: data.email });
    if (user) {
      console.log(`  [skip]    ${data.email}  (already exists)`);
      skipped++;
    } else {
      const { ...rest } = data;
      user = await User.create({ ...rest, password: DEFAULT_PASSWORD });
      console.log(
        `  [created] ${data.email}  (${data.role} / ${data.permissionLevel})`,
      );
      created++;
    }
    userMap[data.email] = user;
  }

  console.log(`\n[seed] Users — ${created} created, ${skipped} skipped`);
  console.log(`[seed] Default password: ${DEFAULT_PASSWORD}`);

  // ── Seed Teams ──────────────────────────────────────────────────────────────
  const teamMap = {};
  for (const t of SEED_TEAMS) {
    let team = await Team.findOne({ name: t.name });
    if (!team) {
      team = await Team.create(t);
      console.log(`  [created] team: ${t.name}`);
    } else {
      console.log(`  [skip]    team: ${t.name}  (already exists)`);
    }
    teamMap[t.name] = team;
  }

  // ── Set salaryFromTeam ──────────────────────────────────────────────────────
  // Aayush Tamang → RaceTiming
  // Everyone else → Nepal Marathon
  const raceTimingId = teamMap["RaceTiming"]._id;
  const nepalMarathonId = teamMap["Nepal Marathon"]._id;

  const salaryTeamMap = {
    "bombhu15@gmail.com":            raceTimingId,    // Aayush → RaceTiming
    "labingurung0@gmail.com":        nepalMarathonId, // Labin → Nepal Marathon
    "abhishekraii216@gmail.com":     nepalMarathonId, // Abhishek → Nepal Marathon
    "javksonaryal123@gmail.com":     nepalMarathonId, // Jackson → Nepal Marathon
    "donvj1998@gmail.com":           nepalMarathonId, // Bijaya → Nepal Marathon
    "undersidepradip75@gmail.com":   nepalMarathonId, // Pradip → Nepal Marathon
    "prilazshrestha090@gmail.com":   raceTimingId,    // Prilaz → RaceTiming
  };

  for (const [email, teamId] of Object.entries(salaryTeamMap)) {
    const user = userMap[email];
    if (!user) continue;
    await User.findByIdAndUpdate(user._id, { salaryFromTeam: teamId });
    const teamName = teamId.equals(raceTimingId) ? "RaceTiming" : "Nepal Marathon";
    console.log(`  [salary]  ${user.name} → salary from ${teamName}`);
  }

  // ── Seed Team Memberships ───────────────────────────────────────────────────
  // Abhishek Rai  → Nepal Marathon / coordinator ONLY
  // Jackson Aryal → both teams / finance
  // Bijaya Rai    → Nepal Marathon / staff
  // Pradip Tamang → Nepal Marathon / staff
  // Aayush Tamang → RaceTiming (super admin but needs team for payroll context)
  // Labin Gurung  → super admin, no team membership needed
  const membershipRules = [
    { email: "abhishekraii216@gmail.com",   teams: ["Nepal Marathon"],              role: "coordinator" },
    { email: "javksonaryal123@gmail.com",   teams: ["RaceTiming", "Nepal Marathon"], role: "finance" },
    { email: "donvj1998@gmail.com",         teams: ["Nepal Marathon"],              role: "staff" },
    { email: "undersidepradip75@gmail.com", teams: ["Nepal Marathon"],              role: "staff" },
    { email: "prilazshrestha090@gmail.com", teams: ["RaceTiming"],                 role: "staff" },
    // Aayush is Super Admin — no team membership needed; salaryFromTeam handles payroll
  ];

  for (const rule of membershipRules) {
    const user = userMap[rule.email];
    if (!user) continue;
    for (const teamName of rule.teams) {
      const team = teamMap[teamName];
      if (!team) continue;
      await TeamMembership.findOneAndUpdate(
        { user: user._id, team: team._id },
        { role: rule.role },
        { upsert: true }
      );
      console.log(`  [membership] ${user.name} → ${teamName} / ${rule.role}`);
    }
  }

  console.log("\n[seed] Done");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("[seed] Error:", err.message);
  process.exit(1);
});
