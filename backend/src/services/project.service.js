import Project from '../models/Project.js';
import Task    from '../models/Task.js';

const TASK_STATUSES = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done'];

// ── Projects ──────────────────────────────────────────────────────────────────

export const getProjectsService = async (userId, role) => {
  const query = ['manager', 'ceo'].includes(role) ? {} : { members: userId };

  const projects = await Project.find(query)
    .populate('members',   'name email role')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Batch-fetch task stats via aggregation (single query)
  const projectIds = projects.map((p) => p._id);
  const stats = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id:   '$project',
        total: { $sum: 1 },
        done:  { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
      },
    },
  ]);

  const statsMap = Object.fromEntries(stats.map((s) => [s._id.toString(), s]));

  return projects.map((p) => {
    const s = statsMap[p._id.toString()] ?? { total: 0, done: 0 };
    return {
      ...p,
      taskCount:            s.total,
      doneCount:            s.done,
      completionPercentage: s.total ? Math.round((s.done / s.total) * 100) : 0,
    };
  });
};

export const createProjectService = async (data, userId) => {
  const project = await Project.create({ ...data, createdBy: userId });
  return project.populate(['members', 'createdBy']);
};

export const getProjectByIdService = async (projectId, userId, role) => {
  const project = await Project.findById(projectId)
    .populate('members',   'name email role')
    .populate('createdBy', 'name')
    .lean();

  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  // Access: managers/CEO always; others must be a member
  if (!['manager', 'ceo'].includes(role)) {
    const isMember = project.members.some((m) => m._id.toString() === userId);
    if (!isMember) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }
  }

  const tasks = await Task.find({ project: projectId })
    .populate('assignedTo',       'name email role')
    .populate('comments.user',    'name')
    .sort({ createdAt: 1 })
    .lean();

  // Group tasks by status column
  const tasksByStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, []]));
  tasks.forEach((t) => { tasksByStatus[t.status]?.push(t); });

  return { ...project, tasksByStatus };
};

export const updateProjectService = async (projectId, data) => {
  const ALLOWED = ['name', 'description', 'startDate', 'endDate', 'status', 'members'];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => ALLOWED.includes(k))
  );
  const project = await Project.findByIdAndUpdate(projectId, filtered, {
    new: true,
    runValidators: true,
  }).populate('members', 'name email role');

  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return project;
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const createTaskService = async (projectId, data, userId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  const task = await Task.create({ ...data, project: projectId, createdBy: userId });
  return Task.findById(task._id).populate('assignedTo', 'name email role');
};

export const updateTaskService = async (taskId, updates) => {
  const ALLOWED = ['title', 'description', 'assignedTo', 'priority', 'dueDate', 'status'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );
  const task = await Task.findByIdAndUpdate(taskId, filtered, {
    new: true,
    runValidators: true,
  }).populate('assignedTo', 'name email role');

  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};

export const addCommentService = async (taskId, userId, text) => {
  const task = await Task.findByIdAndUpdate(
    taskId,
    { $push: { comments: { user: userId, text } } },
    { new: true }
  ).populate('comments.user', 'name');

  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};

export const getMyTasksService = async (userId) =>
  Task.find({ assignedTo: userId })
    .populate('project', 'name status')
    .sort({ dueDate: 1 })
    .lean();
