import { fmtBSDateStr } from '../../utils/nepaliDate.js';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = fmtBSDateStr;

const SummaryCard = ({ label, value, accent }) => (
  <div className={`stat-card border-l-4 ${accent}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const MonthlySummary = ({ records = [], summary = {} }) => {
  if (!records.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-sm">No attendance records for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Days Present"    value={summary.daysPresent ?? 0}  accent="border-green-400" />
        <SummaryCard label="Days Late"       value={summary.daysLate ?? 0}     accent="border-red-400" />
        <SummaryCard label="Total Hours"     value={`${summary.totalHours ?? 0}h`}    accent="border-blue-400" />
        <SummaryCard label="Avg Hours / Day" value={`${summary.avgHoursPerDay ?? 0}h`} accent="border-purple-400" />
      </div>

      {/* Records table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => (
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
    </div>
  );
};

export default MonthlySummary;
