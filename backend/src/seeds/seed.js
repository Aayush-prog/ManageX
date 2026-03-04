/**
 * ManageX Seed Script
 * Usage: node src/seeds/seed.js
 *
 * Creates one user per role with a known default password.
 * Safe to re-run — skips existing emails.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});

import User from "../models/User.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/managex";
const DEFAULT_PASSWORD = "ManageX@2024";

const SEED_USERS = [
  {
    name: "Labin Gurung",
    email: "ceo@nepalmarathon.com",
    role: "ceo",
    monthlySalary: 0,
  },
  {
    name: "Abhishek Rai",
    email: "manager@nepalmarathon.com",
    role: "manager",
    monthlySalary: 55000,
  },
  {
    name: "Aayush Tamang",
    email: "it@nepalmarathon.com",
    role: "it",
    monthlySalary: 45000,
  },
  {
    name: "Jackson Aryal",
    email: "finance@nepalmarathon.com",
    role: "finance",
    monthlySalary: 50000,
  },
  {
    name: "Bijaya Rai",
    email: "video@nepalmarathon.com",
    role: "videographer",
    monthlySalary: 40000,
  },
  {
    name: "Pradip Tamang",
    email: "photo@nepalmarathon.com",
    role: "photographer",
    monthlySalary: 40000,
  },
];

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`[seed] Connected to MongoDB: ${MONGO_URI}`);

  let created = 0;
  let skipped = 0;

  for (const data of SEED_USERS) {
    const exists = await User.findOne({ email: data.email });
    if (exists) {
      console.log(`  [skip]    ${data.email}  (already exists)`);
      skipped++;
      continue;
    }
    await User.create({ ...data, password: DEFAULT_PASSWORD });
    console.log(`  [created] ${data.email}  (${data.role})`);
    created++;
  }

  console.log(`\n[seed] Done — ${created} created, ${skipped} skipped`);
  console.log(`[seed] Default password: ${DEFAULT_PASSWORD}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("[seed] Error:", err.message);
  process.exit(1);
});
