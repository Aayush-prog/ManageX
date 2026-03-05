import DashboardLayout from '../../components/layout/DashboardLayout.jsx';

const VideographerDashboard = () => (
  <DashboardLayout title="Videographer Dashboard" hideClockStatus={false} hideSalaryWidget={false}>
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['Assigned Projects', 'Videos In Edit', 'Delivered', 'Storage Used'].map((label) => (
          <div key={label} className="stat-card">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-400 mt-1">Placeholder</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Current Projects</h3>
          <p className="text-sm text-gray-400 italic">Active video projects will appear here.</p>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Upload Queue</h3>
          <p className="text-sm text-gray-400 italic">Pending uploads and reviews will appear here.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Schedule</h3>
        <p className="text-sm text-gray-400 italic">Shooting and delivery schedule will appear here.</p>
      </div>
    </div>
  </DashboardLayout>
);

export default VideographerDashboard;
