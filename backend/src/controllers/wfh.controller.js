import {
  requestWFHService,
  getMyWFHService,
  getAllWFHService,
  approveWFHService,
  rejectWFHService,
} from '../services/wfh.service.js';

const ok  = (res, data, code = 200) => res.status(code).json({ success: true, data });
const err = (res, e,    code = 400) => res.status(code).json({ success: false, message: e.message });

// POST /api/wfh
export const requestWFH = async (req, res) => {
  try {
    ok(res, await requestWFHService(req.user.id, req.body), 201);
  } catch (e) { err(res, e); }
};

// GET /api/wfh/my?year=&startFrom=&startTo=
export const getMyWFH = async (req, res) => {
  try {
    const { year, startFrom, startTo } = req.query;
    ok(res, await getMyWFHService(req.user.id, year, startFrom, startTo));
  } catch (e) { err(res, e); }
};

// GET /api/wfh/all?year=&status=&userId=
export const getAllWFH = async (req, res) => {
  try {
    const teamId = req.headers['x-active-team'] || null;
    ok(res, await getAllWFHService({ ...req.query, teamId, requesterId: req.user.id }));
  } catch (e) { err(res, e); }
};

// PATCH /api/wfh/:id/approve
export const approveWFH = async (req, res) => {
  try {
    ok(res, await approveWFHService(req.params.id, req.user.id));
  } catch (e) { err(res, e); }
};

// PATCH /api/wfh/:id/reject
export const rejectWFH = async (req, res) => {
  try {
    ok(res, await rejectWFHService(req.params.id, req.user.id, req.body.reason));
  } catch (e) { err(res, e); }
};
