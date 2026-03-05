import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Task          from '../models/Task.js';
import Bill          from '../models/Bill.js';
import Leave         from '../models/Leave.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications
// Returns overdue tasks (assigned to me) + overdue bills (finance/ceo only)
router.get('/', async (req, res, next) => {
  try {
    const { id: userId, permissionLevel } = req.user;
    const now = new Date();
    const notifications = [];

    // Overdue tasks assigned to this user
    const overdueTasks = await Task.find({
      assignedTo: userId,
      status:     { $ne: 'Done' },
      dueDate:    { $lt: now, $ne: null },
    })
      .populate('project', 'name')
      .select('title dueDate project status')
      .lean();

    for (const t of overdueTasks) {
      notifications.push({
        type:    'overdue_task',
        id:      t._id,
        title:   'Overdue Task',
        message: `"${t.title}" in ${t.project?.name ?? 'a project'} is overdue`,
        link:    `/projects/${t.project?._id}`,
        date:    t.dueDate,
      });
    }

    // Pending leave requests — manager and admin only
    if (['manager', 'admin'].includes(permissionLevel)) {
      const pendingLeaves = await Leave.find({ status: 'Pending' })
        .populate('user', 'name')
        .select('user type days startDate')
        .lean();

      for (const l of pendingLeaves) {
        notifications.push({
          type:    'pending_leave',
          id:      l._id,
          title:   'Leave Request',
          message: `${l.user?.name ?? 'An employee'} requested ${l.days} day(s) of ${l.type} leave`,
          link:    '/leave/manage',
          date:    new Date(l.startDate),
        });
      }
    }

    // Overdue bills — finance and admin only
    if (['finance', 'admin'].includes(permissionLevel)) {
      const overdueBills = await Bill.find({
        status:  'Unpaid',
        dueDate: { $lt: now, $ne: null },
      })
        .select('vendorName amount dueDate')
        .lean();

      for (const b of overdueBills) {
        notifications.push({
          type:    'overdue_bill',
          id:      b._id,
          title:   'Overdue Bill',
          message: `Bill from "${b.vendorName}" (Rs. ${b.amount.toLocaleString('en-IN')}) is overdue`,
          link:    '/finance/accounting',
          date:    b.dueDate,
        });
      }
    }

    // Sort by date descending (most overdue first)
    notifications.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({ success: true, data: notifications, count: notifications.length });
  } catch (err) { next(err); }
});

export default router;
