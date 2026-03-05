import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate, fmtTime } from '../../utils/nepaliDate.js';

const fmtDate = fmtBSDate;

const StatCard = ({ label, value, sub, accent, onClick }) => (
  <div
    className={`stat-card border-l-4 ${accent} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    onClick={onClick}
  >
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const [stats,      setStats]      = useState(null);
  const [pendLeaves, setPendLeaves] = useState([]);
  const [todayAtt,   setTodayAtt]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const now   = new Date();
        const year  = now.getFullYear();
        const month = now.getMonth() + 1;
        const today = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const [usersRes, leavesRes, attRes] = await Promise.allSettled([
          api.get('/users'),
          api.get('/leaves/all', { params: { status: 'Pending' } }),
          api.get('/attendance/team', { params: { year, month } }),
        ]);

        const users  = usersRes.status  === 'fulfilled' ? (usersRes.value.data.data  ?? []) : [];
        const leaves = leavesRes.status === 'fulfilled' ? (leavesRes.value.data.data ?? []) : [];
        const att    = attRes.status    === 'fulfilled' ? (attRes.value.data.data    ?? []) : [];

        // Filter attendance to today only (clockOut == null means still active)
        const todayRecords = att.filter((r) => r.date === today);

        setStats({ teamCount: users.length, pendingLeaves: leaves.length, activeToday: todayRecords.filter((r) => !r.clockOut).length });
        setPendLeaves(leaves.slice(0, 5)); // show latest 5
        setTodayAtt(todayRecords);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout title="Manager Dashboard" hideClockStatus={false} hideSalaryWidget={false}>
      <div className="space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Team Members"
            value={loading ? '…' : stats?.teamCount}
            accent="border-brand-400"
          />
          <StatCard
            label="Pending Leave Requests"
            value={loading ? '…' : stats?.pendingLeaves}
            sub={stats?.pendingLeaves > 0 ? 'Tap to review' : 'None pending'}
            accent={stats?.pendingLeaves > 0 ? 'border-amber-400' : 'border-gray-300'}
            onClick={() => navigate('/leave/manage')}
          />
          <StatCard
            label="Active Today"
            value={loading ? '…' : stats?.activeToday}
            sub="Currently clocked in"
            accent="border-green-400"
          />
        </div>

        {/* Pending Leave Requests */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Pending Leave Requests</h3>
            <button
              onClick={() => navigate('/leave/manage')}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              View all →
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : pendLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No pending leave requests.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Employee</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">From</th>
                  <th className="text-left px-4 py-3">To</th>
                  <th className="text-center px-4 py-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {pendLeaves.map((l) => (
                  <tr key={l._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{l.user?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.type === 'Sick' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(l.startDate)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(l.endDate)}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-800">{l.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Today's Team Attendance</h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : todayAtt.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No attendance records for today.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Clock In</th>
                  <th className="text-left px-4 py-3">Clock Out</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAtt.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtTime(r.clockIn)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.clockOut ? fmtTime(r.clockOut) : <span className="text-green-600 font-medium text-xs">Active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.locationType === 'Office' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {r.locationType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.isLate
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Late</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">On time</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
