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
export const updateUserService = async (userId, {
  name, email, role, permissionLevel, monthlySalary, rfid_uid,
  workStartHour, workStartMinute, workEndHour, workEndMinute, lateGraceMinutes,
}) => {
  const ALLOWED = {};
  if (name           !== undefined) ALLOWED.name           = name;
  if (email          !== undefined) ALLOWED.email          = email.toLowerCase().trim();
  if (role           !== undefined) ALLOWED.role           = role;
  if (permissionLevel !== undefined) ALLOWED.permissionLevel = permissionLevel;
  if (monthlySalary  !== undefined) ALLOWED.monthlySalary  = Number(monthlySalary) || 0;
  if (rfid_uid       !== undefined) ALLOWED.rfid_uid       = rfid_uid ? rfid_uid.trim().toUpperCase() : null;
  if (workStartHour    !== undefined) ALLOWED.workStartHour    = Number(workStartHour);
  if (workStartMinute  !== undefined) ALLOWED.workStartMinute  = Number(workStartMinute);
  if (workEndHour      !== undefined) ALLOWED.workEndHour      = Number(workEndHour);
  if (workEndMinute    !== undefined) ALLOWED.workEndMinute    = Number(workEndMinute);
  if (lateGraceMinutes !== undefined) ALLOWED.lateGraceMinutes = Number(lateGraceMinutes);

  if (ALLOWED.email) {
    const existing = await User.findOne({ email: ALLOWED.email, _id: { $ne: userId } });
    if (existing) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  if (ALLOWED.rfid_uid) {
    const existing = await User.findOne({ rfid_uid: ALLOWED.rfid_uid, _id: { $ne: userId } });
    if (existing) {
      const err = new Error('RFID UID already assigned to another user');
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

// Update just the work schedule fields (Coordinator + Admin)
export const updateWorkScheduleService = async (userId, { workStartHour, workStartMinute, workEndHour, workEndMinute, lateGraceMinutes }) => {
  const parseHour = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 23) {
      const err = new Error('Hour must be between 0 and 23');
      err.statusCode = 400;
      throw err;
    }
    return n;
  };
  const parseMinute = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 59) {
      const err = new Error('Minute must be between 0 and 59');
      err.statusCode = 400;
      throw err;
    }
    return n;
  };

  const patch = {};
  if (workStartHour    !== undefined) patch.workStartHour    = parseHour(workStartHour);
  if (workStartMinute  !== undefined) patch.workStartMinute  = parseMinute(workStartMinute);
  if (workEndHour      !== undefined) patch.workEndHour      = parseHour(workEndHour);
  if (workEndMinute    !== undefined) patch.workEndMinute    = parseMinute(workEndMinute);
  if (lateGraceMinutes !== undefined) {
    const n = Number(lateGraceMinutes);
    if (!Number.isFinite(n) || n < 0 || n > 180) {
      const err = new Error('Grace minutes must be between 0 and 180');
      err.statusCode = 400;
      throw err;
    }
    patch.lateGraceMinutes = n;
  }

  const user = await User.findByIdAndUpdate(userId, patch, { new: true, runValidators: true })
    .select('-password -refreshTokenHash')
    .populate('salaryFromTeam', 'name');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Guard: end time must be after start time
  const startMin = user.workStartHour * 60 + user.workStartMinute;
  const endMin   = user.workEndHour   * 60 + user.workEndMinute;
  if (endMin <= startMin) {
    const err = new Error('Work end time must be after start time');
    err.statusCode = 400;
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
