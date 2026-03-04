import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';

const signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

const signRefreshToken = (payload) =>
  jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN });

const buildTokenPayload = (user) => ({
  id: user._id,
  role: user.role,
  name: user.name,
  email: user.email,
});

// ---------- login ----------
export const loginService = async (email, password) => {
  const user = await User.findOne({ email }).select('+password +refreshTokenHash');

  if (!user || !(await user.comparePassword(password))) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account is deactivated. Contact IT.');
    err.statusCode = 403;
    throw err;
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.setRefreshToken(refreshToken);
  await user.save();

  return { accessToken, refreshToken, user };
};

// ---------- refresh ----------
export const refreshService = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const err = new Error('No refresh token');
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, env.REFRESH_TOKEN_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.validateRefreshToken(incomingRefreshToken)) {
    const err = new Error('Refresh token revoked');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    throw err;
  }

  // Token rotation — issue new pair
  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  user.setRefreshToken(newRefreshToken);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

// ---------- logout ----------
export const logoutService = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
};
