import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import CreateProjectModal from '../../components/projects/CreateProjectModal.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { fmtBSDate } from '../../utils/nepaliDate.js';

const STATUS_BADGE = {
  Planning:  'bg-gray-100 text-gray-600',
  Active:    'bg-green-50 text-green-700',
  Completed: 'bg-blue-50 text-blue-700',
};

const fmtDate = fmtBSDate;

const ProjectCard = ({ project, onClick }) => {
  const pct = project.completionPercentage ?? 0;
  const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-brand-500' : 'bg-amber-400';

  return (
    <div
      onClick={() => onClick(project._id)}
      className="card cursor-pointer hover:shadow-md hover:border-brand-300 border border-gray-100 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-800 leading-snug line-clamp-2">{project.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[project.status]}`}>
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
        <span>{project.members?.length ?? 0} member{project.members?.length !== 1 ? 's' : ''}</span>
        <span>{fmtDate(project.endDate)}</span>
      </div>
    </div>
  );
};

const STATUSES = ['All', 'Planning', 'Active', 'Completed'];

const ProjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const canCreate = ['manager', 'admin'].includes(user?.permissionLevel);

  useEffect(() => {
    api.get('/projects')
      .then(({ data }) => setProjects(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (project) => setProjects((prev) => [project, ...prev]);

  const filtered = projects.filter((p) => {
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout title="Projects">
        <p className="text-sm text-gray-400">Loading projects…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Projects">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
          />
          <div className="flex gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-400 ml-auto">
            {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              + New Project
            </button>
          )}
        </div>

        {/* Grid */}
        {projects.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">No projects yet.</p>
            {canCreate && (
              <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-brand-600 hover:underline">
                Create the first project
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">No projects match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p._id} project={p} onClick={(id) => navigate(`/projects/${id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </DashboardLayout>
  );
};

export default ProjectsPage;
