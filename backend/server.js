import app from './src/app.js';
import connectDB from './src/config/db.js';
import env from './src/config/env.js';
import { startAutoClockOutJob } from './src/jobs/autoClockOut.js';
import { startTaskOverdueJob } from './src/jobs/taskOverdueJob.js';

const start = async () => {
  await connectDB();

  startAutoClockOutJob();
  startTaskOverdueJob();

  app.listen(env.PORT, () => {
    console.log(`[server] ManageX API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start();
