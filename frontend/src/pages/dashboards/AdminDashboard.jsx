import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { curADMonth, curBSMonthLabel } from '../../utils/nepaliDate.js';

const fmtNPR  = (n) => `Rs. ${(n ?? 0).toLocaleString('en-IN')}`;
const curMonth = curADMonth;

const StatCard = ({ label, value, note, color }) => (
  <div className="stat-card">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
    {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
  </div>
);

const STATUS_BADGE = {
  Planning:  'bg-gray-100 text-gray-600',
  Active:    'bg-green-50 text-green-700',
  Completed: 'bg-blue-50 text-blue-700',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const month = curMonth();
    Promise.all([
      api.get('/projects'),
      api.get('/accounting/summary', { params: { month } }),
    ])
      .then(([projRes, sumRes]) => {
        setProjects(projRes.data.data ?? []);
        setSummary(sumRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active    = projects.filter((p) => p.status === 'Active').length;
  const completed = projects.filter((p) => p.status === 'Completed').length;
  const avgPct    = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.completionPercentage ?? 0), 0) / projects.length)
    : 0;

  const payroll = summary?.payroll ?? {};

  return (
    <DashboardLayout title="Admin Overview">
      <div className="space-y-6">
        {/* Project KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Projects"  value={loading ? '…' : projects.length} />
          <StatCard label="Active Projects" value={loading ? '…' : active}    color="text-green-600" />
          <StatCard label="Completed"       value={loading ? '…' : completed} color="text-blue-600" />
          <StatCard label="Avg Completion"  value={loading ? '…' : `${avgPct}%`} note="across all projects" color="text-brand-600" />
        </div>

        {/* Finance KPIs */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Finance — {curBSMonthLabel()}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Expenses (Approved)"
              value={loading ? '…' : fmtNPR(summary?.totalExpenses)}
              note="This month"
            />
            <StatCard
              label="Payroll Gross"
              value={loading ? '…' : fmtNPR(payroll.totalBaseSalary)}
              note={`${payroll.count ?? 0} employees`}
            />
            <StatCard
              label="Total SSF"
              value={loading ? '…' : fmtNPR(payroll.totalSSF)}
              note="Employee + Employer"
              color="text-brand-600"
            />
            <StatCard
              label="Net Payable"
              value={loading ? '…' : fmtNPR(payroll.totalNet)}
              note="After employee SSF"
              color="text-green-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Project Progress</h3>
              <button onClick={() => navigate('/projects')} className="text-sm text-brand-600 hover:underline">
                View all →
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No projects yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => {
                  const pct      = Math.round(p.completionPercentage ?? 0);
                  const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-brand-500' : 'bg-amber-400';
                  return (
                    <div key={p._id} className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => navigate(`/projects/${p._id}`)}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                          <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget usage */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Budget Usage</h3>
              <button onClick={() => navigate('/finance/accounting')} className="text-sm text-brand-600 hover:underline">
                Accounting →
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : !summary?.budgets?.length ? (
              <p className="text-sm text-gray-400 italic">No project budgets set.</p>
            ) : (
              <div className="space-y-3">
                {summary.budgets.map((b) => {
                  const barColor = b.pct >= 90 ? 'bg-red-500' : b.pct >= 70 ? 'bg-amber-400' : 'bg-brand-500';
                  return (
                    <div key={b.projectId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate">{b.projectName}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {fmtNPR(b.totalSpent)} / {fmtNPR(b.allocatedBudget)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
