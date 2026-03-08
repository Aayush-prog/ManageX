import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import ClockStatus from '../../components/attendance/ClockStatus.jsx';
import MonthlySummary from '../../components/attendance/MonthlySummary.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';
import { fmtBSDateStr, fmtTime, BS_MONTHS, currentBSMonthYear, currentBSYear, bsMonthToADRange } from '../../utils/nepaliDate.js';
import { downloadAttendancePDF, downloadTeamAttendancePDF, downloadUserAttendanceFromTeam } from '../../utils/pdfExport.js';

const AttendancePage = () => {
  const { user } = useAuth();
  const initBS = currentBSMonthYear();

  const [bsYear,    setBsYear]    = useState(initBS.year);
  const [bsMonth,   setBsMonth]   = useState(initBS.month); // 0-indexed
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [dateRange, setDateRange] = useState({ startISO: '', endISO: '' });

  // Manager/Admin can view team data
  const canViewTeam = ['manager', 'admin'].includes(user?.permissionLevel);
  const [view, setView] = useState('me'); // 'me' | 'team'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setData(null);
      setError(null);
      try {
        const { startISO, endISO } = bsMonthToADRange(bsYear, bsMonth);
        setDateRange({ startISO, endISO });
        const endpoint = view === 'team' ? '/attendance/team' : '/attendance/me';
        const { data: res } = await api.get(endpoint, { params: { start: startISO, end: endISO } });
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
                  const { startISO } = bsMonthToADRange(bsYear, bsMonth);
                  downloadAttendancePDF({
                    records:  data.records ?? [],
                    summary:  data.summary ?? {},
                    userName: user?.name ?? 'User',
                    month:    startISO.slice(0, 7),
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
            <MonthlySummary records={data.records} summary={data.summary} startISO={dateRange.startISO} endISO={dateRange.endISO} />
          ) : (
            <TeamAttendanceTable
              records={Array.isArray(data) ? data : []}
              monthLabel={`${BS_MONTHS[bsMonth]} ${bsYear}`}
              onRecordUpdated={(updated) =>
                setData((prev) =>
                  Array.isArray(prev)
                    ? prev.map((r) => r._id === updated._id ? { ...r, ...updated } : r)
                    : prev
                )
              }
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

// Convert ISO datetime to "HH:MM" for time input
const toTimeInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Combine a date string "YYYY-MM-DD" and time "HH:MM" into ISO string
const combineDatetime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
};

const TeamAttendanceTable = ({ records = [], monthLabel = '', onRecordUpdated }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [editingId,    setEditingId]    = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [saving,       setSaving]       = useState(false);

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
    const late        = filtered.filter((r) => r.isLate).length;
    const hours       = filtered.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(1);
    const lateAbsents = Math.floor(late / 3);
    return { days: filtered.length, late, hours, lateAbsents };
  }, [filtered, selectedUser]);

  const selectedUserObj = users.find((u) => (u?._id ?? u?.name) === selectedUser);

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditForm({
      clockIn:              toTimeInput(r.clockIn),
      clockOut:             toTimeInput(r.clockOut),
      locationType:         r.locationType,
      clockOutLocationType: r.clockOutLocationType ?? r.locationType,
      isLate:               r.isLate,
      date:                 r.date,
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (r) => {
    setSaving(true);
    try {
      const payload = {
        clockIn:              combineDatetime(editForm.date, editForm.clockIn),
        clockOut:             editForm.clockOut ? combineDatetime(editForm.date, editForm.clockOut) : null,
        locationType:         editForm.locationType,
        clockOutLocationType: editForm.clockOut ? editForm.clockOutLocationType : null,
        isLate:               editForm.isLate,
      };
      const { data } = await api.patch(`/attendance/${r._id}`, payload);
      onRecordUpdated(data.data);
      setEditingId(null);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  if (!records.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">No team attendance records for this period.</p>
      </div>
    );
  }

  const cols = !selectedUser
    ? ['Name', 'Role', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status', '']
    : ['Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status', ''];

  return (
    <>
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
              {userStats.lateAbsents > 0 && <span className="text-orange-500">{userStats.lateAbsents} absent from lates</span>}
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
                {cols.map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => {
                const isEditing = editingId === r._id;
                return (
                  <tr key={r._id} className={`transition-colors ${isEditing ? 'bg-brand-50' : 'hover:bg-gray-50'}`}>
                    {!selectedUser && (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-800">{r.user?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{r.user?.role ?? '—'}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-gray-600">{fmtDate(r.date)}</td>

                    {isEditing ? (
                      <>
                        <td className="px-2 py-2">
                          <input type="time" value={editForm.clockIn} onChange={(e) => setEditForm(f => ({ ...f, clockIn: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="time" value={editForm.clockOut} onChange={(e) => setEditForm(f => ({ ...f, clockOut: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                        </td>
                        <td className="px-2 py-2 text-gray-400 text-xs">auto</td>
                        <td className="px-2 py-2">
                          <select value={editForm.locationType} onChange={(e) => setEditForm(f => ({ ...f, locationType: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500">
                            <option value="Office">Office</option>
                            <option value="Remote">Remote</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={editForm.isLate} onChange={(e) => setEditForm(f => ({ ...f, isLate: e.target.checked }))}
                              className="rounded" />
                            Late
                          </label>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveEdit(r)} disabled={saving}
                              className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                              {saving ? '…' : 'Save'}
                            </button>
                            <button onClick={cancelEdit}
                              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockIn)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockOut)}</td>
                        <td className="px-4 py-3 text-gray-600"><HoursCell r={r} /></td>
                        <td className="px-4 py-3"><LocationBadge type={r.locationType} /></td>
                        <td className="px-4 py-3"><StatusBadge isLate={r.isLate} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => startEdit(r)}
                            className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AttendancePage;
