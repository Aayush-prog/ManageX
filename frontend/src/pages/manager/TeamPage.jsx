import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { BS_MONTHS, currentBSMonthYear, currentBSYear, bsYearToADRange, bsMonthToADRange } from '../../utils/nepaliDate.js';
import { downloadUserReportPDF } from '../../utils/pdfExport.js';

// ── Report Modal ──────────────────────────────────────────────────────────────

const ReportModal = ({ user, onClose }) => {
  const initBS  = currentBSMonthYear();
  const curBS   = currentBSYear();

  const [type,     setType]     = useState('monthly');  // 'monthly' | 'yearly'
  const [bsYear,   setBsYear]   = useState(initBS.year);
  const [bsMonth,  setBsMonth]  = useState(initBS.month);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const bsYears = [curBS, curBS - 1, curBS - 2];

  const periodLabel = type === 'yearly'
    ? `${bsYear} BS`
    : `${BS_MONTHS[bsMonth]} ${bsYear}`;

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const { startISO, endISO } = type === 'yearly'
        ? bsYearToADRange(bsYear)
        : bsMonthToADRange(bsYear, bsMonth);

      const { data } = await api.get(`/reports/user/${user._id}`, {
        params: { startFrom: startISO, startTo: endISO },
      });

      downloadUserReportPDF({ report: data.data, periodLabel });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Generate Report</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period Type</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm w-fit">
              {[['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setType(v)}
                  className={`px-5 py-2 font-medium transition-colors ${
                    type === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year (BS)</label>
            <select
              value={bsYear}
              onChange={(e) => setBsYear(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {bsYears.map((y) => <option key={y} value={y}>{y} BS</option>)}
            </select>
          </div>

          {/* Month (only for monthly) */}
          {type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={bsMonth}
                onChange={(e) => setBsMonth(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {BS_MONTHS.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Report will include attendance, leaves, payroll, and tasks for <strong>{periodLabel}</strong>.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={generate}
              disabled={loading}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {loading ? 'Generating…' : '↓ Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const TeamPage = () => {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [reportUser, setReportUser] = useState(null); // user to generate report for

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Team">
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No team members found.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Salary</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Report</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.role}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">Rs. {(u.monthlySalary ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setReportUser(u)}
                        className="text-xs px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 font-medium transition-colors"
                      >
                        ↓ Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {reportUser && (
        <ReportModal
          user={reportUser}
          onClose={() => setReportUser(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default TeamPage;
