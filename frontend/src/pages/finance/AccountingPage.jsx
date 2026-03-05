import { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate, BS_MONTHS, currentBSMonthYear, bsMonthToADRange } from '../../utils/nepaliDate.js';
import { downloadExpensesPDF, downloadBillsPDF, downloadDepositsPDF } from '../../utils/pdfExport.js';
import BSDatePicker from '../../components/ui/BSDatePicker.jsx';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtNPR   = (n) => `Rs. ${(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate  = fmtBSDate;
const todayISO = () => new Date().toISOString().slice(0, 10);

// Inline BS month/year selector — returns { startISO, endISO } via onChange
const BSMonthYearPicker = ({ value, onChange, className = '' }) => {
  const handleYear  = (e) => onChange({ ...value, year: Number(e.target.value) });
  const handleMonth = (e) => onChange({ ...value, month: Number(e.target.value) });
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={value.month}
        onChange={handleMonth}
      >
        {BS_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <select
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={value.year}
        onChange={handleYear}
      >
        {[value.year + 1, value.year, value.year - 1, value.year - 2].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
};

const CATEGORIES = ['Travel', 'Equipment', 'Software', 'Marketing', 'Operations', 'Other'];
const DEPOSIT_CATEGORIES = ['Client Payment', 'Advance', 'Reimbursement', 'Grant', 'Investment', 'Other'];

const STATUS_BILL = {
  Unpaid: 'bg-red-50   text-red-700',
  Paid:   'bg-green-50 text-green-700',
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url ?? '');

// ── Attachment cell — shows link or upload button ─────────────────────────────

const AttachCell = ({ attachment, uploadUrl, onAttached }) => {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(uploadUrl, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onAttached(data.data);
    } catch { /* ignore */ } finally {
      setUploading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  if (attachment) {
    return (
      <a
        href={`${API_BASE}${attachment}`}
        target="_blank"
        rel="noopener noreferrer"
        title="View attachment"
        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
      >
        {isImage(attachment) ? '🖼' : '📄'} View
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="text-xs text-gray-400 hover:text-brand-600 disabled:opacity-50"
        title="Attach file"
      >
        {uploading ? '…' : '📎'}
      </button>
      <input ref={ref} type="file" className="hidden" onChange={handleFile}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
    </>
  );
};

// ── File picker used inside Add modals ────────────────────────────────────────

const FilePicker = ({ value, onChange }) => (
  <div>
    <label className={labelCls}>Attachment (optional)</label>
    <input
      type="file"
      className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
      onChange={(e) => onChange(e.target.files[0] ?? null)}
    />
    {value && <p className="text-xs text-gray-400 mt-1 truncate">{value.name}</p>}
  </div>
);

// ── Inline Modals ─────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  </div>
);

const AddExpenseModal = ({ projects, onClose, onCreated }) => {
  const [form,   setForm]   = useState({ title: '', amount: '', category: 'Other', project: '', date: todayISO(), notes: '' });
  const [file,   setFile]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) { setError('Title and amount are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, amount: Number(form.amount), project: form.project || undefined };
      const { data } = await api.post('/accounting/expenses', payload);
      let record = data.data;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const { data: ud } = await api.post(`/accounting/expenses/${record._id}/attachment`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        record = ud.data;
      }
      onCreated(record); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to add expense'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add Expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Expense title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount (Rs.) *</label>
            <input type="number" min="0" className={inputCls} value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <BSDatePicker value={form.date} onChange={(iso) => set('date', iso)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Project (optional)</label>
            <select className={inputCls} value={form.project} onChange={(e) => set('project', e.target.value)}>
              <option value="">None</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <FilePicker value={file} onChange={setFile} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Adding…' : 'Add Expense'}</button>
        </div>
      </form>
    </Modal>
  );
};

const AddBillModal = ({ projects, onClose, onCreated }) => {
  const [form,   setForm]   = useState({ vendorName: '', description: '', amount: '', dueDate: '', project: '' });
  const [file,   setFile]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.vendorName.trim() || !form.amount) { setError('Vendor name and amount are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, amount: Number(form.amount), dueDate: form.dueDate || undefined, project: form.project || undefined };
      const { data } = await api.post('/accounting/bills', payload);
      let record = data.data;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const { data: ud } = await api.post(`/accounting/bills/${record._id}/attachment`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        record = ud.data;
      }
      onCreated(record); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to add bill'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add Bill" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Vendor Name *</label>
          <input className={inputCls} value={form.vendorName} onChange={(e) => set('vendorName', e.target.value)} placeholder="Vendor / supplier name" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount (Rs.) *</label>
            <input type="number" min="0" className={inputCls} value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <BSDatePicker value={form.dueDate} onChange={(iso) => set('dueDate', iso)} placeholder="Select due date" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Project (optional)</label>
          <select className={inputCls} value={form.project} onChange={(e) => set('project', e.target.value)}>
            <option value="">None</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <FilePicker value={file} onChange={setFile} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Adding…' : 'Add Bill'}</button>
        </div>
      </form>
    </Modal>
  );
};

const SetBudgetModal = ({ projects, existing, onClose, onSaved }) => {
  const [projectId, setProjectId] = useState('');
  const [amount,    setAmount]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!projectId || !amount) { setError('Project and amount are required'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/accounting/budgets', { projectId, allocatedBudget: Number(amount) });
      onSaved(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to set budget'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Set Project Budget" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Project *</label>
          <select className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Allocated Budget (Rs.) *</label>
          <input type="number" min="0" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save Budget'}</button>
        </div>
      </form>
    </Modal>
  );
};

// ── Tab: Expenses ─────────────────────────────────────────────────────────────

const ExpensesTab = ({ projects }) => {
  const [expenses,  setExpenses]  = useState([]);
  const [bsMonth,   setBsMonth]   = useState(currentBSMonthYear);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const { startISO, endISO } = bsMonthToADRange(bsMonth.year, bsMonth.month);
    api.get('/accounting/expenses', { params: { startFrom: startISO, startTo: endISO } })
      .then(({ data }) => setExpenses(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bsMonth]);

  useEffect(() => { load(); }, [load]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BSMonthYearPicker value={bsMonth} onChange={setBsMonth} />
          <span className="text-sm text-gray-500">Total: <strong>{fmtNPR(total)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <button
              onClick={() => downloadExpensesPDF({ expenses, month: `${BS_MONTHS[bsMonth.month]} ${bsMonth.year}` })}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ↓ PDF
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Expense</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-4 py-6">No expenses found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Added By</th>
                <th className="text-left px-4 py-3">File</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <div>{e.title}</div>
                    {e.notes && <div className="text-xs text-gray-400 truncate max-w-xs">{e.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.category}</td>
                  <td className="px-4 py-3 text-gray-500">{e.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">{fmtNPR(e.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.createdBy?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <AttachCell
                      attachment={e.attachment}
                      uploadUrl={`/accounting/expenses/${e._id}/attachment`}
                      onAttached={(updated) => setExpenses((prev) => prev.map((x) => x._id === e._id ? updated : x))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddExpenseModal
          projects={projects}
          onClose={() => setShowAdd(false)}
          onCreated={(exp) => { setExpenses((prev) => [exp, ...prev]); }}
        />
      )}
    </div>
  );
};

// ── Tab: Bills ────────────────────────────────────────────────────────────────

const BillsTab = ({ projects }) => {
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get('/accounting/bills')
      .then(({ data }) => setBills(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkPaid = async (id) => {
    try {
      const { data } = await api.patch(`/accounting/bills/${id}/paid`);
      setBills((prev) => prev.map((b) => b._id === id ? data.data : b));
    } catch { /* ignore */ }
  };

  const unpaidTotal = bills.filter((b) => b.status === 'Unpaid').reduce((s, b) => s + b.amount, 0);
  const isOverdue   = (b) => b.status === 'Unpaid' && b.dueDate && new Date(b.dueDate) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-sm text-gray-500">Outstanding: <strong className="text-red-600">{fmtNPR(unpaidTotal)}</strong></span>
        <div className="flex items-center gap-2">
          {bills.length > 0 && (
            <button
              onClick={() => downloadBillsPDF({ bills })}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ↓ PDF
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Bill</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
        ) : bills.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-4 py-6">No bills found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">File</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => {
                const overdue = isOverdue(b);
                return (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.vendorName}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{b.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{b.project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">{fmtNPR(b.amount)}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {overdue ? '⚠ ' : ''}{fmtDate(b.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BILL[b.status]}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <AttachCell
                        attachment={b.attachment}
                        uploadUrl={`/accounting/bills/${b._id}/attachment`}
                        onAttached={(updated) => setBills((prev) => prev.map((x) => x._id === b._id ? updated : x))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'Unpaid' ? (
                        <button onClick={() => handleMarkPaid(b._id)}
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{fmtDate(b.paidAt)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddBillModal
          projects={projects}
          onClose={() => setShowAdd(false)}
          onCreated={(bill) => setBills((prev) => [...prev, bill])}
        />
      )}
    </div>
  );
};

// ── Tab: Budgets ──────────────────────────────────────────────────────────────

const BudgetsTab = ({ projects }) => {
  const [budgets,    setBudgets]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showSetBudget, setShowSetBudget] = useState(false);

  useEffect(() => {
    api.get('/accounting/budgets')
      .then(({ data }) => setBudgets(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (updated) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.project?._id === updated.project?._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowSetBudget(true)} className="btn-primary text-sm">+ Set Budget</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
        ) : budgets.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-4 py-6">No budgets set.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-right px-4 py-3">Allocated</th>
                <th className="text-right px-4 py-3">Spent</th>
                <th className="text-right px-4 py-3">Remaining</th>
                <th className="text-left px-4 py-3 w-32">Usage</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const pct      = b.allocatedBudget > 0 ? Math.round((b.totalSpent / b.allocatedBudget) * 100) : 0;
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-brand-500';
                const remaining = b.allocatedBudget - b.totalSpent;
                return (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtNPR(b.allocatedBudget)}</td>
                    <td className="px-4 py-3 text-right text-gray-800 font-medium">{fmtNPR(b.totalSpent)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmtNPR(remaining)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showSetBudget && (
        <SetBudgetModal
          projects={projects}
          existing={budgets}
          onClose={() => setShowSetBudget(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

// ── Tab: Deposits ─────────────────────────────────────────────────────────────

const AddDepositModal = ({ projects, onClose, onCreated }) => {
  const [form,   setForm]   = useState({ project: '', title: '', amount: '', category: 'Client Payment', date: todayISO(), description: '' });
  const [file,   setFile]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.project || !form.title.trim() || !form.amount) { setError('Project, title and amount are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, amount: Number(form.amount) };
      const { data } = await api.post('/accounting/deposits', payload);
      let record = data.data;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const { data: ud } = await api.post(`/accounting/deposits/${record._id}/attachment`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        record = ud.data;
      }
      onCreated(record); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to add deposit'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add Project Deposit" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Project *</label>
          <select className={inputCls} value={form.project} onChange={(e) => set('project', e.target.value)}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Title *</label>
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Deposit title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount (Rs.) *</label>
            <input type="number" min="0" className={inputCls} value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <BSDatePicker value={form.date} onChange={(iso) => set('date', iso)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {DEPOSIT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <FilePicker value={file} onChange={setFile} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Adding…' : 'Add Deposit'}</button>
        </div>
      </form>
    </Modal>
  );
};

const DepositsTab = ({ projects }) => {
  const [deposits, setDeposits] = useState([]);
  const [bsMonth,  setBsMonth]  = useState(currentBSMonthYear);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const { startISO, endISO } = bsMonthToADRange(bsMonth.year, bsMonth.month);
    const params = { startFrom: startISO, startTo: endISO };
    if (selectedProject) params.projectId = selectedProject;
    api.get('/accounting/deposits', { params })
      .then(({ data }) => setDeposits(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bsMonth, selectedProject]);

  useEffect(() => { load(); }, [load]);

  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <BSMonthYearPicker value={bsMonth} onChange={setBsMonth} />
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <span className="text-sm text-gray-500">Total: <strong className="text-green-600">{fmtNPR(totalDeposits)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          {deposits.length > 0 && (
            <button
              onClick={() => downloadDepositsPDF({ deposits, month: `${BS_MONTHS[bsMonth.month]} ${bsMonth.year}` })}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ↓ PDF
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Deposit</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
        ) : deposits.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-4 py-6">No deposits found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">File</th>
                <th className="text-left px-4 py-3">Added By</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(d.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <div>{d.title}</div>
                    {d.description && <div className="text-xs text-gray-400 truncate max-w-xs">{d.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.project?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">{d.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">{fmtNPR(d.amount)}</td>
                  <td className="px-4 py-3">
                    <AttachCell
                      attachment={d.attachment}
                      uploadUrl={`/accounting/deposits/${d._id}/attachment`}
                      onAttached={(updated) => setDeposits((prev) => prev.map((x) => x._id === d._id ? updated : x))}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.createdBy?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddDepositModal
          projects={projects}
          onClose={() => setShowAdd(false)}
          onCreated={(dep) => setDeposits((prev) => [dep, ...prev])}
        />
      )}
    </div>
  );
};

// ── Tab: Summary ──────────────────────────────────────────────────────────────

const SummaryTab = ({ projects }) => {
  const [mode,       setMode]       = useState('month');   // 'month' | 'project'
  const [bsMonth,    setBsMonth]    = useState(currentBSMonthYear);
  const [projectId,  setProjectId]  = useState('');
  const [summary,    setSummary]    = useState(null);
  const [projSummary, setProjSummary] = useState(null);
  const [loading,    setLoading]    = useState(false);

  // Month summary
  useEffect(() => {
    if (mode !== 'month') return;
    setLoading(true);
    const { startISO, endISO } = bsMonthToADRange(bsMonth.year, bsMonth.month);
    api.get('/accounting/summary', { params: { startFrom: startISO, startTo: endISO } })
      .then(({ data }) => setSummary(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bsMonth, mode]);

  // Project summary
  useEffect(() => {
    if (mode !== 'project' || !projectId) return;
    setLoading(true);
    api.get(`/accounting/projects/${projectId}/financials`)
      .then(({ data }) => setProjSummary(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, mode]);

  return (
    <div className="space-y-5">
      {/* Mode toggle + filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {['month', 'project'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                mode === m ? 'bg-brand-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >{m === 'month' ? 'By Month' : 'By Project'}</button>
          ))}
        </div>
        {mode === 'month' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Month:</label>
            <BSMonthYearPicker value={bsMonth} onChange={setBsMonth} />
          </div>
        )}
        {mode === 'project' && (
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {/* ── Month view ── */}
      {!loading && mode === 'month' && summary && (() => {
        const { totalExpenses, expensesByCategory, payroll, budgets } = summary;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{fmtNPR(totalExpenses)}</p>
                <p className="text-xs text-gray-400 mt-1">Approved only</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Payroll (Gross)</p>
                <p className="text-2xl font-bold text-gray-900">{fmtNPR(payroll.totalBaseSalary)}</p>
                <p className="text-xs text-gray-400 mt-1">{payroll.count ?? 0} employees</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Total SSF</p>
                <p className="text-2xl font-bold text-brand-600">{fmtNPR(payroll.totalSSF)}</p>
                <p className="text-xs text-gray-400 mt-1">Employee + Employer</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Net Payable</p>
                <p className="text-2xl font-bold text-green-600">{fmtNPR(payroll.totalNet)}</p>
                <p className="text-xs text-gray-400 mt-1">After employee SSF</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Expenses by Category</h3>
                {expensesByCategory.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No approved expenses this month.</p>
                ) : (
                  <div className="space-y-2">
                    {expensesByCategory.map((c) => {
                      const pct = totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0;
                      return (
                        <div key={c._id}>
                          <div className="flex items-center justify-between text-sm mb-0.5">
                            <span className="text-gray-600">{c._id}</span>
                            <span className="text-gray-800 font-medium">{fmtNPR(c.total)} <span className="text-xs text-gray-400">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Budget Usage</h3>
                {budgets.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No project budgets set.</p>
                ) : (
                  <div className="space-y-2">
                    {budgets.map((b) => {
                      const barColor = b.pct >= 90 ? 'bg-red-500' : b.pct >= 70 ? 'bg-amber-400' : 'bg-green-500';
                      return (
                        <div key={b.projectId}>
                          <div className="flex items-center justify-between text-sm mb-0.5">
                            <span className="text-gray-600 truncate">{b.projectName}</span>
                            <span className="text-gray-400 text-xs flex-shrink-0 ml-2">{fmtNPR(b.totalSpent)} / {fmtNPR(b.allocatedBudget)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Project view ── */}
      {!loading && mode === 'project' && !projectId && (
        <p className="text-sm text-gray-400 italic">Select a project to view its financial summary.</p>
      )}
      {!loading && mode === 'project' && projectId && projSummary && (() => {
        const { allocatedBudget, totalDeposits, totalExpenses, totalBillsPaid, totalBillsUnpaid,
                totalSpent, balance, remainingBudget, expensesByCategory } = projSummary;
        const budgetPct = allocatedBudget > 0 ? Math.round((totalSpent / allocatedBudget) * 100) : 0;
        const budgetBarColor = budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 70 ? 'bg-amber-400' : 'bg-green-500';
        return (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="stat-card">
                <p className="text-sm text-gray-500">Allocated Budget</p>
                <p className="text-2xl font-bold text-gray-900">{fmtNPR(allocatedBudget)}</p>
                <p className="text-xs text-gray-400 mt-1">Total allocated</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Total Deposits</p>
                <p className="text-2xl font-bold text-green-600">{fmtNPR(totalDeposits)}</p>
                <p className="text-xs text-gray-400 mt-1">All client payments</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">{fmtNPR(totalSpent)}</p>
                <p className="text-xs text-gray-400 mt-1">Expenses + paid bills</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Remaining Budget</p>
                <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-brand-600'}`}>{fmtNPR(remainingBudget)}</p>
                <p className="text-xs text-gray-400 mt-1">Allocated − spent</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Net Balance</p>
                <p className={`text-2xl font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtNPR(balance)}</p>
                <p className="text-xs text-gray-400 mt-1">Deposits − spent</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-gray-500">Outstanding Bills</p>
                <p className="text-2xl font-bold text-amber-600">{fmtNPR(totalBillsUnpaid)}</p>
                <p className="text-xs text-gray-400 mt-1">Unpaid bills</p>
              </div>
            </div>

            {/* Budget usage bar */}
            {allocatedBudget > 0 && (
              <div className="card">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Budget Usage</span>
                  <span className="text-gray-500">{fmtNPR(totalSpent)} / {fmtNPR(allocatedBudget)} ({budgetPct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${budgetBarColor} transition-all`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Expenses: {fmtNPR(totalExpenses)}</span>
                  <span>Bills paid: {fmtNPR(totalBillsPaid)}</span>
                </div>
              </div>
            )}

            {/* Expenses by category */}
            {expensesByCategory.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Expenses by Category</h3>
                <div className="space-y-2">
                  {expensesByCategory.map((c) => {
                    const pct = totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0;
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between text-sm mb-0.5">
                          <span className="text-gray-600">{c.category}</span>
                          <span className="text-gray-800 font-medium">{fmtNPR(c.total)} <span className="text-xs text-gray-400">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ['Expenses', 'Deposits', 'Bills', 'Budgets', 'Summary'];

const AccountingPage = () => {
  const [tab,      setTab]      = useState('Expenses');
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data.data ?? [])).catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Accounting" hideClockStatus hideSalaryWidget>
      <div className="space-y-5">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-100 pb-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-white border border-b-white border-gray-100 text-brand-600 -mb-px relative z-10'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'Expenses'  && <ExpensesTab projects={projects} />}
        {tab === 'Deposits'  && <DepositsTab projects={projects} />}
        {tab === 'Bills'     && <BillsTab    projects={projects} />}
        {tab === 'Budgets'   && <BudgetsTab  projects={projects} />}
        {tab === 'Summary'   && <SummaryTab projects={projects} />}
      </div>
    </DashboardLayout>
  );
};

export default AccountingPage;
