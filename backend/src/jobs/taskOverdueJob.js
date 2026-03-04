import Task from '../models/Task.js';
import { sendEmail } from '../utils/email.js';
import { taskOverdue } from '../utils/emailTemplates.js';

const INTERVAL = 24 * 60 * 60_000; // run once daily

export const startTaskOverdueJob = () => {
  const run = async () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Find all non-Done tasks whose due date has passed, that have an assigned user
      const overdueTasks = await Task.find({
        status:     { $ne: 'Done' },
        dueDate:    { $lt: now },
        assignedTo: { $ne: null },
      })
        .populate('assignedTo', 'name email')
        .populate('project',    'name')
        .lean();

      if (!overdueTasks.length) return;

      // Group by assignee
      const byUser = {};
      for (const t of overdueTasks) {
        const uid = t.assignedTo._id.toString();
        if (!byUser[uid]) {
          byUser[uid] = { user: t.assignedTo, tasks: [] };
        }
        byUser[uid].tasks.push({
          title:   t.title,
          project: t.project?.name ?? '—',
          dueDate: new Date(t.dueDate).toISOString().slice(0, 10),
        });
      }

      for (const { user, tasks } of Object.values(byUser)) {
        if (!user.email) continue;
        const { subject, html } = taskOverdue({ assigneeName: user.name, tasks });
        sendEmail({ to: user.email, subject, html });
      }

      console.log(`[taskOverdueJob] Notified ${Object.keys(byUser).length} user(s) about ${overdueTasks.length} overdue task(s)`);
    } catch (err) {
      console.error('[taskOverdueJob] Error:', err.message);
    }
  };

  // Run at startup then every 24h
  run();
  const interval = setInterval(run, INTERVAL);

  console.log('[taskOverdueJob] Started — runs daily');
  return interval;
};
