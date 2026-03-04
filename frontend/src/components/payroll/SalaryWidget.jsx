import { useEffect, useState } from 'react';
import api from '../../services/api.js';

const fmtNPR = (n = 0) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const Row = ({ label, value, accent }) => (
  <div className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0`}>
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-sm font-semibold ${accent ?? 'text-gray-800'}`}>{value}</span>
  </div>
);

const SalaryWidget = () => {
  const [thisMonth, setThisMonth] = useState(null);
  const [ssfAcc,    setSsfAcc]    = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const month = currentMonthKey();
    Promise.all([
      api.get('/payroll/my-payroll'),
      api.get('/payroll/my-ssf'),
    ]).then(([payRes, ssfRes]) => {
      const records = payRes.data.data ?? [];
      setThisMonth(records.find((r) => r.month === month) ?? null);
      setSsfAcc(ssfRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-gray-100 rounded w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-base font-semibold text-gray-800 mb-3">Salary & SSF</h3>
      <div>
        <Row label="Base Salary"              value={fmtNPR(thisMonth?.baseSalary ?? 0)} />
        <Row
          label="Employee SSF (this month)"
          value={thisMonth ? fmtNPR(thisMonth.employeeSSF) : '—'}
          accent="text-orange-600"
        />
        <Row
          label="Net Payable (this month)"
          value={thisMonth ? fmtNPR(thisMonth.finalPayableSalary) : '—'}
          accent="text-green-600"
        />
        <Row
          label="Payroll Status"
          value={
            thisMonth ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                thisMonth.status === 'Paid'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}>{thisMonth.status}</span>
            ) : '—'
          }
        />
        <Row
          label="Total Accumulated SSF"
          value={fmtNPR(ssfAcc?.totalAccumulated ?? 0)}
          accent="text-blue-600"
        />
      </div>
    </div>
  );
};

export default SalaryWidget;
