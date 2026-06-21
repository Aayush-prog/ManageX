import { useMemo, useEffect, useState } from 'react';
import { fmtBSDateStr, fmtTime } from '../../utils/nepaliDate.js';
import api from '../../services/api.js';

const fmtDate = fmtBSDateStr;

const SummaryCard = ({ label, value, accent }) => (
  <div className={`stat-card border-l-4 ${accent}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const getWorkingDays = (startISO, endISO) => {
  if (!startISO || !endISO) return [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const end     = new Date(Math.min(new Date(endISO), today));
  const current = new Date(startISO);
  const days    = [];
  while (current <= end) {
    if (current.getDay() !== 6) {
      days.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
};

/**
 * Props:
 *   records        – attendance records array
 *   summary        – { daysPresent, daysLate, totalHours, avgHoursPerDay }
 *   startISO       – range start (YYYY-MM-DD)
 *   endISO         – range end (YYYY-MM-DD)
 *   holidayDates   – Set<string> of "YYYY-MM-DD" holiday dates (optional)
 *   leaveDates     – Set<string> of "YYYY-MM-DD" approved/pending leave dates (optional)
 */
const MonthlySummary = ({
  records    = [],
  summary    = {},
  startISO   = '',
  endISO     = '',
  holidayDates = null,
  leaveDates   = null,
}) => {
  const [trackFrom, setTrackFrom] = useState('');

  useEffect(() => {
    api.get('/attendance/config').then(({ data }) => setTrackFrom(data.trackFrom ?? '')).catch(() => {});
  }, []);

  const normDate = (d) => {
    if (!d) return '';
    if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d;
    const dt = d instanceof Date ? d : new Date(d);
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  };

  const allRows = useMemo(() => {
    const presentDates    = new Set(records.map((r) => normDate(r.date)));
    const effectiveStart  = trackFrom && trackFrom > startISO ? trackFrom : startISO;
    const workingDays     = getWorkingDays(effectiveStart, endISO);

    const rows = records.map((r) => ({ ...r, date: normDate(r.date), _status: r.isLate ? 'late' : 'present' }));

    for (const d of workingDays) {
      if (presentDates.has(d)) continue;
      if (holidayDates?.has(d)) {
        rows.push({ date: d, _status: 'holiday' });
      } else if (leaveDates?.has(d)) {
        rows.push({ date: d, _status: 'leave' });
      } else {
        rows.push({ date: d, _status: 'absent' });
      }
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [records, startISO, endISO, trackFrom, holidayDates, leaveDates]);

  const absentCount  = allRows.filter((r) => r._status === 'absent').length;
  const leaveCount   = allRows.filter((r) => r._status === 'leave').length;
  const holidayCount = allRows.filter((r) => r._status === 'holiday').length;
  const lateCount    = allRows.filter((r) => r._status === 'late').length;
  const lateAbsents  = Math.floor(lateCount / 2);
  const effectiveAbsent = absentCount + lateAbsents;

  if (!allRows.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">No attendance records for this period.</p>
      </div>
    );
  }

  const STATUS_ROW = {
    present: 'hover:bg-gray-50',
    late:    'bg-yellow-50/50 hover:bg-yellow-50',
    absent:  'bg-red-50/60',
    leave:   'bg-orange-50/50',
    holiday: 'bg-indigo-50/50',
  };

  const STATUS_BADGE = {
    present: 'bg-green-50 text-green-600',
    late:    'bg-yellow-50 text-yellow-700',
    absent:  'bg-red-100 text-red-700',
    leave:   'bg-orange-50 text-orange-700',
    holiday: 'bg-indigo-50 text-indigo-700',
  };

  const STATUS_LABEL = {
    present: 'On Time',
    late:    'Late',
    absent:  'Absent',
    leave:   'On Leave',
    holiday: 'Holiday',
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Days Present"    value={summary.daysPresent ?? 0}          accent="border-green-400" />
        <SummaryCard label="Days Late"       value={summary.daysLate ?? 0}             accent="border-yellow-400" />
        <SummaryCard label="Total Hours"     value={`${summary.totalHours ?? 0}h`}     accent="border-blue-400" />
        <SummaryCard label="Avg Hours / Day" value={`${summary.avgHoursPerDay ?? 0}h`} accent="border-purple-400" />
      </div>

      {/* Info banners */}
      <div className="flex flex-wrap gap-3">
        {effectiveAbsent > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            <span className="font-semibold">{effectiveAbsent}</span>
            <span>absent day{effectiveAbsent !== 1 ? 's' : ''}</span>
            {lateAbsents > 0 && <span className="text-red-400 text-xs">(incl. {lateAbsents} from lates)</span>}
          </div>
        )}
        {leaveCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-700">
            <span className="font-semibold">{leaveCount}</span>
            <span>leave day{leaveCount !== 1 ? 's' : ''}</span>
          </div>
        )}
        {holidayCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
            <span className="font-semibold">{holidayCount}</span>
            <span>holiday{holidayCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Records table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRows.map((r) => (
                <tr key={r._id ?? `${r._status}-${r.date}`} className={`transition-colors ${STATUS_ROW[r._status] ?? ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.clockIn ? fmtTime(r.clockIn) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.clockOut ? fmtTime(r.clockOut) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.clockOut && r.totalHours != null
                      ? `${r.totalHours}h`
                      : r.clockIn && !r.clockOut
                        ? <span className="text-green-600 font-medium">Active</span>
                        : '—'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r._status] ?? ''}`}>
                      {STATUS_LABEL[r._status] ?? r._status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummary;
