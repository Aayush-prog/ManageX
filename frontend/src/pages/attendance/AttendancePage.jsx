import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import ClockStatus from '../../components/attendance/ClockStatus.jsx';
import MonthlySummary from '../../components/attendance/MonthlySummary.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';
import { fmtBSDateStr, adMonthToBSLabel, adYearToBSYear, fmtTime } from '../../utils/nepaliDate.js';
import { downloadAttendancePDF } from '../../utils/pdfExport.js';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const AttendancePage = () => {
  const { user } = useAuth();
  const now = new Date();

  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Manager/Admin can view team data
  const canViewTeam = ['manager', 'admin'].includes(user?.permissionLevel);
  const [view, setView] = useState('me'); // 'me' | 'team'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = view === 'team' ? '/attendance/team' : '/attendance/me';
        const { data: res } = await api.get(endpoint, { params: { year, month } });
        setData(res.data);
      } catch {
        setError('Failed to load attendance data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, month, view]);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <DashboardLayout title="Attendance" hideClockStatus hideSalaryWidget>
      <div className="space-y-6">
        {/* Today's clock status */}
        <ClockStatus />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle (Manager / CEO only) */}
          {canViewTeam && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {['me', 'team'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    view === v
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {v === 'me' ? 'My Attendance' : 'Team Attendance'}
                </button>
              ))}
            </div>
          )}

          {/* Month picker */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {MONTHS.map((_, i) => (
              <option key={i + 1} value={i + 1}>{adMonthToBSLabel(year, i + 1)}</option>
            ))}
          </select>

          {/* Year picker */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{adYearToBSYear(y)} BS</option>
            ))}
          </select>

          {/* Download PDF (my attendance only) */}
          {view === 'me' && data && !loading && (
            <button
              onClick={() => downloadAttendancePDF({
                records:  data.records ?? [],
                summary:  data.summary ?? {},
                userName: user?.name ?? 'User',
                month:    `${year}-${String(month).padStart(2, '0')}`,
              })}
              className="ml-auto flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ↓ Download PDF
            </button>
          )}
        </div>

        {/* Content */}
        {loading && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
          </div>
        )}

        {error && !loading && (
          <div className="card border-red-100">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          view === 'me' ? (
            <MonthlySummary records={data.records} summary={data.summary} />
          ) : (
            /* Team view: flat records list (managers see everyone) */
            <TeamAttendanceTable records={data} />
          )
        )}
      </div>
    </DashboardLayout>
  );
};

// ── Team table (flat list, grouped by user name in display) ──────────────────

const fmtDate = fmtBSDateStr;

const TeamAttendanceTable = ({ records = [] }) => {
  if (!records.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">No team attendance records for this period.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Role', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
                <td className="px-4 py-3 text-gray-600">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockIn)}</td>
                <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockOut)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {r.clockOut ? `${r.totalHours}h` : (
                    <span className="text-green-600 font-medium">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.locationType === 'Office'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}>
                    {r.locationType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.isLate ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Late</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">On time</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendancePage;
