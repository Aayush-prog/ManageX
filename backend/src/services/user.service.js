import User from '../models/User.js';

// List all users (including inactive) for admin view
export const listAllUsersService = async () =>
  User.find()
    .select('-password -refreshTokenHash')
    .sort({ name: 1 })
    .lean();

// Create a new user (CEO only)
export const createUserService = async ({ name, email, password, role, monthlySalary }) => {
  if (!name || !email || !password || !role) {
    const err = new Error('name, email, password, and role are required');
    err.statusCode = 400;
    throw err;
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Email already in use');
    err.statusCode = 409;
    throw err;
  }
  const user = await User.create({ name, email, password, role, monthlySalary: monthlySalary ?? 0 });
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
