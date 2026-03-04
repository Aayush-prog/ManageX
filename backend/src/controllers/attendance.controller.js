import {
  getTodayService,
  clockOutService,
  getMyAttendanceService,
  getTeamAttendanceService,
  getAllAttendanceService,
} from '../services/attendance.service.js';

const currentYearMonth = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

// POST /api/attendance/clock-out
export const clockOut = async (req, res, next) => {
  try {
    const record = await clockOutService(req.user.id);
    if (!record) {
      return res.status(400).json({ success: false, message: 'No open session to clock out' });
    }
    return res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

// GET /api/attendance/me/today
export const getToday = async (req, res, next) => {
  try {
    const record = await getTodayService(req.user.id);
    return res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/me?year=&month=
export const getMyAttendance = async (req, res, next) => {
  try {
    const def = currentYearMonth();
    const year  = parseInt(req.query.year,  10) || def.year;
    const month = parseInt(req.query.month, 10) || def.month;

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'month must be 1–12' });
    }

    const data = await getMyAttendanceService(req.user.id, year, month);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/team?year=&month=   (Manager+)
export const getTeamAttendance = async (req, res, next) => {
  try {
    const def = currentYearMonth();
    const year  = parseInt(req.query.year,  10) || def.year;
    const month = parseInt(req.query.month, 10) || def.month;

    const records = await getTeamAttendanceService(year, month);
    return res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/all?year=&month=   (CEO)
export const getAllAttendance = async (req, res, next) => {
  try {
    const def = currentYearMonth();
    const year  = parseInt(req.query.year,  10) || def.year;
    const month = parseInt(req.query.month, 10) || def.month;

    const records = await getAllAttendanceService(year, month);
    return res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};
