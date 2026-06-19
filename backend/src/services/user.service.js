import User from '../models/User.js';

// List all users (including inactive) for admin view
export const listAllUsersService = async () =>
  User.find()
    .select('-password -refreshTokenHash')
    .populate('salaryFromTeam', 'name')
    .sort({ name: 1 })
    .lean();

// Create a new user (CEO only)
export const createUserService = async ({ name, email, password, role, permissionLevel, monthlySalary }) => {
  if (!name || !email || !password || !role || !permissionLevel) {
    const err = new Error('name, email, password, role, and permissionLevel are required');
    err.statusCode = 400;
    throw err;
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }
  const user = await User.create({ name, email, password, role, permissionLevel, monthlySalary: monthlySalary ?? 0 });
  return user;
};

// Admin reset — set any user's password (CEO only)
export const adminSetPasswordService = async (userId, newPassword) => {
  if (!newPassword || newPassword.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.password = newPassword; // pre-save hook hashes it
  user.refreshTokenHash = null; // invalidate active sessions
  await user.save();
};

// Self-service — change own password (any auth user)
export const changeOwnPasswordService = async (userId, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 8) {
    const err = new Error('New password must be at least 8 characters');
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 401;
    throw err;
  }
  user.password = newPassword;
  await user.save();
};

// Update which team a user's salary is drawn from
export const updateSalaryFromTeamService = async (userId, salaryFromTeam) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { salaryFromTeam: salaryFromTeam || null },
    { new: true }
  ).populate('salaryFromTeam', 'name');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

// Update user profile (Super Admin only)
export const updateUserService = async (userId, { name, email, role, permissionLevel, monthlySalary }) => {
  const ALLOWED = {};
  if (name           !== undefined) ALLOWED.name           = name;
  if (email          !== undefined) ALLOWED.email          = email.toLowerCase().trim();
  if (role           !== undefined) ALLOWED.role           = role;
  if (permissionLevel !== undefined) ALLOWED.permissionLevel = permissionLevel;
  if (monthlySalary  !== undefined) ALLOWED.monthlySalary  = Number(monthlySalary) || 0;

  if (ALLOWED.email) {
    const existing = await User.findOne({ email: ALLOWED.email, _id: { $ne: userId } });
    if (existing) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  const user = await User.findByIdAndUpdate(userId, ALLOWED, { new: true, runValidators: true })
    .select('-password -refreshTokenHash')
    .populate('salaryFromTeam', 'name');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

// Toggle isActive (CEO only)
export const toggleActiveService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.isActive = !user.isActive;
  if (!user.isActive) user.refreshTokenHash = null; // force logout
  await user.save();
  return user;
};
