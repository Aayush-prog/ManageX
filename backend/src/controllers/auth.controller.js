import { loginService, refreshService, logoutService } from '../services/auth.service.js';
import { clockInService, clockOutService } from '../services/attendance.service.js';
import env from '../config/env.js';

const REFRESH_COOKIE = 'managex_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { accessToken, refreshToken, user } = await loginService(email, password);

    // Auto clock-in: pass real client IP (trust proxy is set in app.js)
    const { record: attendance, skipped } = await clockInService(user._id, req.ip);

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissionLevel: user.permissionLevel,
      },
      attendance: attendance
        ? {
            clockIn:      attendance.clockIn,
            locationType: attendance.locationType,
            isLate:       attendance.isLate,
          }
        : null,
      checkInSkipped: skipped, // true when login is outside working hours
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.[REFRESH_COOKIE];

    const { accessToken, refreshToken: newRefreshToken } = await refreshService(incomingToken);

    // Rotate cookie
    res.cookie(REFRESH_COOKIE, newRefreshToken, cookieOptions);

    return res.status(200).json({ success: true, token: accessToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.[REFRESH_COOKIE];

    // Best effort — auto clock-out + clear tokens
    if (req.user?.id) {
      await Promise.all([
        clockOutService(req.user.id, req.ip),
        logoutService(req.user.id),
      ]);
    }

    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};
