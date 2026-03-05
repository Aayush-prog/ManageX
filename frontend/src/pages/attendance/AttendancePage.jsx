import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import ClockStatus from '../../components/attendance/ClockStatus.jsx';
import MonthlySummary from '../../components/attendance/MonthlySummary.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';
import { fmtBSDateStr, fmtTime, BS_MONTHS, currentBSMonthYear, bsToADYearMonth, currentBSYear } from '../../utils/nepaliDate.js';
import { downloadAttendancePDF, downloadTeamAttendancePDF, downloadUserAttendanceFromTeam } from '../../utils/pdfExport.js';

const AttendancePage = () => {
  const { user } = useAuth();
  const initBS = currentBSMonthYear();

  const [bsYear,  setBsYear]  = useState(initBS.year);
  const [bsMonth, setBsMonth] = useState(initBS.month); // 0-indexed
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
        const { year, month } = bsToADYearMonth(bsYear, bsMonth);
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
  }, [bsYear, bsMonth, view]);

  const curBS  = currentBSYear();
  const bsYears = [curBS, curBS - 1, curBS - 2];

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

          {/* Month picker — BS months Baisakh→Chaitra */}
          <select
            value={bsMonth}
            onChange={(e) => setBsMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {BS_MONTHS.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>

          {/* Year picker — BS years */}
          <select
            value={bsYear}
            onChange={(e) => setBsYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {bsYears.map((y) => (
              <option key={y} value={y}>{y} BS</option>
            ))}
          </select>

          {/* Download PDF */}
          {data && !loading && (
            view === 'me' ? (
              <button
                onClick={() => {
                  const { year, month } = bsToADYearMonth(bsYear, bsMonth);
                  downloadAttendancePDF({
                    records:  data.records ?? [],
                    summary:  data.summary ?? {},
                    userName: user?.name ?? 'User',
                    month:    `${year}-${String(month).padStart(2, '0')}`,
                  });
                }}
                className="ml-auto flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                ↓ Download PDF
              </button>
            ) : (
              <button
                onClick={() => {
                  const monthLabel = `${BS_MONTHS[bsMonth]} ${bsYear}`;
                  downloadTeamAttendancePDF({ records: data ?? [], monthLabel });
                }}
                className="ml-auto flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                ↓ Team Report
              </button>
            )
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
            <TeamAttendanceTable
              records={data}
              monthLabel={`${BS_MONTHS[bsMonth]} ${bsYear}`}
            />
          )
        )}
      </div>
    </DashboardLayout>
  );
};

// ── Team table ────────────────────────────────────────────────────────────────

const fmtDate = fmtBSDateStr;

const LocationBadge = ({ type }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
    type === 'Office' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
  }`}>{type}</span>
);

const StatusBadge = ({ isLate }) => isLate
  ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Late</span>
  : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">On time</span>;

const HoursCell = ({ r }) => r.clockOut
  ? <>{r.totalHours}h</>
  : <span className="text-green-600 font-medium">Active</span>;

const TeamAttendanceTable = ({ records = [], monthLabel = '' }) => {
  const [selectedUser, setSelectedUser] = useState('');

  // Build unique user list for dropdown
  const users = useMemo(() => {
    const seen = new Map();
    for (const r of records) {
      const key = r.user?._id ?? r.user?.name ?? '';
      if (key && !seen.has(key)) seen.set(key, r.user);
    }
    return [...seen.values()];
  }, [records]);

  // Filter records
  const filtered = useMemo(() => {
    if (!selectedUser) return records;
    return records.filter((r) => (r.user?._id ?? r.user?.name) === selectedUser);
  }, [records, selectedUser]);

  // Stats for selected user
  const userStats = useMemo(() => {
    if (!selectedUser) return null;
    const late  = filtered.filter((r) => r.isLate).length;
    const hours = filtered.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(1);
    return { days: filtered.length, late, hours };
  }, [filtered, selectedUser]);

  const selectedUserObj = users.find((u) => (u?._id ?? u?.name) === selectedUser);

  if (!records.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">No team attendance records for this period.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All employees</option>
          {users.map((u) => (
            <option key={u?._id ?? u?.name} value={u?._id ?? u?.name}>
              {u?.name ?? '—'}
            </option>
          ))}
        </select>

        {selectedUser && userStats && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-medium text-gray-700 capitalize">{selectedUserObj?.role}</span>
            <span>{userStats.days} day{userStats.days !== 1 ? 's' : ''}</span>
            {userStats.late > 0 && <span className="text-red-500">{userStats.late} late</span>}
            <span>{userStats.hours}h total</span>
          </div>
        )}

        {selectedUser && (
          <button
            onClick={() => downloadUserAttendanceFromTeam({ records, userName: selectedUserObj?.name ?? '', monthLabel })}
            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ↓ PDF
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {(!selectedUser ? ['Name', 'Role', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status']
                             : ['Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status']
              ).map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                {!selectedUser && (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.user?.role ?? '—'}</td>
                  </>
                )}
                <td className="px-4 py-3 text-gray-600">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockIn)}</td>
                <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockOut)}</td>
                <td className="px-4 py-3 text-gray-600"><HoursCell r={r} /></td>
                <td className="px-4 py-3"><LocationBadge type={r.locationType} /></td>
                <td className="px-4 py-3"><StatusBadge isLate={r.isLate} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendancePage;
