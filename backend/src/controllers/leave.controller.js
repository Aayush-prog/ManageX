import {
  requestLeaveService,
  getMyLeavesService,
  getAllLeavesService,
  approveLeaveService,
  rejectLeaveService,
  getQuotaService,
} from '../services/leave.service.js';

const ok  = (res, data, code = 200) => res.status(code).json({ success: true, data });
const err = (res, e,    code = 400) => res.status(code).json({ success: false, message: e.message });

// POST /api/leaves
export const requestLeave = async (req, res) => {
  try {
    ok(res, await requestLeaveService(req.user.id, req.body), 201);
  } catch (e) { err(res, e); }
};

// GET /api/leaves/my?year=&startFrom=&startTo=
export const getMyLeaves = async (req, res) => {
  try {
    const { year, startFrom, startTo } = req.query;
    ok(res, await getMyLeavesService(req.user.id, year, startFrom, startTo));
  } catch (e) { err(res, e); }
};

// GET /api/leaves/all?year=&status=&userId=
export const getAllLeaves = async (req, res) => {
  try {
    ok(res, await getAllLeavesService(req.query));
  } catch (e) { err(res, e); }
};

// GET /api/leaves/quota?year=
export const getQuota = async (req, res) => {
  try {
    ok(res, await getQuotaService(req.user.id, req.query.year));
  } catch (e) { err(res, e); }
};

// PATCH /api/leaves/:id/approve
export const approveLeave = async (req, res) => {
  try {
    ok(res, await approveLeaveService(req.params.id, req.user.id));
  } catch (e) { err(res, e); }
};

// PATCH /api/leaves/:id/reject
export const rejectLeave = async (req, res) => {
  try {
    ok(res, await rejectLeaveService(req.params.id, req.user.id, req.body.reason));
  } catch (e) { err(res, e); }
};
