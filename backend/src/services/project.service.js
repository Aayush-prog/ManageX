import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../models/Project.js';
import Task    from '../models/Task.js';
import User    from '../models/User.js';
import ProjectBudget  from '../models/ProjectBudget.js';
import ProjectDeposit from '../models/ProjectDeposit.js';
import { sendEmail } from '../utils/email.js';
import * as tpl from '../utils/emailTemplates.js';
import { notify } from '../utils/notify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

const TASK_STATUSES = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done'];

// ── Projects ──────────────────────────────────────────────────────────────────

export const getProjectsService = async (userId, permissionLevel) => {
  const query = ['manager', 'admin'].includes(permissionLevel) ? {} : { members: userId };

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
  await project.populate([
    { path: 'members',   select: 'name email' },
    { path: 'createdBy', select: 'name' },
  ]);

  // Email each member
  if (project.members?.length) {
    for (const member of project.members) {
      if (member.email && member._id.toString() !== userId.toString()) {
        const { subject, html } = tpl.projectAdded({
          memberName:  member.name,
          projectName: project.name,
          description: project.description,
          createdBy:   project.createdBy?.name ?? 'Management',
        });
        sendEmail({ to: member.email, subject, html });
      }
    }
  }

  return project;
};

export const getProjectByIdService = async (projectId, userId, permissionLevel) => {
  const project = await Project.findById(projectId)
    .populate('members',   'name email role')
    .populate('createdBy', 'name')
    .lean();

  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  // Access: managers/admin always; others must be a member
  if (!['manager', 'admin'].includes(permissionLevel)) {
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
  const project = await Project.findById(projectId).populate('createdBy', 'name').lean();
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  const task = await Task.create({ ...data, project: projectId, createdBy: userId });
  const populated = await Task.findById(task._id).populate('assignedTo', 'name email role');

  // Notify + email assigned user (if set and not the creator)
  if (populated.assignedTo && populated.assignedTo._id.toString() !== userId.toString()) {
    const creator = await User.findById(userId).select('name').lean();
    const assignedBy = creator?.name ?? 'Management';

    notify(populated.assignedTo._id, {
      type:    'task_assigned',
      title:   'Task Assigned',
      message: `"${populated.title}" in ${project.name} was assigned to you by ${assignedBy}`,
      link:    `/projects/${project._id}`,
    });

    if (populated.assignedTo.email) {
      const { subject, html } = tpl.taskAssigned({
        assigneeName: populated.assignedTo.name,
        taskTitle:    populated.title,
        projectName:  project.name,
        priority:     populated.priority,
        dueDate:      populated.dueDate ? new Date(populated.dueDate).toISOString().slice(0, 10) : null,
        assignedBy,
      });
      sendEmail({ to: populated.assignedTo.email, subject, html });
    }
  }

  return populated;
};

export const updateTaskService = async (taskId, updates, updatedByUserId) => {
  const ALLOWED = ['title', 'description', 'assignedTo', 'priority', 'dueDate', 'status'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );

  // Capture old assignedTo before update (to detect reassignment)
  const before = await Task.findById(taskId).select('assignedTo').lean();

  const task = await Task.findByIdAndUpdate(taskId, filtered, {
    new: true,
    runValidators: true,
  }).populate(['assignedTo', { path: 'project', select: 'name' }]);

  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  // Notify + email newly assigned user if assignedTo changed
  const newAssignee = task.assignedTo;
  const oldAssigneeId = before?.assignedTo?.toString();
  const newAssigneeId = newAssignee?._id?.toString();
  if (
    filtered.assignedTo &&
    newAssigneeId &&
    newAssigneeId !== oldAssigneeId &&
    newAssigneeId !== updatedByUserId?.toString()
  ) {
    const updater = updatedByUserId ? await User.findById(updatedByUserId).select('name').lean() : null;
    const assignedBy = updater?.name ?? 'Management';
    const projectName = task.project?.name ?? 'a project';

    notify(newAssignee._id, {
      type:    'task_assigned',
      title:   'Task Assigned',
      message: `"${task.title}" in ${projectName} was assigned to you by ${assignedBy}`,
      link:    `/projects/${task.project?._id}`,
    });

    if (newAssignee.email) {
      const { subject, html } = tpl.taskAssigned({
        assigneeName: newAssignee.name,
        taskTitle:    task.title,
        projectName,
        priority:     task.priority,
        dueDate:      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
        assignedBy,
      });
      sendEmail({ to: newAssignee.email, subject, html });
    }
  }

  return task;
};

export const addCommentService = async (taskId, userId, text) => {
  const task = await Task.findByIdAndUpdate(
    taskId,
    { $push: { comments: { user: userId, text } } },
    { new: true }
  )
    .populate('comments.user', 'name')
    .populate({ path: 'project', select: 'name members', populate: { path: 'members', select: 'name email' } });

  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  // Parse @mentions and notify project members
  const mentionMatches = [...text.matchAll(/@([\w ]+?)(?=\s@|\s*$)/g)].map((m) => m[1].trim().toLowerCase());
  if (mentionMatches.length && task.project?.members?.length) {
    const commenter = await User.findById(userId).select('name').lean();
    const commenterName = commenter?.name ?? 'Someone';

    for (const member of task.project.members) {
      if (member._id.toString() === userId.toString()) continue;
      const memberNameLower = member.name?.toLowerCase() ?? '';
      const wasMentioned = mentionMatches.some(
        (m) => memberNameLower === m || memberNameLower.startsWith(m + ' ') || memberNameLower.split(' ')[0] === m
      );
      if (!wasMentioned) continue;

      notify(member._id, {
        type:    'mention',
        title:   'You were mentioned',
        message: `${commenterName} mentioned you in "${task.title}"`,
        link:    `/projects/${task.project._id}`,
      });

      if (member.email) {
        const { subject, html } = tpl.mentionedInComment({
          mentionedName: member.name,
          commenterName,
          taskTitle:     task.title,
          projectName:   task.project.name,
          comment:       text,
        });
        sendEmail({ to: member.email, subject, html });
      }
    }
  }

  return task;
};

export const getMyTasksService = async (userId) =>
  Task.find({ assignedTo: userId })
    .populate('project',       'name status _id')
    .populate('assignedTo',    'name email role')
    .populate('comments.user', 'name')
    .sort({ dueDate: 1 })
    .lean();

export const deleteProjectService = async (projectId) => {
  const project = await Project.findById(projectId).lean();
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  // Collect all attachment file paths before deleting tasks
  const tasks = await Task.find({ project: projectId }).lean();
  const filesToDelete = tasks.flatMap((t) =>
    (t.attachments ?? []).map((a) => {
      // a.url is like "/uploads/filename.ext"
      const filename = a.url.replace(/^\/uploads\//, '');
      return path.join(UPLOADS_DIR, filename);
    })
  );

  // Delete actual files
  for (const filePath of filesToDelete) {
    try { fs.unlinkSync(filePath); } catch { /* file may not exist, ignore */ }
  }

  // Delete all related data
  await Task.deleteMany({ project: projectId });
  await ProjectBudget.deleteMany({ project: projectId }).catch(() => {});
  await ProjectDeposit.deleteMany({ project: projectId }).catch(() => {});
  await Project.findByIdAndDelete(projectId);
};
