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

const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_PASSWORD = "ManageX@2024";

const SEED_USERS = [
  {
    name: "Labin Gurung",
    email: "labingurung0@gmail.com",
    role: "ceo",
    permissionLevel: "admin",
    monthlySalary: 0,
  },
  {
    name: "Abhishek Rai",
    email: "abhishekraii216@gmail.com",
    role: "manager",
    permissionLevel: "manager",
    monthlySalary: 35000,
  },
  {
    name: "Aayush Tamang",
    email: "bombhu15@gmail.com",
    role: "it",
    permissionLevel: "admin",
    monthlySalary: 35000,
  },
  {
    name: "Jackson Aryal",
    email: "javksonaryal123@gmail.com",
    role: "finance",
    permissionLevel: "finance",
    monthlySalary: 20000,
  },
  {
    name: "Bijaya Rai",
    email: "donvj1998@gmail.com",
    role: "videographer",
    permissionLevel: "staff",
    monthlySalary: 20000,
  },
  {
    name: "Pradip Tamang",
    email: "undersidepradip75@gmail.com",
    role: "photographer",
    permissionLevel: "staff",
    monthlySalary: 20000,
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
    console.log(
      `  [created] ${data.email}  (${data.role} / ${data.permissionLevel})`,
    );
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
