import { getUserReportService } from '../services/report.service.js';

// GET /api/reports/user/:id?startFrom=YYYY-MM-DD&startTo=YYYY-MM-DD
export const getUserReport = async (req, res, next) => {
  try {
    const { startFrom, startTo } = req.query;
    if (!startFrom || !startTo) {
      return res.status(400).json({ success: false, message: 'startFrom and startTo are required' });
    }
    const data = await getUserReportService(req.params.id, { startFrom, startTo });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
};
