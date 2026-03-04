import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';

const fmtNPR  = (n = 0) => `Rs. ${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (iso)   => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtMonth = (m)    => {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(y, Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const StatusBadge = ({ status }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
    status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
  }`}>{status}</span>
);

const MyPayrollPage = () => {
  const [records, setRecords] = useState([]);
  const [ssf,     setSSF]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/payroll/my-payroll'), api.get('/payroll/my-ssf')])
      .then(([p, s]) => {
        setRecords(p.data.data ?? []);
        setSSF(s.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmtNPR = (n = 0) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

  return (
    <DashboardLayout title="My Payroll" hideClockStatus hideSalaryWidget>
      <div className="space-y-6">

        {/* SSF Summary */}
        {ssf && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'My SSF Contribution', value: fmtNPR(ssf.totalEmployeeContribution), accent: 'border-orange-400' },
              { label: 'Employer SSF',         value: fmtNPR(ssf.totalEmployerContribution), accent: 'border-blue-400' },
              { label: 'Total Accumulated',    value: fmtNPR(ssf.totalAccumulated),           accent: 'border-green-400' },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`stat-card border-l-4 ${accent}`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Payroll History */}
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Payroll History</h3>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
          ) : !records.length ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No payroll records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Month', 'Base Salary', 'Employee SSF', 'Employer SSF', 'Total SSF', 'Net Pay', 'Status', 'Paid On'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{fmtMonth(r.month)}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtNPR(r.baseSalary)}</td>
                      <td className="px-4 py-3 text-orange-600 font-medium">{fmtNPR(r.employeeSSF)}</td>
                      <td className="px-4 py-3 text-blue-600">{fmtNPR(r.employerSSF)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtNPR(r.totalSSF)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{fmtNPR(r.finalPayableSalary)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(r.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyPayrollPage;
