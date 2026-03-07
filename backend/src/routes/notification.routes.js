import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Task         from '../models/Task.js';
import Bill         from '../models/Bill.js';
import Leave        from '../models/Leave.js';
import Notification from '../models/Notification.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications
// Returns ALL stored notifications (read or unread) + computed alerts, merged and sorted.
// Stored notifications are never auto-cleared — user must dismiss them explicitly.
router.get('/', async (req, res, next) => {
  try {
    const { id: userId, permissionLevel } = req.user;
    const now = new Date();
    const notifications = [];

    // ── All stored notifications (not just unread) ──────────────────────────
    const stored = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .lean();

    for (const n of stored) {
      notifications.push({
        _id:     n._id,
        stored:  true,
        read:    n.read,
        type:    n.type,
        title:   n.title,
        message: n.message,
        link:    n.link,
        date:    n.createdAt,
      });
    }

    // ── Computed: overdue tasks assigned to this user ───────────────────────
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
        read:    false,
        type:    'overdue_task',
        title:   'Overdue Task',
        message: `"${t.title}" in ${t.project?.name ?? 'a project'} is overdue`,
        link:    `/projects/${t.project?._id}`,
        date:    t.dueDate,
      });
    }

    // ── Computed: pending leave requests — manager and admin only ───────────
    if (['manager', 'admin'].includes(permissionLevel)) {
      const pendingLeaves = await Leave.find({ status: 'Pending' })
        .populate('user', 'name')
        .select('user type days startDate')
        .lean();

      for (const l of pendingLeaves) {
        notifications.push({
          stored:  false,
          read:    false,
          type:    'pending_leave',
          title:   'Leave Request',
          message: `${l.user?.name ?? 'An employee'} requested ${l.days} day(s) of ${l.type} leave`,
          link:    '/leave/manage',
          date:    new Date(l.startDate),
        });
      }
    }

    // ── Computed: overdue bills — finance and admin only ────────────────────
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
          read:    false,
          type:    'overdue_bill',
          title:   'Overdue Bill',
          message: `Bill from "${b.vendorName}" (Rs. ${b.amount.toLocaleString('en-IN')}) is overdue`,
          link:    '/finance/accounting',
          date:    b.dueDate,
        });
      }
    }

    // Sort: unread stored first, then read stored, then computed by date
    notifications.sort((a, b) => {
      if (a.stored !== b.stored) return a.stored ? -1 : 1;
      if (a.stored && b.stored && a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.date) - new Date(a.date);
    });

    const unreadCount = notifications.filter((n) => !n.read).length;
    return res.json({ success: true, data: notifications, unreadCount });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all — mark all stored as read (clears badge)
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    return res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/clear-all — delete all stored notifications for this user
router.delete('/clear-all', async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    return res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id — dismiss a single stored notification
router.delete('/:id', async (req, res, next) => {
  try {
    const n = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
