import Attendance    from '../models/Attendance.js';
import Leave         from '../models/Leave.js';
import Payroll       from '../models/Payroll.js';
import Task          from '../models/Task.js';
import User          from '../models/User.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { getAbsenceCutoffDate } from '../utils/time.js';

const SICK_QUOTA   = 7;
const ANNUAL_QUOTA = 7;

export const getUserReportService = async (userId, { startFrom, startTo }) => {
  const now        = new Date();
  const startMonth = startFrom.slice(0, 7);
  const endMonth   = startTo.slice(0, 7);

  // Run all queries in parallel
  const [user, attRecords, leaveRecords, payrollRecords, tasks, holidayEvents] = await Promise.all([
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
    CalendarEvent
      .find({ type: 'holiday', date: { $gte: new Date(startFrom), $lte: new Date(startTo) } })
      .lean(),
  ]);

  if (!user) throw new Error('User not found');

  // ── Attendance ──────────────────────────────────────────────────────────────
  const holidayDateSet = new Set(
    holidayEvents.map((h) => {
      const d = new Date(h.date);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })
  );

  // Expand approved leaves into individual date strings
  const leaveDateSet = new Set();
  for (const l of leaveRecords) {
    if (!['Approved', 'Pending'].includes(l.status)) continue;
    const cur = new Date(l.startDate);
    const end = new Date(l.endDate);
    while (cur <= end) {
      leaveDateSet.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Count working days (Sun-Fri) excluding holidays.
  // Stops at the absence cutoff (yesterday in Kathmandu before 11 PM, today at/after)
  // so today isn't counted as a missed working day during the morning.
  const workingDays = (() => {
    const cutoff = getAbsenceCutoffDate();
    const effectiveEnd = startTo > cutoff ? cutoff : startTo;
    const cur = new Date(startFrom);
    const end = new Date(effectiveEnd);
    let count = 0;
    while (cur <= end) {
      const ds = cur.toISOString().slice(0, 10);
      if (cur.getDay() !== 6 && !holidayDateSet.has(ds)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  })();

  const totalHours = parseFloat(attRecords.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(2));
  const attSummary = {
    daysPresent:    attRecords.length,
    daysLate:       attRecords.filter((r) => r.isLate).length,
    totalHours,
    avgHoursPerDay: attRecords.length ? parseFloat((totalHours / attRecords.length).toFixed(2)) : 0,
    workingDays,
    daysAbsent:     Math.max(0, workingDays - attRecords.length - leaveDateSet.size),
    daysOnLeave:    leaveDateSet.size,
    holidays:       holidayDateSet.size,
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
