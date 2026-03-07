import app from './src/app.js';
import connectDB from './src/config/db.js';
import env from './src/config/env.js';
import { startAutoClockOutJob } from './src/jobs/autoClockOut.js';
import { startTaskOverdueJob } from './src/jobs/taskOverdueJob.js';
import { startOrganizerContactJob } from './src/jobs/organizerContactJob.js';

const start = async () => {
  await connectDB();

  startAutoClockOutJob();
  startTaskOverdueJob();
  startOrganizerContactJob();

  app.listen(env.PORT, () => {
    console.log(`[server] ManageX API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start();
