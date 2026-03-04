import {
  listUsersService,
  updateSalaryService,
  updateSSFService,
} from '../services/payroll.service.js';

import {
  listAllUsersService,
  createUserService,
  adminSetPasswordService,
  changeOwnPasswordService,
  toggleActiveService,
} from '../services/user.service.js';

// GET /api/users   [finance, ceo, manager]
export const listUsers = async (req, res, next) => {
  try {
    const users = await listUsersService();
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
