import * as svc from '../services/team.service.js';

export const listTeams = async (req, res, next) => {
  try {
    const teams = await svc.listTeamsService();
    res.json({ success: true, data: teams });
  } catch (err) { next(err); }
};

export const getTeam = async (req, res, next) => {
  try {
    const team = await svc.getTeamService(req.params.id);
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
};

export const createTeam = async (req, res, next) => {
  try {
    const team = await svc.createTeamService({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: team });
  } catch (err) { next(err); }
};

export const updateTeam = async (req, res, next) => {
  try {
    const team = await svc.updateTeamService(req.params.id, req.body);
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
};

export const deleteTeam = async (req, res, next) => {
  try {
    await svc.deleteTeamService(req.params.id);
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) { next(err); }
};

export const getTeamMembers = async (req, res, next) => {
  try {
    const members = await svc.getTeamMembersService(req.params.id);
    res.json({ success: true, data: members });
  } catch (err) { next(err); }
};

export const addTeamMember = async (req, res, next) => {
  try {
    const membership = await svc.addTeamMemberService(req.params.id, req.body);
    res.status(201).json({ success: true, data: membership });
  } catch (err) { next(err); }
};

export const updateTeamMemberRole = async (req, res, next) => {
  try {
    const membership = await svc.updateTeamMemberRoleService(req.params.id, req.params.userId, req.body.role);
    res.json({ success: true, data: membership });
  } catch (err) { next(err); }
};

export const removeTeamMember = async (req, res, next) => {
  try {
    await svc.removeTeamMemberService(req.params.id, req.params.userId);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { next(err); }
};

export const getMyTeams = async (req, res, next) => {
  try {
    const memberships = await svc.getUserTeamsService(req.user.id);
    res.json({ success: true, data: memberships });
  } catch (err) { next(err); }
};
