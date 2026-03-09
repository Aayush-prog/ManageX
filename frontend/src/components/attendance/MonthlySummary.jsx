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

/**
 * Returns all working days (Sun–Fri; Sat = Nepal weekly off) between
 * startISO and endISO, capped at today so future days aren't shown as absent.
 */
const getWorkingDays = (startISO, endISO) => {
  if (!startISO || !endISO) return [];
  const today   = new Date();
  today.setHours(23, 59, 59, 999);
  const end     = new Date(Math.min(new Date(endISO), today));
  const current = new Date(startISO);
  const days    = [];
  while (current <= end) {
    if (current.getDay() !== 6) { // skip Saturday
      days.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
};

const MonthlySummary = ({ records = [], summary = {}, startISO = '', endISO = '' }) => {
  const [trackFrom, setTrackFrom] = useState('');

  useEffect(() => {
    api.get('/attendance/config').then(({ data }) => setTrackFrom(data.trackFrom)).catch(() => {});
  }, []);

  // Merge present records + absent days, sorted newest first
  const allRows = useMemo(() => {
    const presentDates = new Set(records.map((r) => r.date));
    // Cap startISO at trackFrom so days before go-live don't show as absent
    const effectiveStart = trackFrom && trackFrom > startISO ? trackFrom : startISO;
    const workingDays  = getWorkingDays(effectiveStart, endISO);
    const absentRows   = workingDays
      .filter((d) => !presentDates.has(d))
      .map((d) => ({ date: d, _absent: true }));

    return [...records.map((r) => ({ ...r, _absent: false })), ...absentRows]
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, startISO, endISO, trackFrom]);

  const absentCount = allRows.filter((r) => r._absent).length;

  if (!allRows.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">No attendance records for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Days Present"         value={summary.daysPresent ?? 0}           accent="border-green-400" />
        <SummaryCard label="Days Late"            value={summary.daysLate ?? 0}              accent="border-red-400" />
        <SummaryCard label="Absents (from lates)" value={summary.lateAbsents ?? 0}           accent="border-orange-400" />
        <SummaryCard label="Total Hours"          value={`${summary.totalHours ?? 0}h`}      accent="border-blue-400" />
        <SummaryCard label="Avg Hours / Day"      value={`${summary.avgHoursPerDay ?? 0}h`}  accent="border-purple-400" />
      </div>

      {/* Absent count banner */}
      {absentCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <span className="font-semibold">{absentCount}</span>
          <span>absent day{absentCount !== 1 ? 's' : ''} this period</span>
          {(summary.lateAbsents ?? 0) > 0 && (
            <span className="ml-2 text-orange-600">
              · {summary.lateAbsents} from accumulated lates (every 3 lates = 1 absent)
            </span>
          )}
        </div>
      )}

      {/* Records table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRows.map((r) =>
                r._absent ? (
                  <tr key={`absent-${r.date}`} className="bg-red-50/60">
                    <td className="px-4 py-3 font-medium text-gray-700">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-400">—</td>
                    <td className="px-4 py-3 text-gray-400">—</td>
                    <td className="px-4 py-3 text-gray-400">—</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Absent</span>
                    </td>
                  </tr>
                ) : (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockIn)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockOut)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.clockOut ? `${r.totalHours}h` : (
                        <span className="text-green-600 font-medium">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.isLate ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Late</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">On time</span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummary;
