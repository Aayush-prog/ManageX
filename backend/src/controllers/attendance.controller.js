import {
  getTodayService,
  clockOutService,
  getMyAttendanceService,
  getTeamAttendanceService,
  getAllAttendanceService,
  editAttendanceService,
} from '../services/attendance.service.js';

const currentYearMonth = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

// POST /api/attendance/clock-out
export const clockOut = async (req, res, next) => {
  try {
    const record = await clockOutService(req.user.id, req.ip);
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

// GET /api/attendance/me?start=YYYY-MM-DD&end=YYYY-MM-DD
export const getMyAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const defStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    const start = req.query.start || defStart;
    const end   = req.query.end   || defEnd;
    const data = await getMyAttendanceService(req.user.id, start, end);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/team?start=YYYY-MM-DD&end=YYYY-MM-DD   (Manager+)
export const getTeamAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const defStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    const start = req.query.start || defStart;
    const end   = req.query.end   || defEnd;
    const records = await getTeamAttendanceService(start, end);
    return res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/attendance/:id   (Manager / Admin)
export const editAttendance = async (req, res, next) => {
  try {
    const record = await editAttendanceService(req.params.id, req.body);
    return res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

// GET /api/attendance/all?start=YYYY-MM-DD&end=YYYY-MM-DD   (Admin)
export const getAllAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const defStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    const start = req.query.start || defStart;
    const end   = req.query.end   || defEnd;
    const records = await getAllAttendanceService(start, end);
    return res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};
