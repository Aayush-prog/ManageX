import {
  getMyAttendanceService,
  getTeamAttendanceService,
  getAllAttendanceService,
  editAttendanceService,
  createAttendanceService,
  getTeamAttendanceSummaryService,
  seedAttendanceService,
  markAllPresentTodayService,
} from '../services/attendance.service.js';

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
    const start  = req.query.start || defStart;
    const end    = req.query.end   || defEnd;
    const teamId = req.headers['x-active-team'] || null;
    const records = await getTeamAttendanceService(start, end, teamId);
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

// POST /api/attendance   (Coordinator / Admin) — manual record creation for any user
export const createAttendance = async (req, res, next) => {
  try {
    const { userId, date, clockIn, clockOut, isLate } = req.body;
    if (!userId || !date || !clockIn) {
      return res.status(400).json({ success: false, message: 'userId, date, and clockIn are required' });
    }
    const record = await createAttendanceService({ userId, date, clockIn, clockOut, isLate });
    return res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// POST /api/attendance/self   (any auth user) — add own attendance
export const createSelfAttendance = async (req, res, next) => {
  try {
    const { date, clockIn, clockOut, isLate } = req.body;
    if (!date || !clockIn) {
      return res.status(400).json({ success: false, message: 'date and clockIn are required' });
    }
    const record = await createAttendanceService({ userId: req.user.id, date, clockIn, clockOut, isLate });
    return res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// GET /api/attendance/team-summary?start=YYYY-MM-DD&end=YYYY-MM-DD   (Coordinator+)
export const getTeamAttendanceSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const defStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    const start  = req.query.start || defStart;
    const end    = req.query.end   || defEnd;
    const teamId = req.headers['x-active-team'] || null;
    const summary = await getTeamAttendanceSummaryService(start, end, teamId);
    return res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};

// POST /api/attendance/seed   (Coordinator / Admin) — bulk backfill
export const seedAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }
    const result = await seedAttendanceService(startDate, endDate);
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// POST /api/attendance/mark-today   (Coordinator / Admin) — mark all active users 12:00–17:00 today
export const markAllPresentToday = async (req, res, next) => {
  try {
    const result = await markAllPresentTodayService();
    return res.json({ success: true, data: result });
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
