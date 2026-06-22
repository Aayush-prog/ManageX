import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';
import {
  BS_MONTHS, currentBSMonthYear, currentBSYear,
  bsMonthToADRange, fmtBSDateStr, fmtTime,
  getAbsenceCutoffISO,
} from '../../utils/nepaliDate.js';
import { expandLeaveDates } from './AttendancePage.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const eventToDateStr = (isoOrDate) => {
  const d = new Date(isoOrDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Count working days (Sun-Fri) in a date range, excluding holidays.
// Stops counting at the absence cutoff so today isn't counted as a missed
// working day before 11 PM Kathmandu.
const countWorkingDays = (startISO, endISO, holidayDateSet) => {
  const cutoffISO = getAbsenceCutoffISO();
  const effectiveEnd = endISO > cutoffISO ? cutoffISO : endISO;
  const cur = new Date(startISO);
  const end = new Date(effectiveEnd);
  let count = 0;
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    if (cur.getDay() !== 6 && !holidayDateSet.has(dateStr)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

// Per-user stats given their records, leave dates in period, and working days
// Rule: every 2 late days counts as 1 additional absent day
const computeUserStats = (userRecords, userLeaveDates, workingDays) => {
  const present     = userRecords.length;
  const late        = userRecords.filter((r) => r.isLate).length;
  const leave       = userLeaveDates.size;
  const lateAbsents = Math.floor(late / 2);
  const absent      = Math.max(0, workingDays - present - leave) + lateAbsents;
  const totalHours  = parseFloat(userRecords.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(1));
  return { present, late, lateAbsents, absent, leave, totalHours };
};

// ── Seed / Backfill Modal ─────────────────────────────────────────────────────

const SeedModal = ({ trackFrom, onClose, onSeeded }) => {
  const today = new Date().toISOString().slice(0, 10);
  // Default the upper bound to yesterday so backfill never overwrites today's
  // (still-open) attendance — matches the "no absent before 11 PM" rule.
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const [form,    setForm]    = useState({ startDate: trackFrom || today, endDate: yesterday });
  const [seeding, setSeeding] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSeed = async () => {
    setError('');
    setSeeding(true);
    try {
      const { data } = await api.post('/attendance/seed', form);
      setResult(data.data);
      onSeeded();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Backfill Attendance</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500">
                Creates records for all active users on every past working day. Saturdays: 12 pm–5 pm. Other days: 9 am–5 pm. Holidays and existing records are skipped.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" value={form.endDate} max={yesterday} onChange={(e) => set('endDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSeed} disabled={seeding}
                  className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {seeding ? 'Running…' : 'Backfill'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-2 space-y-1">
                <p className="text-3xl font-bold text-green-600">{result.created}</p>
                <p className="text-sm text-gray-500">records created</p>
                <p className="text-xs text-gray-400">{result.skipped} already existed</p>
              </div>
              <button onClick={onClose}
                className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Mark All Present Today Modal ─────────────────────────────────────────────

const MarkTodayModal = ({ onClose, onMarked }) => {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const handleMark = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/attendance/mark-today');
      setResult(data.data);
      onMarked();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Mark All Present Today</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500">
                Marks all active members as present today: <strong>12:00 pm – 5:00 pm</strong>.
                Members already clocked out are skipped; members clocked in without a clock-out will be clocked out at 5 pm.
              </p>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleMark} disabled={loading}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {loading ? 'Marking…' : 'Confirm'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-2 space-y-2">
                <p className="text-3xl font-bold text-green-600">{result.created + result.updated}</p>
                <p className="text-sm text-gray-500">members marked present</p>
                <div className="flex justify-center gap-4 text-xs text-gray-400">
                  <span>{result.created} created</span>
                  <span>{result.updated} clocked out</span>
                  <span>{result.skipped} skipped</span>
                </div>
              </div>
              <button onClick={onClose}
                className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Add Record Modal ──────────────────────────────────────────────────────────

const AddRecordModal = ({ onClose, onCreated }) => {
  const [users,  setUsers]  = useState([]);
  const [form,   setForm]   = useState({ userId: '', date: '', clockIn: '09:00', clockOut: '17:00', isLate: false });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get('/users').then(({ data }) => setUsers(data.data ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const clockIn  = new Date(`${form.date}T${form.clockIn}:00`).toISOString();
      const clockOut = form.clockOut ? new Date(`${form.date}T${form.clockOut}:00`).toISOString() : null;
      const { data } = await api.post('/attendance', {
        userId: form.userId, date: form.date, clockIn, clockOut, isLate: form.isLate,
      });
      onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Add Attendance Record</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
            <select required value={form.userId} onChange={(e) => set('userId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Select employee…</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.role}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
              <input type="time" required value={form.clockIn} onChange={(e) => set('clockIn', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
              <input type="time" value={form.clockOut} onChange={(e) => set('clockOut', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={form.isLate} onChange={(e) => set('isLate', e.target.checked)} className="rounded" />
            Mark as Late
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit Record Modal ────────────────────────────────────────────────────────

// Format a Date (or ISO string) as "HH:MM" in the user's local timezone for <input type="time">.
const toTimeInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const EditRecordModal = ({ record, userName, onClose, onSaved }) => {
  const [form, setForm] = useState({
    clockIn:  toTimeInput(record.clockIn),
    clockOut: toTimeInput(record.clockOut),
    isLate:   !!record.isLate,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const clockIn  = new Date(`${record.date}T${form.clockIn}:00`).toISOString();
      const clockOut = form.clockOut ? new Date(`${record.date}T${form.clockOut}:00`).toISOString() : null;
      const { data } = await api.patch(`/attendance/${record._id}`, {
        clockIn, clockOut, isLate: form.isLate,
      });
      onSaved(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Edit Attendance</h3>
            <p className="text-xs text-gray-400">{userName} — {fmtBSDateStr(record.date)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
              <input type="time" required value={form.clockIn} onChange={(e) => set('clockIn', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
              <input type="time" value={form.clockOut} onChange={(e) => set('clockOut', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={form.isLate} onChange={(e) => set('isLate', e.target.checked)} className="rounded" />
            Mark as Late
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── User Detail Modal (attendance list for a user in the period) ──────────────

const UserDetailModal = ({ userData, startISO, endISO, holidayDateSet, leaveDateSet, canEdit, onEdited, onClose }) => {
  const { user: u, records } = userData;
  const [editing, setEditing] = useState(null);
  const userLeaveDates = useMemo(() => {
    const s = new Set();
    for (const d of leaveDateSet) s.add(d);
    return s;
  }, [leaveDateSet]);

  const byDate = {};
  for (const r of records) byDate[r.date] = r;

  const cutoffISO = getAbsenceCutoffISO();
  const rows = [];
  const cur  = new Date(startISO);
  const end  = new Date(endISO);
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    if (cur.getDay() !== 6) {
      const record  = byDate[dateStr];
      const isHol   = holidayDateSet.has(dateStr);
      const isLeave = userLeaveDates.has(dateStr);
      const isFuture = dateStr > cutoffISO;
      let status = 'absent';
      if (isFuture) status = 'future';
      else if (isHol) status = 'holiday';
      else if (record) status = record.isLate ? 'late' : 'present';
      else if (isLeave) status = 'leave';
      rows.push({ dateStr, status, record });
    }
    cur.setDate(cur.getDate() + 1);
  }

  const STATUS_BADGE = {
    present: 'bg-green-50 text-green-700',
    late:    'bg-yellow-50 text-yellow-700',
    absent:  'bg-red-50 text-red-600',
    leave:   'bg-orange-50 text-orange-700',
    holiday: 'bg-indigo-50 text-indigo-700',
    future:  'bg-gray-50 text-gray-400',
  };
  const STATUS_LABEL = {
    present: 'On Time', late: 'Late', absent: 'Absent',
    leave: 'On Leave', holiday: 'Holiday', future: '—',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-800">{u.name}</h3>
            <p className="text-xs text-gray-400 capitalize">{u.role}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
                {canEdit && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(({ dateStr, status, record }) => (
                <tr key={dateStr} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{fmtBSDateStr(dateStr)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{record ? fmtTime(record.clockIn) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{record?.clockOut ? fmtTime(record.clockOut) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{record?.totalHours != null ? `${record.totalHours}h` : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      {record && (
                        <button onClick={() => setEditing(record)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                          Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditRecordModal
          record={editing}
          userName={u.name}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setEditing(null); onEdited?.(updated); }}
        />
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const TeamAttendancePage = () => {
  const { isSuperAdmin, user } = useAuth();
  const initBS = currentBSMonthYear();

  const [bsYear,    setBsYear]    = useState(initBS.year);
  const [bsMonth,   setBsMonth]   = useState(initBS.month);
  const [members,   setMembers]   = useState([]);
  const [records,   setRecords]   = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [holidays,  setHolidays]  = useState([]);
  const [trackFrom, setTrackFrom] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [showSeed,      setShowSeed]      = useState(false);
  const [showMarkToday, setShowMarkToday] = useState(false);
  const [detailUser,setDetailUser]= useState(null);
  const [search,    setSearch]    = useState('');
  const [refresh,   setRefresh]   = useState(0);

  const canAddRecord = isSuperAdmin || ['coordinator', 'admin'].includes(user?.permissionLevel);

  const { startISO, endISO } = useMemo(() => bsMonthToADRange(bsYear, bsMonth), [bsYear, bsMonth]);

  const effectiveStart = useMemo(
    () => (trackFrom && trackFrom > startISO ? trackFrom : startISO),
    [trackFrom, startISO],
  );

  useEffect(() => {
    api.get('/attendance/config').then(({ data }) => setTrackFrom(data.trackFrom ?? '')).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/users').then((r) => r.data.data ?? []),
      api.get('/attendance/team', { params: { start: startISO, end: endISO } }).then((r) => r.data.data ?? []),
      api.get('/leaves/all').then((r) => r.data.data ?? []),
      api.get('/calendar', { params: { start: startISO, end: endISO } })
        .then((r) => (r.data.data ?? []).filter((e) => e.type === 'holiday')),
    ])
      .then(([m, att, lv, hols]) => {
        setMembers(m.filter((u) => u.isActive !== false));
        setRecords(att);
        setAllLeaves(lv);
        setHolidays(hols);
      })
      .catch(() => setError('Failed to load team attendance.'))
      .finally(() => setLoading(false));
  }, [startISO, endISO, isSuperAdmin, refresh]);

  const holidayDateSet = useMemo(() => {
    const s = new Set();
    for (const h of holidays) s.add(eventToDateStr(h.date));
    return s;
  }, [holidays]);

  const workingDays = useMemo(
    () => countWorkingDays(effectiveStart, endISO, holidayDateSet),
    [effectiveStart, endISO, holidayDateSet],
  );

  // Group attendance records by userId
  const recordsByUser = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const uid = r.user?._id?.toString() ?? r.user?.toString();
      if (!uid) continue;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid).push(r);
    }
    return map;
  }, [records]);

  // Group approved leaves by userId and expand dates
  const leavesByUser = useMemo(() => {
    const map = new Map();
    for (const l of allLeaves) {
      if (!['Approved', 'Pending'].includes(l.status)) continue;
      const uid = l.user?._id?.toString() ?? l.user?.toString();
      if (!uid) continue;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid).push(l);
    }
    return map;
  }, [allLeaves]);

  // Build per-user stats
  const userRows = useMemo(() => {
    return members.map((m) => {
      const uid          = m._id?.toString();
      const userRecords  = recordsByUser.get(uid) ?? [];
      const userLeaves   = leavesByUser.get(uid)  ?? [];
      const userLeaveDates = expandLeaveDates(userLeaves, effectiveStart, endISO);
      const stats        = computeUserStats(userRecords, userLeaveDates, workingDays);
      return { user: m, records: userRecords, leaveDates: userLeaveDates, ...stats };
    });
  }, [members, recordsByUser, leavesByUser, effectiveStart, endISO, workingDays]);

  const filtered = useMemo(() => {
    if (!search) return userRows;
    const q = search.toLowerCase();
    return userRows.filter((r) =>
      r.user.name?.toLowerCase().includes(q) ||
      r.user.role?.toLowerCase().includes(q)
    );
  }, [userRows, search]);

  // Keep the open detail modal's records in sync after edits/refresh
  useEffect(() => {
    if (!detailUser) return;
    const fresh = userRows.find((r) => r.user._id?.toString() === detailUser.user._id?.toString());
    if (fresh && fresh.records !== detailUser.records) {
      setDetailUser({ user: fresh.user, records: fresh.records });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRows]);

  // Team totals
  const totals = useMemo(() => ({
    present:    userRows.reduce((s, r) => s + r.present, 0),
    late:       userRows.reduce((s, r) => s + r.late, 0),
    absent:     userRows.reduce((s, r) => s + r.absent, 0),
    leave:      userRows.reduce((s, r) => s + r.leave, 0),
    hours:      parseFloat(userRows.reduce((s, r) => s + r.totalHours, 0).toFixed(1)),
    holidays:   holidayDateSet.size,
  }), [userRows, holidayDateSet]);

  const curBS   = currentBSYear();
  const bsYears = [curBS, curBS - 1, curBS - 2];

  const handleRecordAdded = (newRec) => {
    if (!newRec) return;
    setRecords((prev) => [...prev.filter((r) => !(r.user?._id?.toString() === newRec.user?._id?.toString() && r.date === newRec.date)), newRec]);
  };

  return (
    <DashboardLayout title="Team Attendance" hideSalaryWidget>
      <div className="space-y-5">

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={bsMonth} onChange={(e) => setBsMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
            {BS_MONTHS.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
          <select value={bsYear} onChange={(e) => setBsYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
            {bsYears.map((y) => <option key={y} value={y}>{y} BS</option>)}
          </select>

          <input
            placeholder="Search name / role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {canAddRecord && (
            <>
              <button onClick={() => setShowAdd(true)}
                className="px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                + Add Record
              </button>
              <button onClick={() => setShowSeed(true)}
                className="px-3 py-2 text-sm font-medium bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors">
                Backfill
              </button>
              <button onClick={() => setShowMarkToday(true)}
                className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Mark All Present Today
              </button>
            </>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Working Days',  accent: 'border-l-4 border-gray-400',    val: workingDays },
            { label: 'Present Days',  accent: 'border-l-4 border-green-400',   val: totals.present },
            { label: 'Late Days',     accent: 'border-l-4 border-yellow-400',  val: totals.late },
            { label: 'Absent Days',   accent: 'border-l-4 border-red-400',     val: totals.absent },
            { label: 'Leave Days',    accent: 'border-l-4 border-orange-400',  val: totals.leave },
            { label: 'Holidays',      accent: 'border-l-4 border-indigo-400',  val: totals.holidays },
          ].map(({ label, accent, val }) => (
            <div key={label} className={`stat-card ${accent} py-3 px-4`}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{val}</p>
            </div>
          ))}
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

        {!loading && !error && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Employee</th>
                    <th className="text-center px-4 py-3">Present</th>
                    <th className="text-center px-4 py-3">Late<span className="block text-[9px] text-gray-300 font-normal">2=1 absent</span></th>
                    <th className="text-center px-4 py-3">Absent</th>
                    <th className="text-center px-4 py-3">On Leave</th>
                    <th className="text-center px-4 py-3">Hours</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center px-4 py-8 text-sm text-gray-400 italic">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(({ user: u, records: userRecs, leaveDates, present, late, absent, leave, totalHours }) => (
                      <tr key={u._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{u.name}</p>
                              <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-700 text-sm font-semibold">
                            {present}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            late > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {late}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            absent > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {absent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            leave > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {leave}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 font-medium">
                          {totalHours}h
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setDetailUser({ user: u, records: userRecs })}
                            className="text-xs px-2.5 py-1 bg-brand-50 text-brand-600 rounded hover:bg-brand-100 transition-colors font-medium"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Holiday info */}
        {!loading && !error && holidays.length > 0 && (
          <div className="card p-4 border-indigo-100 bg-indigo-50/40">
            <p className="text-xs font-semibold text-indigo-700 mb-2">
              Holidays this month ({holidays.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {holidays.map((h) => (
                <span key={h._id} className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  {fmtBSDateStr(eventToDateStr(h.date))} — {h.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddRecordModal onClose={() => setShowAdd(false)} onCreated={handleRecordAdded} />
      )}

      {showSeed && (
        <SeedModal
          trackFrom={trackFrom}
          onClose={() => setShowSeed(false)}
          onSeeded={() => setRefresh((n) => n + 1)}
        />
      )}

      {showMarkToday && (
        <MarkTodayModal
          onClose={() => setShowMarkToday(false)}
          onMarked={() => setRefresh((n) => n + 1)}
        />
      )}

      {detailUser && (
        <UserDetailModal
          userData={detailUser}
          startISO={effectiveStart}
          endISO={endISO}
          holidayDateSet={holidayDateSet}
          leaveDateSet={leavesByUser.get(detailUser.user._id?.toString()) ? expandLeaveDates(leavesByUser.get(detailUser.user._id?.toString()) ?? [], effectiveStart, endISO) : new Set()}
          canEdit={canAddRecord}
          onEdited={() => setRefresh((n) => n + 1)}
          onClose={() => setDetailUser(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default TeamAttendancePage;
