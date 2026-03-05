import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Task         from '../models/Task.js';
import Bill         from '../models/Bill.js';
import Leave        from '../models/Leave.js';
import Notification from '../models/Notification.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications
// Returns stored (unread) notifications + computed alerts merged and sorted
router.get('/', async (req, res, next) => {
  try {
    const { id: userId, permissionLevel } = req.user;
    const now = new Date();
    const notifications = [];

    // ── Stored notifications (task assigned, leave approved/rejected) ──────────
    const stored = await Notification.find({ recipient: userId, read: false })
      .sort({ createdAt: -1 })
      .lean();

    for (const n of stored) {
      notifications.push({
        _id:     n._id,      // needed for mark-read
        stored:  true,
        type:    n.type,
        title:   n.title,
        message: n.message,
        link:    n.link,
        date:    n.createdAt,
      });
    }

    // ── Computed: overdue tasks assigned to this user ──────────────────────────
    const overdueTasks = await Task.find({
      assignedTo: userId,
      status:     { $ne: 'Done' },
      dueDate:    { $lt: now, $ne: null },
    })
      .populate('project', 'name')
      .select('title dueDate project')
      .lean();

    for (const t of overdueTasks) {
      notifications.push({
        stored:  false,
        type:    'overdue_task',
        title:   'Overdue Task',
        message: `"${t.title}" in ${t.project?.name ?? 'a project'} is overdue`,
        link:    `/projects/${t.project?._id}`,
        date:    t.dueDate,
      });
    }

    // ── Computed: pending leave requests — manager and admin only ──────────────
    if (['manager', 'admin'].includes(permissionLevel)) {
      const pendingLeaves = await Leave.find({ status: 'Pending' })
        .populate('user', 'name')
        .select('user type days startDate')
        .lean();

      for (const l of pendingLeaves) {
        notifications.push({
          stored:  false,
          type:    'pending_leave',
          title:   'Leave Request',
          message: `${l.user?.name ?? 'An employee'} requested ${l.days} day(s) of ${l.type} leave`,
          link:    '/leave/manage',
          date:    new Date(l.startDate),
        });
      }
    }

    // ── Computed: overdue bills — finance and admin only ───────────────────────
    if (['finance', 'admin'].includes(permissionLevel)) {
      const overdueBills = await Bill.find({
        status:  'Unpaid',
        dueDate: { $lt: now, $ne: null },
      })
        .select('vendorName amount dueDate')
        .lean();

      for (const b of overdueBills) {
        notifications.push({
          stored:  false,
          type:    'overdue_bill',
          title:   'Overdue Bill',
          message: `Bill from "${b.vendorName}" (Rs. ${b.amount.toLocaleString('en-IN')}) is overdue`,
          link:    '/finance/accounting',
          date:    b.dueDate,
        });
      }
    }

    // Sort: stored first (most recent), then computed by date
    notifications.sort((a, b) => {
      if (a.stored !== b.stored) return a.stored ? -1 : 1;
      return new Date(b.date) - new Date(a.date);
    });

    return res.json({ success: true, data: notifications, count: notifications.length });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
// Mark all stored notifications for this user as read
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    return res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
