import Attendance from '../models/Attendance.js';
import Leave      from '../models/Leave.js';
import Payroll    from '../models/Payroll.js';
import Task       from '../models/Task.js';
import User       from '../models/User.js';

const SICK_QUOTA   = 7;
const ANNUAL_QUOTA = 7;

export const getUserReportService = async (userId, { startFrom, startTo }) => {
  const now        = new Date();
  const startMonth = startFrom.slice(0, 7);
  const endMonth   = startTo.slice(0, 7);

  // Run all queries in parallel
  const [user, attRecords, leaveRecords, payrollRecords, tasks] = await Promise.all([
    User.findById(userId).lean(),
    Attendance
      .find({ user: userId, date: { $gte: startFrom, $lte: startTo } })
      .sort({ date: 1 })
      .lean(),
    Leave
      .find({ user: userId, startDate: { $gte: startFrom, $lte: startTo } })
      .sort({ startDate: 1 })
      .lean(),
    Payroll
      .find({ user: userId, month: { $gte: startMonth, $lte: endMonth } })
      .sort({ month: 1 })
      .lean(),
    Task
      .find({ assignedTo: userId })
      .populate('project', 'name')
      .select('title status priority dueDate project updatedAt')
      .lean(),
  ]);

  if (!user) throw new Error('User not found');

  // ── Attendance ──────────────────────────────────────────────────────────────
  const totalHours = parseFloat(attRecords.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(2));
  const attSummary = {
    daysPresent:    attRecords.length,
    daysLate:       attRecords.filter((r) => r.isLate).length,
    totalHours,
    avgHoursPerDay: attRecords.length ? parseFloat((totalHours / attRecords.length).toFixed(2)) : 0,
  };

  // ── Leaves ──────────────────────────────────────────────────────────────────
  const activeLeaves = leaveRecords.filter((r) => ['Approved', 'Pending'].includes(r.status));
  const sickUsed   = activeLeaves.filter((r) => r.type === 'Sick').reduce((s, r) => s + r.days, 0);
  const annualUsed = activeLeaves.filter((r) => r.type === 'Annual').reduce((s, r) => s + r.days, 0);

  // ── Payroll ─────────────────────────────────────────────────────────────────
  const totalPaid    = payrollRecords.filter((r) => r.status === 'Paid')   .reduce((s, r) => s + r.finalPayableSalary, 0);
  const totalPending = payrollRecords.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.finalPayableSalary, 0);

  const taskStats = {
    total:      tasks.length,
    done:       tasks.filter((t) => t.status === 'Done').length,
    inProgress: tasks.filter((t) => t.status === 'InProgress').length,
    review:     tasks.filter((t) => t.status === 'Review').length,
    todo:       tasks.filter((t) => t.status === 'Todo').length,
    backlog:    tasks.filter((t) => t.status === 'Backlog').length,
    overdue:    tasks.filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < now).length,
    list: tasks
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((t) => ({
        title:    t.title,
        status:   t.status,
        priority: t.priority,
        dueDate:  t.dueDate,
        project:  t.project?.name ?? '—',
      })),
  };

  return {
    user: {
      name:            user.name,
      email:           user.email,
      role:            user.role,
      permissionLevel: user.permissionLevel,
      monthlySalary:   user.monthlySalary,
    },
    period: { startFrom, startTo },
    attendance: { records: attRecords, summary: attSummary },
    leaves: {
      records: leaveRecords,
      quota:   { sick: { total: SICK_QUOTA, used: sickUsed }, annual: { total: ANNUAL_QUOTA, used: annualUsed } },
    },
    payroll: { records: payrollRecords, totalPaid, totalPending },
    tasks:   taskStats,
  };
};
