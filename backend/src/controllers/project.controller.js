import {
  getProjectsService,
  createProjectService,
  getProjectByIdService,
  updateProjectService,
  createTaskService,
  updateTaskService,
  addCommentService,
  getMyTasksService,
} from '../services/project.service.js';

// ── Projects ──────────────────────────────────────────────────────────────────

export const getProjects = async (req, res, next) => {
  try {
    const projects = await getProjectsService(req.user.id, req.user.permissionLevel);
    return res.json({ success: true, data: projects });
  } catch (err) { next(err); }
};

export const createProject = async (req, res, next) => {
  try {
    const project = await createProjectService(req.body, req.user.id);
    return res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await getProjectByIdService(req.params.id, req.user.id, req.user.permissionLevel);
    return res.json({ success: true, data: project });
  } catch (err) { next(err); }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await updateProjectService(req.params.id, req.body);
    return res.json({ success: true, data: project });
  } catch (err) { next(err); }
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const createTask = async (req, res, next) => {
  try {
    const task = await createTaskService(req.params.projectId, req.body, req.user.id);
    return res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await updateTaskService(req.params.id, req.body);
    return res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    const task = await addCommentService(req.params.id, req.user.id, text.trim());
    return res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await getMyTasksService(req.user.id);
    return res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
};
