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

export const getExpensesService = async ({ month, startFrom, startTo, status, projectId } = {}) => {
  const filter = {};
  if (status)    filter.status  = status;
  if (projectId) filter.project = projectId;
  if (startFrom && startTo) {
    filter.date = { $gte: new Date(startFrom), $lte: new Date(startTo + 'T23:59:59') };
  } else if (month) {
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

export const getBudgetsService = async () => {
  const [budgets, expenseAgg, billAgg] = await Promise.all([
    ProjectBudget.find().populate('project', 'name status').sort({ createdAt: -1 }),
    Expense.aggregate([
      { $match: { project: { $exists: true, $ne: null }, status: 'Approved' } },
      { $group: { _id: '$project', total: { $sum: '$amount' } } },
    ]),
    Bill.aggregate([
      { $match: { project: { $exists: true, $ne: null }, status: 'Paid' } },
      { $group: { _id: '$project', total: { $sum: '$amount' } } },
    ]),
  ]);

  const expenseMap = new Map(expenseAgg.map(e => [e._id.toString(), e.total]));
  const billMap    = new Map(billAgg.map(b => [b._id.toString(), b.total]));

  return budgets.map(b => {
    const pid        = b.project?._id?.toString() ?? '';
    const totalSpent = (expenseMap.get(pid) ?? 0) + (billMap.get(pid) ?? 0);
    const obj        = b.toObject();
    obj.totalSpent      = totalSpent;
    obj.remainingBudget = obj.allocatedBudget - totalSpent;
    return obj;
  });
};

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

export const getDepositsService = async ({ month, startFrom, startTo, projectId } = {}) => {
  const filter = {};
  if (projectId) filter.project = projectId;
  if (startFrom && startTo) {
    filter.date = { $gte: new Date(startFrom), $lte: new Date(startTo + 'T23:59:59') };
  } else if (month) {
    const [year, mon] = month.split('-').map(Number);
    filter.date = { $gte: new Date(year, mon - 1, 1), $lt: new Date(year, mon, 1) };
  }
  return ProjectDeposit.find(filter)
    .sort({ date: -1 })
    .populate('createdBy', 'name')
    .populate('project',   'name');
};

export const getProjectFinancialSummaryService = async (projectId) => {
  const [deposits, expenses, bills, budget] = await Promise.all([
    ProjectDeposit.find({ project: projectId }).sort({ date: -1 }).populate('createdBy', 'name').lean(),
    Expense.find({ project: projectId, status: 'Approved' }).sort({ date: -1 }).populate('createdBy', 'name').lean(),
    Bill.find({ project: projectId }).sort({ dueDate: 1 }).populate('createdBy', 'name').lean(),
    ProjectBudget.findOne({ project: projectId }).lean(),
  ]);

  const totalDeposits    = deposits.reduce((s, d) => s + d.amount, 0);
  const totalExpenses    = expenses.reduce((s, e) => s + e.amount, 0);
  const totalBillsPaid   = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
  const totalBillsUnpaid = bills.filter(b => b.status === 'Unpaid').reduce((s, b) => s + b.amount, 0);
  const totalSpent       = totalExpenses + totalBillsPaid;

  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return {
    projectId,
    allocatedBudget: budget?.allocatedBudget ?? 0,
    totalDeposits,
    totalExpenses,
    totalBillsPaid,
    totalBillsUnpaid,
    totalSpent,
    balance: totalDeposits - totalSpent,
    remainingBudget: (budget?.allocatedBudget ?? 0) - totalSpent,
    expensesByCategory: Object.entries(expensesByCategory).map(([cat, total]) => ({ category: cat, total })),
    deposits,
    expenses,
    bills,
  };
};

// ── Summary ───────────────────────────────────────────────────────────────────

export const getSummaryService = async (month, startFrom, startTo) => {
  let from, to;
  if (startFrom && startTo) {
    from = new Date(startFrom);
    to   = new Date(startTo + 'T23:59:59');
  } else {
    const [year, mon] = month.split('-').map(Number);
    from = new Date(year, mon - 1, 1);
    to   = new Date(year, mon,     1);
  }

  const [expenseAgg, payrollAgg, budgets, budgetExpenseAgg, budgetBillAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { status: 'Approved', date: { $gte: from, $lte: to } } },
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
    Expense.aggregate([
      { $match: { project: { $exists: true, $ne: null }, status: 'Approved' } },
      { $group: { _id: '$project', total: { $sum: '$amount' } } },
    ]),
    Bill.aggregate([
      { $match: { project: { $exists: true, $ne: null }, status: 'Paid' } },
      { $group: { _id: '$project', total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalExpenses = expenseAgg.reduce((s, e) => s + e.total, 0);
  const payroll = payrollAgg[0] ?? {
    totalBaseSalary: 0, totalEmployeeSSF: 0, totalEmployerSSF: 0,
    totalSSF: 0, totalNet: 0, count: 0,
  };

  const expMap = new Map(budgetExpenseAgg.map(e => [e._id.toString(), e.total]));
  const billMap = new Map(budgetBillAgg.map(b => [b._id.toString(), b.total]));

  return {
    month,
    totalExpenses,
    expensesByCategory: expenseAgg,
    payroll,
    budgets: budgets.map((b) => {
      const pid        = b.project?._id?.toString() ?? '';
      const totalSpent = (expMap.get(pid) ?? 0) + (billMap.get(pid) ?? 0);
      return {
        projectId:       b.project?._id,
        projectName:     b.project?.name ?? '—',
        projectStatus:   b.project?.status,
        allocatedBudget: b.allocatedBudget,
        totalSpent,
        remainingBudget: b.allocatedBudget - totalSpent,
        pct:             b.allocatedBudget > 0
          ? Math.round((totalSpent / b.allocatedBudget) * 100) : 0,
      };
    }),
  };
};
