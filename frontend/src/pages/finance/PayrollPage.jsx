import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate, fmtBSMonthYear, curADMonth, adMonthToBSLabel, adYearToBSYear } from '../../utils/nepaliDate.js';

const fmtNPR   = (n = 0) => `Rs. ${Number(n).toLocaleString('en-IN')}`;
const fmtDate  = fmtBSDate;
const fmtMonth = fmtBSMonthYear;
const currentMonthKey = curADMonth;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatusBadge = ({ status }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
    status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
  }`}>{status}</span>
);

// ── Employee Settings Row (inline edit) ──────────────────────────────────────

const EmployeeRow = ({ user: u, onSaved }) => {
  const [editing,  setEditing]  = useState(false);
  const [salary,   setSalary]   = useState(u.monthlySalary);
  const [empPct,   setEmpPct]   = useState(u.ssfEmployeePercent);
  const [emrPct,   setEmrPct]   = useState(u.ssfEmployerPercent);
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.patch(`/users/update-salary/${u._id}`, { monthlySalary: Number(salary) }),
        api.patch(`/users/update-ssf/${u._id}`,    { ssfEmployeePercent: Number(empPct), ssfEmployerPercent: Number(emrPct) }),
      ]);
      onSaved();
      setEditing(false);
    } catch {
      // stay in editing state
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setSalary(u.monthlySalary);
    setEmpPct(u.ssfEmployeePercent);
    setEmrPct(u.ssfEmployerPercent);
    setEditing(false);
  };

  const inputCls = 'w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
      <td className="px-4 py-3 text-gray-500 capitalize">{u.role}</td>
      <td className="px-4 py-3">
        {editing
          ? <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className={inputCls} min="0" />
          : <span className="text-gray-700">{fmtNPR(u.monthlySalary)}</span>}
      </td>
      <td className="px-4 py-3">
        {editing
          ? <input type="number" value={empPct} onChange={(e) => setEmpPct(e.target.value)} className={inputCls} min="0" max="100" step="0.1" />
          : <span className="text-gray-700">{u.ssfEmployeePercent}%</span>}
      </td>
      <td className="px-4 py-3">
        {editing
          ? <input type="number" value={emrPct} onChange={(e) => setEmrPct(e.target.value)} className={inputCls} min="0" max="100" step="0.1" />
          : <span className="text-gray-700">{u.ssfEmployerPercent}%</span>}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="text-xs bg-brand-600 text-white px-3 py-1 rounded-md hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-md hover:bg-gray-200">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
            Edit
          </button>
        )}
      </td>
    </tr>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const PayrollPage = () => {
  const now = new Date();
  const [tab, setTab] = useState('payroll'); // 'payroll' | 'employees'

  // Payroll tab state
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [records,  setRecords]  = useState([]);
  const [payLoading, setPayLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMsg,   setGenMsg]   = useState(null);

  // Employee tab state
  const [users,    setUsers]    = useState([]);
  const [usrLoad,  setUsrLoad]  = useState(false);

  const monthKey = `${selYear}-${String(selMonth).padStart(2, '0')}`;
  const years    = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const fetchPayroll = useCallback(async () => {
    setPayLoading(true);
    try {
      const { data } = await api.get(`/payroll/month/${monthKey}`);
      setRecords(data.data ?? []);
    } catch {
      setRecords([]);
    } finally {
      setPayLoading(false);
    }
  }, [monthKey]);

  const fetchUsers = useCallback(async () => {
    setUsrLoad(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setUsrLoad(false);
    }
  }, []);

  useEffect(() => { if (tab === 'payroll') fetchPayroll(); }, [tab, fetchPayroll]);
  useEffect(() => { if (tab === 'employees') fetchUsers(); }, [tab, fetchUsers]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMsg(null);
    try {
      const { data } = await api.post(`/payroll/generate/${monthKey}`);
      setGenMsg(`Generated ${data.data.created} record(s). Skipped ${data.data.skipped} (already exist).`);
      fetchPayroll();
    } catch (err) {
      setGenMsg(err.response?.data?.message ?? 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.patch(`/payroll/mark-paid/${id}`);
      fetchPayroll();
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to mark as paid.');
    }
  };

  // Summaries
  const totalNet     = records.reduce((s, r) => s + (r.finalPayableSalary ?? 0), 0);
  const totalEmpSSF  = records.reduce((s, r) => s + (r.employeeSSF ?? 0), 0);
  const totalEmrSSF  = records.reduce((s, r) => s + (r.employerSSF ?? 0), 0);
  const pendingCount = records.filter((r) => r.status === 'Pending').length;

  return (
    <DashboardLayout title="Payroll Management" hideClockStatus>
      <div className="space-y-6">

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm w-fit">
          {[['payroll', 'Monthly Payroll'], ['employees', 'Employee Settings']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-5 py-2.5 font-medium transition-colors ${
                tab === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Payroll Tab ──────────────────────────────────────────────────── */}
        {tab === 'payroll' && (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {MONTHS.map((_, i) => <option key={i+1} value={i+1}>{adMonthToBSLabel(selYear, i+1)}</option>)}
              </select>
              <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {years.map((y) => <option key={y} value={y}>{adYearToBSYear(y)} BS</option>)}
              </select>
              <button onClick={handleGenerate} disabled={generating}
                className="btn-primary text-sm disabled:opacity-50">
                {generating ? 'Generating…' : `Generate Payroll — ${fmtMonth(monthKey)}`}
              </button>
            </div>

            {genMsg && (
              <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-4 py-2">
                {genMsg}
              </p>
            )}

            {/* Summary cards */}
            {records.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Net Payable', value: fmtNPR(totalNet),    accent: 'border-green-400' },
                  { label: 'Employee SSF',       value: fmtNPR(totalEmpSSF), accent: 'border-orange-400' },
                  { label: 'Employer SSF',       value: fmtNPR(totalEmrSSF), accent: 'border-blue-400' },
                  { label: 'Pending Payouts',    value: pendingCount,         accent: 'border-yellow-400' },
                ].map(({ label, value, accent }) => (
                  <div key={label} className={`stat-card border-l-4 ${accent}`}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Payroll table */}
            <div className="card overflow-hidden p-0">
              {payLoading ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
              ) : !records.length ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  No payroll for {fmtMonth(monthKey)}. Click "Generate Payroll" to create records.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Name', 'Role', 'Base Salary', 'Emp SSF', 'Emr SSF', 'Net Pay', 'Status', 'Paid On', ''].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {records.map((r) => (
                        <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{r.user?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 capitalize">{r.user?.role ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{fmtNPR(r.baseSalary)}</td>
                          <td className="px-4 py-3 text-orange-600">{fmtNPR(r.employeeSSF)}</td>
                          <td className="px-4 py-3 text-blue-600">{fmtNPR(r.employerSSF)}</td>
                          <td className="px-4 py-3 text-green-600 font-semibold">{fmtNPR(r.finalPayableSalary)}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.paidAt)}</td>
                          <td className="px-4 py-3">
                            {r.status === 'Pending' && (
                              <button
                                onClick={() => handleMarkPaid(r._id)}
                                className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Employees Tab ────────────────────────────────────────────────── */}
        {tab === 'employees' && (
          <div className="card overflow-hidden p-0">
            {usrLoad ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Name', 'Role', 'Monthly Salary', 'Emp SSF %', 'Emr SSF %', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <EmployeeRow key={u._id} user={u} onSaved={fetchUsers} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PayrollPage;
