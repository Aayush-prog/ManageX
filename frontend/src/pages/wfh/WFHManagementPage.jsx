import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate, currentBSYear, bsYearToADRange } from '../../utils/nepaliDate.js';

const fmtDate = fmtBSDate;

const STATUS_CLS = {
  Pending:  'bg-amber-50  text-amber-700',
  Approved: 'bg-green-50  text-green-700',
  Rejected: 'bg-red-50    text-red-700',
};

// ── Reject Modal ──────────────────────────────────────────────────────────────

const RejectModal = ({ request, onClose, onRejected }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/wfh/${request._id}/reject`, { reason });
      onRejected(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to reject'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Reject WFH Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Rejecting <strong>{request.user?.name}</strong>'s WFH request ({request.days} day{request.days > 1 ? 's' : ''}).
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

const WFHManagementPage = () => {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [status,      setStatus]      = useState('Pending');
  const [bsYear,      setBsYear]      = useState(currentBSYear);
  const [rejectReq,   setRejectReq]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { startISO, endISO } = bsYearToADRange(bsYear);
      const params = { startFrom: startISO, startTo: endISO };
      if (status !== 'All') params.status = status;
      const { data } = await api.get('/wfh/all', { params });
      setRequests(data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [bsYear, status]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      const { data } = await api.patch(`/wfh/${id}/approve`);
      setRequests((prev) => prev.map((r) => r._id === id ? data.data : r));
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to approve');
    }
  };

  const handleRejected = (updated) => {
    setRequests((prev) => prev.map((r) => r._id === updated._id ? updated : r));
  };

  const pending = requests.filter((r) => r.status === 'Pending').length;

  return (
    <DashboardLayout title="WFH Management">
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
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No WFH requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Employee</th>
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
                  {requests.map((r) => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{r.user?.name}</div>
                        <div className="text-xs text-gray-400">{r.user?.role}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.startDate)}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.endDate)}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-800">{r.days}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[r.status]}`}>{r.status}</span>
                          {r.status === 'Rejected' && r.rejectionReason && (
                            <div className="text-xs text-red-400 mt-0.5 max-w-xs truncate" title={r.rejectionReason}>{r.rejectionReason}</div>
                          )}
                          {r.status !== 'Pending' && r.approvedBy?.name && (
                            <div className="text-xs text-gray-400 mt-0.5">by {r.approvedBy.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'Pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(r._id)}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectReq(r)}
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

      {rejectReq && (
        <RejectModal
          request={rejectReq}
          onClose={() => setRejectReq(null)}
          onRejected={handleRejected}
        />
      )}
    </DashboardLayout>
  );
};

export default WFHManagementPage;
