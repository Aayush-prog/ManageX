import app from './src/app.js';
import connectDB from './src/config/db.js';
import env from './src/config/env.js';
import { startTaskOverdueJob } from './src/jobs/taskOverdueJob.js';
import { startOrganizerContactJob } from './src/jobs/organizerContactJob.js';
import { startNightlyFinalizeJob } from './src/jobs/nightlyFinalizeJob.js';
import { startAttendanceNotifyJob } from './src/jobs/attendanceNotifyJob.js';

const start = async () => {
  await connectDB();

  startTaskOverdueJob();
  startOrganizerContactJob();
  startNightlyFinalizeJob();
  startAttendanceNotifyJob();

  app.listen(env.PORT, () => {
    console.log(`[server] ManageX API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start();
