import Team from '../models/Team.js';
import TeamMembership, { TEAM_ROLES } from '../models/TeamMembership.js';
import User from '../models/User.js';

// ── Teams ──────────────────────────────────────────────────────────────────────

export const listTeamsService = async () =>
  Team.find().sort({ name: 1 }).lean();

export const getTeamService = async (teamId) => {
  const team = await Team.findById(teamId).lean();
  if (!team) { const e = new Error('Team not found'); e.statusCode = 404; throw e; }
  return team;
};

export const createTeamService = async ({ name, description, createdBy }) => {
  if (!name) { const e = new Error('name is required'); e.statusCode = 400; throw e; }
  const existing = await Team.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) { const e = new Error('Team name already exists'); e.statusCode = 409; throw e; }
  return Team.create({ name, description: description || '', createdBy });
};

export const updateTeamService = async (teamId, { name, description, isActive }) => {
  const team = await Team.findById(teamId);
  if (!team) { const e = new Error('Team not found'); e.statusCode = 404; throw e; }
  if (name !== undefined) team.name = name;
  if (description !== undefined) team.description = description;
  if (isActive !== undefined) team.isActive = isActive;
  await team.save();
  return team;
};

export const deleteTeamService = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) { const e = new Error('Team not found'); e.statusCode = 404; throw e; }
  await TeamMembership.deleteMany({ team: teamId });
  await Team.findByIdAndDelete(teamId);
};

// ── Team Memberships ───────────────────────────────────────────────────────────

export const getTeamMembersService = async (teamId) => {
  const members = await TeamMembership.find({ team: teamId })
    .populate('user', 'name email role isActive isSuperAdmin')
    .sort({ role: 1 })
    .lean();

  // Always include super admins even if they have no team membership
  const memberUserIds = new Set(members.map((m) => m.user?._id?.toString()));
  const superAdmins = await User.find({ isSuperAdmin: true, isActive: true }).select('name email role isActive isSuperAdmin').lean();
  for (const sa of superAdmins) {
    if (!memberUserIds.has(sa._id.toString())) {
      members.push({ user: sa, role: 'superAdmin', _isSuperAdminEntry: true });
    }
  }

  return members;
};

export const addTeamMemberService = async (teamId, { userId, role }) => {
  if (!userId || !role) { const e = new Error('userId and role are required'); e.statusCode = 400; throw e; }
  if (!TEAM_ROLES.includes(role)) { const e = new Error(`role must be one of: ${TEAM_ROLES.join(', ')}`); e.statusCode = 400; throw e; }
  const user = await User.findById(userId);
  if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }
  const team = await Team.findById(teamId);
  if (!team) { const e = new Error('Team not found'); e.statusCode = 404; throw e; }

  const membership = await TeamMembership.findOneAndUpdate(
    { user: userId, team: teamId },
    { role },
    { upsert: true, new: true }
  ).populate('user', 'name email role');
  return membership;
};

export const updateTeamMemberRoleService = async (teamId, userId, role) => {
  if (!TEAM_ROLES.includes(role)) { const e = new Error(`role must be one of: ${TEAM_ROLES.join(', ')}`); e.statusCode = 400; throw e; }
  const membership = await TeamMembership.findOneAndUpdate(
    { user: userId, team: teamId },
    { role },
    { new: true }
  ).populate('user', 'name email role');
  if (!membership) { const e = new Error('Membership not found'); e.statusCode = 404; throw e; }
  return membership;
};

export const removeTeamMemberService = async (teamId, userId) => {
  const result = await TeamMembership.findOneAndDelete({ user: userId, team: teamId });
  if (!result) { const e = new Error('Membership not found'); e.statusCode = 404; throw e; }
};

export const getUserTeamsService = async (userId) => {
  const memberships = await TeamMembership.find({ user: userId })
    .populate('team', 'name description isActive')
    .sort({ createdAt: 1 })
    .lean();
  return memberships;
};
