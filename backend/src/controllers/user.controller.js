import {
  listUsersService,
  updateSalaryService,
  updateSSFService,
  updateTDSService,
} from '../services/payroll.service.js';

import {
  listAllUsersService,
  createUserService,
  adminSetPasswordService,
  changeOwnPasswordService,
  toggleActiveService,
  updateSalaryFromTeamService,
  updateUserService,
} from '../services/user.service.js';

// GET /api/users   [finance, coordinator, admin]
export const listUsers = async (req, res, next) => {
  try {
    const teamId = req.headers['x-active-team'] || null;
    const users = await listUsersService(teamId);
    return res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// GET /api/users/all   [ceo]
export const listAllUsers = async (req, res, next) => {
  try {
    const users = await listAllUsersService();
    return res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// POST /api/users   [ceo]
export const createUser = async (req, res, next) => {
  try {
    const user = await createUserService(req.body);
    return res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/users/update-salary/:id   [finance, ceo]
export const updateSalary = async (req, res, next) => {
  try {
    const { monthlySalary } = req.body;
    const user = await updateSalaryService(req.params.id, monthlySalary);
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/users/update-tds/:id   [finance, admin]
export const updateTDS = async (req, res, next) => {
  try {
    const { tdsPercent } = req.body;
    const user = await updateTDSService(req.params.id, Number(tdsPercent));
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/users/update-ssf/:id   [finance, ceo]
export const updateSSF = async (req, res, next) => {
  try {
    const { ssfEmployeePercent, ssfEmployerPercent } = req.body;
    const user = await updateSSFService(req.params.id, ssfEmployeePercent, ssfEmployerPercent);
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/set-password   [ceo]
export const adminSetPassword = async (req, res, next) => {
  try {
    await adminSetPasswordService(req.params.id, req.body.newPassword);
    return res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};

// PATCH /api/users/change-password   [any auth]
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await changeOwnPasswordService(req.user.id, currentPassword, newPassword);
    return res.json({ success: true, message: 'Password changed' });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/toggle-active   [ceo]
export const toggleActive = async (req, res, next) => {
  try {
    const user = await toggleActiveService(req.params.id);
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id   [super admin]
export const updateUser = async (req, res, next) => {
  try {
    const user = await updateUserService(req.params.id, req.body);
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/salary-from-team   [super admin, finance, admin]
export const updateSalaryFromTeam = async (req, res, next) => {
  try {
    const user = await updateSalaryFromTeamService(req.params.id, req.body.salaryFromTeam);
    return res.json({ success: true, data: user });
  } catch (err) { next(err); }
};
