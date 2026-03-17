import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { downloadAllLeavesPDF } from '../../utils/pdfExport.js';
import { fmtBSDate, currentBSYear, bsYearToADRange } from '../../utils/nepaliDate.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = fmtBSDate;

const STATUS_CLS = {
  Pending:  'bg-amber-50  text-amber-700',
  Approved: 'bg-green-50  text-green-700',
  Rejected: 'bg-red-50    text-red-700',
};

// ── Reject Modal ──────────────────────────────────────────────────────────────

const RejectModal = ({ leave, onClose, onRejected }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/leaves/${leave._id}/reject`, { reason });
      onRejected(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to reject'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Reject Leave Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Rejecting <strong>{leave.user?.name}</strong>'s {leave.type} leave ({leave.days} day{leave.days > 1 ? 's' : ''}).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection…"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Rejecting…' : 'Reject'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const LeaveManagementPage = () => {
  const [leaves,     setLeaves]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [status,     setStatus]     = useState('Pending');
  const [bsYear,     setBsYear]     = useState(currentBSYear);
  const [rejectLeave, setRejectLeave] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { startISO, endISO } = bsYearToADRange(bsYear);
      const params = { startFrom: startISO, startTo: endISO };
      if (status !== 'All') params.status = status;
      const { data } = await api.get('/leaves/all', { params });
      setLeaves(data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [bsYear, status]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      const { data } = await api.patch(`/leaves/${id}/approve`);
      setLeaves((prev) => prev.map((l) => l._id === id ? data.data : l));
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to approve');
    }
  };

  const handleRejected = (updated) => {
    setLeaves((prev) => prev.map((l) => l._id === updated._id ? updated : l));
  };

  const pending = leaves.filter((l) => l.status === 'Pending').length;

  return (
    <DashboardLayout title="Leave Management">
      <div className="space-y-5">

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
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
            <label className="text-sm font-medium text-gray-600">Status:</label>
            <div className="flex gap-1">
              {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    status === s
                      ? 'bg-brand-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s}
                  {s === 'Pending' && pending > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pending}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {!loading && leaves.length > 0 && (
            <button
              onClick={() => downloadAllLeavesPDF({ leaves, year: bsYear })}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ↓ Download PDF
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No leave requests found.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Employee</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">From</th>
                  <th className="text-left px-4 py-3">To</th>
                  <th className="text-center px-4 py-3">Days</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Applied On</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{l.user?.name}</div>
                      <div className="text-xs text-gray-400">{l.user?.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.type === 'Sick' ? 'bg-blue-50 text-blue-700' : l.type === 'Casual' ? 'bg-orange-50 text-orange-700' : 'bg-purple-50 text-purple-700'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(l.startDate)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(l.endDate)}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-800">{l.days}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[l.status]}`}>{l.status}</span>
                        {l.status === 'Rejected' && l.rejectionReason && (
                          <div className="text-xs text-red-400 mt-0.5 max-w-xs truncate" title={l.rejectionReason}>{l.rejectionReason}</div>
                        )}
                        {l.status !== 'Pending' && l.approvedBy?.name && (
                          <div className="text-xs text-gray-400 mt-0.5">by {l.approvedBy.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {l.status === 'Pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApprove(l._id)}
                            className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectLeave(l)}
                            className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
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

      {rejectLeave && (
        <RejectModal
          leave={rejectLeave}
          onClose={() => setRejectLeave(null)}
          onRejected={handleRejected}
        />
      )}
    </DashboardLayout>
  );
};

export default LeaveManagementPage;
