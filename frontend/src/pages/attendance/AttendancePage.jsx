import { useEffect, useState, useMemo } from 'react';
import NepaliDate from 'nepali-date-converter';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import MonthlySummary from '../../components/attendance/MonthlySummary.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';
import {
  BS_MONTHS, currentBSMonthYear, currentBSYear,
  bsMonthToADRange, fmtTime, fmtBSDateStr,
  getAbsenceCutoffISO,
} from '../../utils/nepaliDate.js';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  present:   { label: 'On Time',   bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700',  dot: 'bg-green-500'  },
  late:      { label: 'Late',      bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  absent:    { label: 'Absent',    bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-700',    dot: 'bg-red-500'    },
  leave:     { label: 'On Leave',  bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-400' },
  holiday:   { label: 'Holiday',   bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  excursion: { label: 'Excursion', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500'  },
  future:    { label: '',          bg: 'bg-white',      border: 'border-gray-100',   text: 'text-gray-200',   dot: 'bg-gray-200'   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getBSDay = (adDateStr) => {
  try { return new NepaliDate(new Date(adDateStr + 'T00:00:00')).getDate(); }
  catch { return ''; }
};

// Calendar event date (stored as UTC midnight Date) → "YYYY-MM-DD"
const eventToDateStr = (isoOrDate) => {
  const d = new Date(isoOrDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Expand leave records into a Set of "YYYY-MM-DD" strings for a given range
export const expandLeaveDates = (leaves, startISO, endISO) => {
  const set = new Set();
  for (const l of leaves) {
    if (!['Approved', 'Pending'].includes(l.status)) continue;
    const cur  = new Date(Math.max(new Date(l.startDate), new Date(startISO)));
    const lEnd = new Date(Math.min(new Date(l.endDate),   new Date(endISO)));
    while (cur <= lEnd) {
      set.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return set;
};

// Coerce a Date / ISO string / "YYYY-MM-DD" into "YYYY-MM-DD".
// Gate devices sometimes write `date` as a real Date instead of a string;
// without this, recordMap lookups miss those days and they render as Absent.
const normalizeRecordDate = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
};

// Build a Map<dateStr, { status, record, bsDay }> for every day in the range
export const buildDayMap = (records, leaveDateSet, holidayDateSet, startISO, endISO) => {
  // Anything past this ISO date is treated as "future" — keeps today out of
  // absent status until 11 PM Kathmandu, when the day is considered closed.
  const cutoffISO = getAbsenceCutoffISO();

  const recordMap = {};
  for (const r of records) {
    const key = normalizeRecordDate(r.date);
    if (key) recordMap[key] = r;
  }

  const map  = {};
  const cur  = new Date(startISO);
  const end  = new Date(endISO);

  while (cur <= end) {
    const dateStr    = cur.toISOString().slice(0, 10);
    const isSaturday = cur.getDay() === 6;
    const isFuture   = dateStr > cutoffISO;
    const record     = recordMap[dateStr];

    let status;
    if (isFuture) {
      status = 'future';
    } else if (record) {
      status = record.excursion ? 'excursion' : (record.isLate ? 'late' : 'present');
    } else if (holidayDateSet.has(dateStr)) {
      status = 'holiday';
    } else if (leaveDateSet.has(dateStr)) {
      status = 'leave';
    } else {
      status = 'absent';
    }

    map[dateStr] = { dateStr, status, record, bsDay: getBSDay(dateStr), isSaturday, isFuture };
    cur.setDate(cur.getDate() + 1);
  }

  return map;
};

// ── Day Cell ──────────────────────────────────────────────────────────────────

const todayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const DayCell = ({ info, selected, onClick }) => {
  if (!info) return <div />;
  const s = STATUS[info.status] || STATUS.future;
  const isInteractive = info.status !== 'future';
  const isToday = info.dateStr === todayDateStr();
  const rec = info.record;
  return (
    <button
      onClick={() => isInteractive && onClick(info)}
      disabled={!isInteractive}
      className={`
        relative w-full aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5
        text-xs font-medium transition-all px-1
        ${s.bg} ${s.border} ${s.text}
        ${isInteractive ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'}
        ${selected?.dateStr === info.dateStr ? 'ring-2 ring-brand-500 ring-offset-1' : ''}
        ${isToday && selected?.dateStr !== info.dateStr ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
      `}
    >
      <span className="text-sm font-bold leading-none">{info.bsDay}</span>
      <span className="text-[9px] opacity-70 leading-none hidden sm:block">{s.label}</span>
      {rec && (
        <span className="text-[9px] leading-tight opacity-80 hidden sm:block tabular-nums">
          {fmtTime(rec.clockIn)}
          {rec.clockOut ? `–${fmtTime(rec.clockOut)}` : ''}
        </span>
      )}
    </button>
  );
};

// ── Month Calendar Grid ───────────────────────────────────────────────────────

const MonthCalendar = ({ dayMap, startISO, endISO, selected, onDayClick }) => {
  const days = useMemo(() => {
    const result = [];
    const cur = new Date(startISO);
    const end = new Date(endISO);
    while (cur <= end) {
      const d = cur.toISOString().slice(0, 10);
      result.push(dayMap[d] ?? null);
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [dayMap, startISO, endISO]);

  const firstDayOffset = new Date(startISO).getDay();
  const cells = [...Array(firstDayOffset).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((h) => (
          <div key={h} className="text-center text-xs font-semibold text-gray-400 py-1">{h}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, di) =>
            day
              ? <DayCell key={day.dateStr} info={day} selected={selected} onClick={onDayClick} />
              : <div key={`blank-${wi}-${di}`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ── Day Detail Side Panel ─────────────────────────────────────────────────────

const DayDetail = ({ info, onClose }) => {
  const s = STATUS[info.status] || STATUS.off;
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-800">{fmtBSDateStr(info.dateStr)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{info.dateStr}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium border ${s.bg} ${s.text} ${s.border}`}>
        {s.label}
      </span>

      {info.record && (
        <div className="space-y-2 text-sm pt-1 border-t border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">Clock In</span>
            <span className="font-medium text-gray-800">{fmtTime(info.record.clockIn)}</span>
          </div>
          {info.record.clockOut ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Clock Out</span>
              <span className="font-medium text-gray-800">{fmtTime(info.record.clockOut)}</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-500">Clock Out</span>
              <span className="text-green-600 font-medium text-xs">Still clocked in</span>
            </div>
          )}
          {info.record.totalHours != null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Hours</span>
              <span className="font-medium text-gray-800">{info.record.totalHours}h</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Add Attendance Modal ──────────────────────────────────────────────────────

const AddAttendanceModal = ({ onClose, onCreated, canAddForOthers, defaultDate = '' }) => {
  const [users,  setUsers]  = useState([]);
  const [form,   setForm]   = useState({ userId: '', date: defaultDate, clockIn: '09:00', clockOut: '17:00', isLate: false });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (canAddForOthers) {
      api.get('/users').then(({ data }) => setUsers(data.data ?? [])).catch(() => {});
    }
  }, [canAddForOthers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const clockIn  = new Date(`${form.date}T${form.clockIn}:00`).toISOString();
      const clockOut = form.clockOut ? new Date(`${form.date}T${form.clockOut}:00`).toISOString() : null;
      const { data } = canAddForOthers
        ? await api.post('/attendance', { userId: form.userId, date: form.date, clockIn, clockOut, isLate: form.isLate })
        : await api.post('/attendance/self', { date: form.date, clockIn, clockOut, isLate: form.isLate });
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
          <h3 className="font-semibold text-gray-800">
            {canAddForOthers ? 'Add Attendance Record' : 'Add My Attendance'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {canAddForOthers && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
              <select
                required value={form.userId} onChange={(e) => set('userId', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select employee…</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.role}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date" required value={form.date} onChange={(e) => set('date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
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
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const AttendancePage = () => {
  const { user, isSuperAdmin } = useAuth();
  const initBS = currentBSMonthYear();

  const [bsYear,   setBsYear]   = useState(initBS.year);
  const [bsMonth,  setBsMonth]  = useState(initBS.month);
  const [records,  setRecords]  = useState([]);
  const [leaves,   setLeaves]   = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [trackFrom,setTrackFrom]= useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [viewMode, setViewMode] = useState('calendar');

  const canAddForOthers = isSuperAdmin || ['coordinator', 'admin'].includes(user?.permissionLevel);

  const { startISO, endISO } = useMemo(() => bsMonthToADRange(bsYear, bsMonth), [bsYear, bsMonth]);

  useEffect(() => {
    api.get('/attendance/config').then(({ data }) => setTrackFrom(data.trackFrom ?? '')).catch(() => {});
  }, []);

  const fetchAttendance = (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    return Promise.all([
      api.get('/attendance/me', { params: { start: startISO, end: endISO } })
        .then((r) => r.data.data?.records ?? []),
      api.get('/leaves/my')
        .then((r) => r.data.data?.leaves ?? []),
      api.get('/calendar', { params: { start: startISO, end: endISO } })
        .then((r) => (r.data.data ?? []).filter((e) => e.type === 'holiday')),
    ])
      .then(([att, lvs, hols]) => { setRecords(att); setLeaves(lvs); setHolidays(hols); })
      .catch(() => setError('Failed to load attendance data.'))
      .finally(() => { if (showLoading) setLoading(false); });
  };

  useEffect(() => {
    setSelected(null);
    fetchAttendance(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startISO, endISO]);

  // Refresh when the tab regains focus or becomes visible — catches recent gate scans
  useEffect(() => {
    const onFocus = () => fetchAttendance(false);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAttendance(false); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startISO, endISO]);

  // Refresh when a clock-in / clock-out push notification arrives via the service worker
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const onMessage = (e) => {
      if (e.data?.type === 'ATTENDANCE_UPDATED') fetchAttendance(false);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startISO, endISO]);

  const holidayDateSet = useMemo(() => {
    const s = new Set();
    for (const h of holidays) s.add(eventToDateStr(h.date));
    return s;
  }, [holidays]);

  const leaveDateSet = useMemo(
    () => expandLeaveDates(leaves, startISO, endISO),
    [leaves, startISO, endISO],
  );

  const effectiveStart = useMemo(
    () => (trackFrom && trackFrom > startISO ? trackFrom : startISO),
    [trackFrom, startISO],
  );

  const dayMap = useMemo(
    () => buildDayMap(records, leaveDateSet, holidayDateSet, effectiveStart, endISO),
    [records, leaveDateSet, holidayDateSet, effectiveStart, endISO],
  );

  const summary = useMemo(() => {
    // Exclude Saturdays (weekly off) from all counts
    const vals        = Object.values(dayMap).filter((d) => !d.isSaturday);
    const totalHours  = records.reduce((s, r) => s + (r.totalHours ?? 0), 0);
    const late        = vals.filter((d) => d.status === 'late').length;
    const lateAbsents = Math.floor(late / 2);
    return {
      present:    vals.filter((d) => d.status === 'present').length,
      late,
      lateAbsents,
      absent:     vals.filter((d) => d.status === 'absent').length + lateAbsents,
      leave:      vals.filter((d) => d.status === 'leave').length,
      holiday:    vals.filter((d) => d.status === 'holiday').length,
      totalHours: parseFloat(totalHours.toFixed(1)),
    };
  }, [dayMap, records]);

  const curBS   = currentBSYear();
  const bsYears = [curBS, curBS - 1, curBS - 2];

  const handleRecordAdded = (newRec) => {
    if (!newRec?.date) return;
    setRecords((prev) => [...prev.filter((r) => r.date !== newRec.date), newRec]);
  };

  return (
    <DashboardLayout title="My Attendance" hideSalaryWidget>
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

          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[['calendar', 'Calendar'], ['list', 'List']].map(([v, label]) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-2 font-medium transition-colors ${
                  viewMode === v ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setShowAdd(true)}
            className="px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
            + Add Attendance
          </button>

          <button onClick={() => fetchAttendance(true)} disabled={loading}
            className="px-3 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'On Time',   accent: 'border-l-4 border-green-400',  val: summary.present, sub: null },
            { label: 'Late',      accent: 'border-l-4 border-yellow-400', val: summary.late,    sub: summary.lateAbsents > 0 ? `+${summary.lateAbsents} absent` : null },
            { label: 'Absent',    accent: 'border-l-4 border-red-400',    val: summary.absent,  sub: summary.lateAbsents > 0 ? `incl. ${summary.lateAbsents} from lates` : null },
            { label: 'On Leave',  accent: 'border-l-4 border-orange-400', val: summary.leave,   sub: null },
            { label: 'Holidays',  accent: 'border-l-4 border-indigo-400', val: summary.holiday, sub: null },
            { label: 'Total Hrs', accent: 'border-l-4 border-blue-400',   val: `${summary.totalHours}h`, sub: null },
          ].map(({ label, accent, val, sub }) => (
            <div key={label} className={`stat-card ${accent} py-3 px-4`}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{val}</p>
              {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {Object.entries(STATUS).filter(([k]) => k !== 'future').map(([k, s]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
              {s.label}
            </span>
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
          viewMode === 'calendar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className={selected ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <div className="card p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">
                    {BS_MONTHS[bsMonth]} {bsYear} BS
                  </p>
                  <MonthCalendar
                    dayMap={dayMap}
                    startISO={effectiveStart}
                    endISO={endISO}
                    selected={selected}
                    onDayClick={setSelected}
                  />
                </div>
              </div>
              {selected && (
                <div>
                  <DayDetail info={selected} onClose={() => setSelected(null)} />
                </div>
              )}
            </div>
          ) : (
            <MonthlySummary
              records={records}
              summary={{
                daysPresent:    summary.present + summary.late,
                daysLate:       summary.late,
                totalHours:     summary.totalHours,
                avgHoursPerDay: records.length ? parseFloat((summary.totalHours / records.length).toFixed(2)) : 0,
              }}
              startISO={effectiveStart}
              endISO={endISO}
              holidayDates={holidayDateSet}
              leaveDates={leaveDateSet}
            />
          )
        )}
      </div>

      {showAdd && (
        <AddAttendanceModal
          onClose={() => setShowAdd(false)}
          onCreated={handleRecordAdded}
          canAddForOthers={canAddForOthers}
        />
      )}
    </DashboardLayout>
  );
};

export default AttendancePage;
