import dotenv from 'dotenv';

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/managex',
  JWT_SECRET: process.env.JWT_SECRET || 'changeme_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'changeme_refresh_in_production',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Attendance
  OFFICE_IP:              process.env.OFFICE_IP                        || '127.0.0.1',
  TIMEZONE:               process.env.TIMEZONE                         || 'Asia/Kathmandu',
  LATE_HOUR:              parseInt(process.env.LATE_HOUR,              10) || 12, // late after 12:00 PM
  CLOCKOUT_HOUR:          parseInt(process.env.CLOCKOUT_HOUR,          10) || 17, // 5:00 PM
  CLOCKOUT_MINUTE:        parseInt(process.env.CLOCKOUT_MINUTE,        10) || 0,
  CLOCKOUT_GRACE_MINUTES: parseInt(process.env.CLOCKOUT_GRACE_MINUTES, 10) || 15, // ±15 min window
};

const required = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'MONGO_URI', 'OFFICE_IP'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] WARNING: ${key} is not set in environment variables`);
  }
}

export default env;
