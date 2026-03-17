import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { downloadLeavePDF } from '../../utils/pdfExport.js';
import { fmtBSDate, currentBSYear, bsYearToADRange } from '../../utils/nepaliDate.js';
import BSDatePicker from '../../components/ui/BSDatePicker.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = fmtBSDate;

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_CLS = {
  Pending:  'bg-amber-50  text-amber-700',
  Approved: 'bg-green-50  text-green-700',
  Rejected: 'bg-red-50    text-red-700',
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ── Request Leave Modal ───────────────────────────────────────────────────────

const RequestLeaveModal = ({ onClose, onRequested }) => {
  const [form, setForm]   = useState({ type: 'Casual', startDate: todayISO(), endDate: todayISO(), reason: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const days = (() => {
    const diff = Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86_400_000) + 1;
    return diff > 0 ? diff : 0;
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (days <= 0) { setError('End date must be on or after start date'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/leaves', form);
      onRequested(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to submit leave request'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Request Leave</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Leave Type *</label>
            <div className="flex gap-3 flex-wrap">
              {['Casual', 'Sick', 'Annual'].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set('type', t)} />
                  <span className="text-sm text-gray-700">{t} Leave</span>
                </label>
              ))}
            </div>
            {form.type === 'Annual' && (
              <p className="text-xs text-amber-600 mt-1">Annual leave must be requested at least 7 days in advance.</p>
            )}
            {form.type === 'Casual' && (
              <p className="text-xs text-blue-600 mt-1">Casual leave is for emergencies — no advance notice required.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date *</label>
              <BSDatePicker value={form.startDate} onChange={(iso) => set('startDate', iso)} placeholder="Start date" />
            </div>
            <div>
              <label className={labelCls}>End Date *</label>
              <BSDatePicker value={form.endDate} onChange={(iso) => set('endDate', iso)} placeholder="End date" />
            </div>
          </div>
          {days > 0 && (
            <p className="text-sm text-gray-500">Duration: <strong className="text-gray-800">{days} day{days > 1 ? 's' : ''}</strong></p>
          )}
          <div>
            <label className={labelCls}>Reason</label>
            <textarea className={inputCls} rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Optional reason…" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Quota Card ────────────────────────────────────────────────────────────────

const QuotaCard = ({ label, used, total, color }) => {
  const remaining = total - used;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : color;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${remaining <= 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {remaining} left
        </span>
      </div>
      <div className="flex items-end gap-1 mb-2">
        <p className="text-2xl font-bold text-gray-900">{used}</p>
        <p className="text-sm text-gray-400 mb-0.5">/ {total} days used</p>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const LeavePage = () => {
  const { user } = useAuth();
  const [leaves,   setLeaves]   = useState([]);
  const [quota,    setQuota]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [bsYear,   setBsYear]   = useState(currentBSYear);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { startISO, endISO } = bsYearToADRange(bsYear);
      const { data } = await api.get('/leaves/my', { params: { startFrom: startISO, startTo: endISO } });
      setLeaves(data.data.leaves ?? []);
      setQuota(data.data.quota ?? null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [bsYear]);

  useEffect(() => { load(); }, [load]);

  const handleRequested = (leave) => {
    setLeaves((prev) => [leave, ...prev]);
    // Refresh quota silently without triggering loading state or overwriting the list
    const { startISO, endISO } = bsYearToADRange(bsYear);
    api.get('/leaves/my', { params: { startFrom: startISO, startTo: endISO } })
      .then(({ data }) => setQuota(data.data.quota ?? null))
      .catch(() => {});
  };

  return (
    <DashboardLayout title="My Leave">
      <div className="space-y-6">

        {/* Year selector + action */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Year (BS):</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              value={bsYear}
              onChange={(e) => setBsYear(Number(e.target.value))}
            >
              {[bsYear + 1, bsYear, bsYear - 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {!loading && leaves.length > 0 && (
              <button
                onClick={() => downloadLeavePDF({ leaves, quota, userName: user?.name ?? 'User', year: bsYear })}
                className="text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                ↓ Download PDF
              </button>
            )}
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">+ Request Leave</button>
          </div>
        </div>

        {/* Quota cards */}
        {quota && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuotaCard
              label="Casual Leave"
              used={quota.casual?.used ?? 0}
              total={quota.casual?.total ?? 7}
              color="bg-orange-400"
            />
            <QuotaCard
              label="Sick Leave"
              used={quota.sick.used}
              total={quota.sick.total}
              color="bg-blue-400"
            />
            <QuotaCard
              label="Annual Leave"
              used={quota.annual.used}
              total={quota.annual.total}
              color="bg-brand-500"
            />
          </div>
        )}

        {/* Leave history */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Leave History</h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No leave requests for {bsYear} BS.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">From</th>
                  <th className="text-left px-4 py-3">To</th>
                  <th className="text-center px-4 py-3">Days</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Reviewed By</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.type === 'Sick' ? 'bg-blue-50 text-blue-700' : l.type === 'Casual' ? 'bg-orange-50 text-orange-700' : 'bg-purple-50 text-purple-700'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(l.startDate)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(l.endDate)}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-800">{l.days}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[l.status]}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {l.approvedBy?.name ?? '—'}
                      {l.status === 'Rejected' && l.rejectionReason && (
                        <div className="text-red-500 truncate max-w-xs" title={l.rejectionReason}>{l.rejectionReason}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {showForm && (
        <RequestLeaveModal
          onClose={() => setShowForm(false)}
          onRequested={handleRequested}
        />
      )}
    </DashboardLayout>
  );
};

export default LeavePage;
