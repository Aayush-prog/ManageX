import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import TeamMembership from '../models/TeamMembership.js';

// ── authenticate ──────────────────────────────────────────────────────────────
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── allowSuperAdmin ───────────────────────────────────────────────────────────
export const allowSuperAdmin = () => (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  }
  next();
};

// ── allowRoles ────────────────────────────────────────────────────────────────
export const allowRoles = (...roles) => async (req, res, next) => {
  if (!req.user) return res.status(403).json({ success: false, message: 'Access denied' });
  if (req.user.isSuperAdmin) return next();

  const teamId = req.headers['x-active-team'];
  if (teamId) {
    const membership = await TeamMembership.findOne({ user: req.user.id, team: teamId }).lean();
    if (membership && roles.includes(membership.role)) return next();
    return res.status(403).json({ success: false, message: 'Access denied for this team' });
  }

  // Fallback to permissionLevel
  if (roles.includes(req.user.permissionLevel)) return next();
  return res.status(403).json({ success: false, message: 'Access denied' });
};
