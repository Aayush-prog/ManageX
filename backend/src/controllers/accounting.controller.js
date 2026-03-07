import {
  addExpenseService, getExpensesService, updateExpenseStatusService, deleteExpenseService,
  addBillService, getBillsService, markBillPaidService, deleteBillService,
  setBudgetService, getBudgetsService,
  addDepositService, getDepositsService, getProjectFinancialSummaryService, deleteDepositService,
  attachToExpenseService, attachToBillService, attachToDepositService,
  getSummaryService,
} from '../services/accounting.service.js';

const ok  = (res, data, code = 200) => res.status(code).json({ success: true, data });
const err = (res, e,    code = 400) => res.status(code).json({ success: false, message: e.message });

export const addExpense    = async (req, res) => { try { ok(res, await addExpenseService(req.body, req.user.id), 201);                                } catch (e) { err(res, e); } };
export const getExpenses   = async (req, res) => { try { ok(res, await getExpensesService(req.query));                                                 } catch (e) { err(res, e); } };
export const reviewExpense = async (req, res) => { try { ok(res, await updateExpenseStatusService(req.params.id, req.user.id, req.body.action));       } catch (e) { err(res, e); } };
export const deleteExpense = async (req, res) => { try { await deleteExpenseService(req.params.id); res.json({ success: true });                       } catch (e) { err(res, e); } };

export const addBill       = async (req, res) => { try { ok(res, await addBillService(req.body, req.user.id), 201);                                    } catch (e) { err(res, e); } };
export const getBills      = async (req, res) => { try { ok(res, await getBillsService());                                                              } catch (e) { err(res, e); } };
export const payBill       = async (req, res) => { try { ok(res, await markBillPaidService(req.params.id));                                            } catch (e) { err(res, e); } };
export const deleteBill    = async (req, res) => { try { await deleteBillService(req.params.id); res.json({ success: true });                          } catch (e) { err(res, e); } };

export const setBudget     = async (req, res) => { try { ok(res, await setBudgetService(req.body.projectId, req.body.allocatedBudget), 200);            } catch (e) { err(res, e); } };
export const getBudgets    = async (req, res) => { try { ok(res, await getBudgetsService());                                                            } catch (e) { err(res, e); } };

export const getSummary    = async (req, res) => {
  try {
    const { startFrom, startTo } = req.query;
    let month = req.query.month;
    if (!month && startFrom) {
      // Derive AD month from the midpoint of the date range (for payroll matching)
      const mid = new Date(startFrom);
      mid.setDate(mid.getDate() + 15);
      month = mid.toISOString().slice(0, 7);
    }
    month = month ?? new Date().toISOString().slice(0, 7);
    ok(res, await getSummaryService(month, startFrom, startTo));
  } catch (e) { err(res, e); }
};

export const addDeposit            = async (req, res) => { try { ok(res, await addDepositService(req.body, req.user.id), 201);                                  } catch (e) { err(res, e); } };
export const getDeposits           = async (req, res) => { try { ok(res, await getDepositsService(req.query));                                                   } catch (e) { err(res, e); } };
export const deleteDeposit         = async (req, res) => { try { await deleteDepositService(req.params.id); res.json({ success: true });                        } catch (e) { err(res, e); } };
export const getProjectFinancials  = async (req, res) => { try { ok(res, await getProjectFinancialSummaryService(req.params.projectId));                         } catch (e) { err(res, e); } };

const attachHandler = (svc) => async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    ok(res, await svc(req.params.id, `/uploads/${req.file.filename}`));
  } catch (e) { err(res, e); }
};
export const attachExpense = attachHandler(attachToExpenseService);
export const attachBill    = attachHandler(attachToBillService);
export const attachDeposit = attachHandler(attachToDepositService);
