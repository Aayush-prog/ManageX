import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate, currentBSYear, bsYearToADRange } from '../../utils/nepaliDate.js';
import BSDatePicker from '../../components/ui/BSDatePicker.jsx';

const fmtDate = fmtBSDate;

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_CLS = {
  Pending:  'bg-amber-50  text-amber-700',
  Approved: 'bg-green-50  text-green-700',
  Rejected: 'bg-red-50    text-red-700',
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ── Request WFH Modal ─────────────────────────────────────────────────────────

const RequestWFHModal = ({ onClose, onRequested }) => {
  const [form, setForm]     = useState({ startDate: todayISO(), endDate: todayISO(), reason: '' });
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
      const { data } = await api.post('/wfh', form);
      onRequested(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to submit WFH request'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Request Work From Home</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
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
            <textarea
              className={inputCls}
              rows={2}
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Optional reason…"
            />
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const WFHPage = () => {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [bsYear,    setBsYear]    = useState(currentBSYear);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { startISO, endISO } = bsYearToADRange(bsYear);
      const { data } = await api.get('/wfh/my', { params: { startFrom: startISO, startTo: endISO } });
      setRequests(data.data.requests ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [bsYear]);

  useEffect(() => { load(); }, [load]);

  const handleRequested = (req) => setRequests((prev) => [req, ...prev]);

  return (
    <DashboardLayout title="Work From Home">
      <div className="space-y-6">

        {/* Header */}
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
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">+ Request WFH</button>
        </div>

        {/* History table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">WFH History</h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No WFH requests for {bsYear} BS.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">From</th>
                    <th className="text-left px-4 py-3">To</th>
                    <th className="text-center px-4 py-3">Days</th>
                    <th className="text-left px-4 py-3">Reason</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Reviewed By</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.startDate)}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.endDate)}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-800">{r.days}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.reason || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {r.approvedBy?.name ?? '—'}
                        {r.status === 'Rejected' && r.rejectionReason && (
                          <div className="text-red-500 truncate max-w-xs" title={r.rejectionReason}>{r.rejectionReason}</div>
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
        <RequestWFHModal
          onClose={() => setShowForm(false)}
          onRequested={handleRequested}
        />
      )}
    </DashboardLayout>
  );
};

export default WFHPage;
