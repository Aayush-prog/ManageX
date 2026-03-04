import Expense        from '../models/Expense.js';
import Bill           from '../models/Bill.js';
import ProjectBudget  from '../models/ProjectBudget.js';
import ProjectDeposit from '../models/ProjectDeposit.js';
import Payroll        from '../models/Payroll.js';

// ── Expenses ──────────────────────────────────────────────────────────────────

export const addExpenseService = async (data, userId) => {
  const expense = await Expense.create({ ...data, createdBy: userId });
  return expense.populate([
    { path: 'createdBy', select: 'name' },
    { path: 'project',   select: 'name' },
  ]);
};

export const getExpensesService = async ({ month, status, projectId } = {}) => {
  const filter = {};
  if (status)    filter.status  = status;
  if (projectId) filter.project = projectId;
  if (month) {
    const [year, mon] = month.split('-').map(Number);
    filter.date = { $gte: new Date(year, mon - 1, 1), $lt: new Date(year, mon, 1) };
  }
  return Expense.find(filter)
    .sort({ date: -1 })
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .populate('project',   'name');
};

export const updateExpenseStatusService = async (expenseId, userId, action) => {
  if (!['Approved', 'Rejected'].includes(action)) throw new Error('Invalid action');
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new Error('Expense not found');
  if (expense.status !== 'Pending') throw new Error('Expense already reviewed');

  expense.status     = action;
  expense.approvedBy = userId;
  await expense.save();

  // Update ProjectBudget totalSpent on approval
  if (action === 'Approved' && expense.project) {
    await ProjectBudget.findOneAndUpdate(
      { project: expense.project },
      { $inc: { totalSpent: expense.amount } },
      { upsert: false }
    );
  }

  return expense.populate([
    { path: 'createdBy', select: 'name' },
    { path: 'approvedBy', select: 'name' },
    { path: 'project',   select: 'name' },
  ]);
};

// ── Bills ─────────────────────────────────────────────────────────────────────

export const addBillService = async (data, userId) => {
  const payload = { ...data, createdBy: userId };
  if (!payload.project) delete payload.project;
  const bill = await Bill.create(payload);
  return bill.populate([{ path: 'createdBy', select: 'name' }, { path: 'project', select: 'name' }]);
};

export const getBillsService = async () =>
  Bill.find().sort({ dueDate: 1 })
    .populate('createdBy', 'name')
    .populate('project',   'name');

export const markBillPaidService = async (billId) => {
  const bill = await Bill.findById(billId);
  if (!bill) throw new Error('Bill not found');
  if (bill.status === 'Paid') throw new Error('Bill already paid');
  bill.status = 'Paid';
  bill.paidAt = new Date();
  await bill.save();
  return bill.populate('createdBy', 'name');
};

// ── Budgets ───────────────────────────────────────────────────────────────────

export const setBudgetService = async (projectId, allocatedBudget) =>
  ProjectBudget.findOneAndUpdate(
    { project: projectId },
    { allocatedBudget },
    { upsert: true, new: true }
  ).populate('project', 'name status');

export const getBudgetsService = async () =>
  ProjectBudget.find()
    .populate('project', 'name status')
    .sort({ createdAt: -1 });

// ── Attachments ───────────────────────────────────────────────────────────────

export const attachToExpenseService = async (id, filePath) => {
  const doc = await Expense.findByIdAndUpdate(id, { attachment: filePath }, { new: true })
    .populate('createdBy', 'name').populate('approvedBy', 'name').populate('project', 'name');
  if (!doc) throw new Error('Expense not found');
  return doc;
};

export const attachToBillService = async (id, filePath) => {
  const doc = await Bill.findByIdAndUpdate(id, { attachment: filePath }, { new: true })
    .populate('createdBy', 'name').populate('project', 'name');
  if (!doc) throw new Error('Bill not found');
  return doc;
};

export const attachToDepositService = async (id, filePath) => {
  const doc = await ProjectDeposit.findByIdAndUpdate(id, { attachment: filePath }, { new: true })
    .populate('createdBy', 'name').populate('project', 'name');
  if (!doc) throw new Error('Deposit not found');
  return doc;
};

// ── Project Deposits ──────────────────────────────────────────────────────────

export const addDepositService = async (data, userId) => {
  const deposit = await ProjectDeposit.create({ ...data, createdBy: userId });
  return deposit.populate([
    { path: 'createdBy', select: 'name' },
    { path: 'project',   select: 'name' },
  ]);
};

export const getDepositsService = async ({ month, projectId } = {}) => {
  const filter = {};
  if (projectId) filter.project = projectId;
  if (month) {
    const [year, mon] = month.split('-').map(Number);
    filter.date = { $gte: new Date(year, mon - 1, 1), $lt: new Date(year, mon, 1) };
  }
  return ProjectDeposit.find(filter)
    .sort({ date: -1 })
    .populate('createdBy', 'name')
    .populate('project',   'name');
};

export const getProjectFinancialSummaryService = async (projectId) => {
  const [deposits, expenses] = await Promise.all([
    ProjectDeposit.find({ project: projectId }).lean(),
    Expense.find({ project: projectId, status: 'Approved' }).lean(),
  ]);

  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    projectId,
    totalDeposits,
    totalExpenses,
    balance: totalDeposits - totalExpenses,
    deposits,
    expenses,
  };
};

// ── Summary ───────────────────────────────────────────────────────────────────

export const getSummaryService = async (month) => {
  const [year, mon] = month.split('-').map(Number);
  const from = new Date(year, mon - 1, 1);
  const to   = new Date(year, mon,     1);

  const [expenseAgg, payrollAgg, budgets] = await Promise.all([
    Expense.aggregate([
      { $match: { status: 'Approved', date: { $gte: from, $lt: to } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Payroll.aggregate([
      { $match: { month } },
      { $group: {
        _id:              null,
        totalBaseSalary:  { $sum: '$baseSalary' },
        totalEmployeeSSF: { $sum: '$employeeSSF' },
        totalEmployerSSF: { $sum: '$employerSSF' },
        totalSSF:         { $sum: '$totalSSF' },
        totalNet:         { $sum: '$finalPayableSalary' },
        count:            { $sum: 1 },
      }},
    ]),
    ProjectBudget.find().populate('project', 'name status'),
  ]);

  const totalExpenses = expenseAgg.reduce((s, e) => s + e.total, 0);
  const payroll = payrollAgg[0] ?? {
    totalBaseSalary: 0, totalEmployeeSSF: 0, totalEmployerSSF: 0,
    totalSSF: 0, totalNet: 0, count: 0,
  };

  return {
    month,
    totalExpenses,
    expensesByCategory: expenseAgg,
    payroll,
    budgets: budgets.map((b) => ({
      projectId:       b.project?._id,
      projectName:     b.project?.name ?? '—',
      projectStatus:   b.project?.status,
      allocatedBudget: b.allocatedBudget,
      totalSpent:      b.totalSpent,
      remainingBudget: b.allocatedBudget - b.totalSpent,
      pct:             b.allocatedBudget > 0
        ? Math.round((b.totalSpent / b.allocatedBudget) * 100) : 0,
    })),
  };
};
