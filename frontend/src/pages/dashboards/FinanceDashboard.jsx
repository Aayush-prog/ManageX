import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { curADMonth, fmtBSMonthYear } from '../../utils/nepaliDate.js';

const fmtNPR = (n = 0) => `Rs. ${Number(n).toLocaleString('en-IN')}`;
const currentMonthKey = curADMonth;
const fmtMonth = fmtBSMonthYear;

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const month = currentMonthKey();

  useEffect(() => {
    api.get(`/payroll/month/${month}`)
      .then(({ data }) => setRecords(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month]);

  const totalNet    = records.reduce((s, r) => s + (r.finalPayableSalary ?? 0), 0);
  const totalSSF    = records.reduce((s, r) => s + (r.totalSSF ?? 0), 0);
  const paidCount   = records.filter((r) => r.status === 'Paid').length;
  const pendingCount = records.filter((r) => r.status === 'Pending').length;

  return (
    <DashboardLayout title="Finance Dashboard" hideSalaryWidget>
      <div className="space-y-6">

        {/* This month summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {fmtMonth(month)} Payroll
            </h3>
            <button
              onClick={() => navigate('/finance/payroll')}
              className="text-sm text-brand-600 hover:text-brand-800 font-medium"
            >
              Manage Payroll →
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Net Payable', value: fmtNPR(totalNet),     accent: 'border-green-400' },
              { label: 'Total SSF',         value: fmtNPR(totalSSF),     accent: 'border-blue-400' },
              { label: 'Paid',              value: paidCount,             accent: 'border-green-400' },
              { label: 'Pending',           value: pendingCount,          accent: 'border-yellow-400' },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`stat-card border-l-4 ${accent}`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick-action strip */}
        <div className="card flex flex-wrap gap-3">
          <button onClick={() => navigate('/finance/payroll')}
            className="btn-primary text-sm">
            Generate / Manage Payroll
          </button>
          <button onClick={() => navigate('/finance/payroll')}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Edit Salaries & SSF Rates
          </button>
        </div>

        {/* Pending payouts preview */}
        {!loading && pendingCount > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Pending Payouts</h3>
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {pendingCount} pending
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Name', 'Role', 'Net Pay', 'Employee SSF'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.filter((r) => r.status === 'Pending').map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.user?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{r.user?.role ?? '—'}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{fmtNPR(r.finalPayableSalary)}</td>
                      <td className="px-4 py-3 text-orange-600">{fmtNPR(r.employeeSSF)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinanceDashboard;
