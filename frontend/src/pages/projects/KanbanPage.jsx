import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import TaskCard from '../../components/projects/TaskCard.jsx';
import CreateTaskModal from '../../components/projects/CreateTaskModal.jsx';
import TaskDetailModal from '../../components/projects/TaskDetailModal.jsx';
import EditProjectModal from '../../components/projects/EditProjectModal.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const COLUMNS = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done'];

const COLUMN_LABEL = {
  Backlog:    'Backlog',
  Todo:       'To Do',
  InProgress: 'In Progress',
  Review:     'Review',
  Done:       'Done',
};

const COLUMN_HEADER = {
  Backlog:    'bg-gray-50 border-gray-200',
  Todo:       'bg-blue-50 border-blue-100',
  InProgress: 'bg-amber-50 border-amber-100',
  Review:     'bg-purple-50 border-purple-100',
  Done:       'bg-green-50 border-green-100',
};

const STATUS_BADGE = {
  Planning:  'bg-gray-100 text-gray-600',
  Active:    'bg-green-50 text-green-700',
  Completed: 'bg-blue-50 text-blue-700',
};

const KanbanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project,       setProject]       = useState(null);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading,       setLoading]       = useState(true);
  const [createStatus,  setCreateStatus]  = useState(null);
  const [detailTask,    setDetailTask]    = useState(null);
  const [showEditProject, setShowEditProject] = useState(false);

  const canManage = ['manager', 'admin'].includes(user?.permissionLevel);

  const load = () => {
    api.get(`/projects/${id}`)
      .then(({ data }) => {
        // API returns flat object: { ...projectFields, tasksByStatus }
        const { tasksByStatus: tbs, ...proj } = data.data;
        setProject(proj);
        setTasksByStatus(tbs ?? {});
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const getTasks = (status) => tasksByStatus[status] ?? [];

  const handleTaskCreated = (task) => {
    setTasksByStatus((prev) => ({
      ...prev,
      [task.status]: [task, ...(prev[task.status] ?? [])],
    }));
  };

  const handleTaskUpdated = (updated) => {
    setTasksByStatus((prev) => {
      const next = { ...prev };
      // Remove from all columns first (handles status change)
      COLUMNS.forEach((col) => {
        next[col] = (prev[col] ?? []).filter((t) => t._id !== updated._id);
      });
      // Place in the correct column
      next[updated.status] = [updated, ...(next[updated.status] ?? [])];
      return next;
    });
    setDetailTask(updated);
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const srcCol  = source.droppableId;
    const dstCol  = destination.droppableId;
    const srcList = Array.from(getTasks(srcCol));
    const dstList = srcCol === dstCol ? srcList : Array.from(getTasks(dstCol));

    const [moved] = srcList.splice(source.index, 1);
    const updatedTask = { ...moved, status: dstCol };
    dstList.splice(destination.index, 0, updatedTask);

    setTasksByStatus((prev) => ({
      ...prev,
      [srcCol]: srcList,
      [dstCol]: dstList,
    }));

    try {
      await api.patch(`/tasks/${draggableId}`, { status: dstCol });
    } catch {
      // revert on failure
      setTasksByStatus((prev) => {
        const revert = { ...prev };
        const origSrc = Array.from(prev[srcCol] ?? []);
        const origDst = Array.from(prev[dstCol] ?? []);
        origSrc.splice(source.index, 0, moved);
        origDst.splice(destination.index, 1);
        revert[srcCol] = origSrc;
        revert[dstCol] = origDst;
        return revert;
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Kanban">
        <p className="text-sm text-gray-400">Loading board…</p>
      </DashboardLayout>
    );
  }

  const totalTasks = COLUMNS.reduce((sum, col) => sum + getTasks(col).length, 0);
  const doneTasks  = getTasks('Done').length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const members = project?.members ?? [];

  return (
    <DashboardLayout title={project?.name ?? 'Kanban'}>
      <div className="space-y-4">
        {/* Project header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/projects')} className="text-sm text-gray-400 hover:text-gray-600 flex-shrink-0">
              ← Projects
            </button>
            <span className="text-gray-300">|</span>
            {/* Project name + status badge */}
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-semibold text-gray-800 truncate">{project?.name}</h2>
              {project?.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[project.status]}`}>
                  {project.status}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-gray-500">{doneTasks}/{totalTasks} done</span>
            <span className="text-sm font-medium text-brand-600">{pct}%</span>
            {canManage && (
              <>
                <button
                  onClick={() => setShowEditProject(true)}
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Edit Project
                </button>
                <button onClick={() => setCreateStatus('Backlog')} className="btn-primary text-sm">
                  + Add Task
                </button>
              </>
            )}
          </div>
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
            {COLUMNS.map((col) => {
              const tasks = getTasks(col);
              return (
                <div key={col} className="flex-shrink-0 w-60">
                  <div className={`rounded-lg border px-3 py-2 mb-2 flex items-center justify-between ${COLUMN_HEADER[col]}`}>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {COLUMN_LABEL[col]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">{tasks.length}</span>
                      {canManage && (
                        <button
                          onClick={() => setCreateStatus(col)}
                          className="text-gray-400 hover:text-brand-600 text-base leading-none"
                          title="Add task"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>

                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-24 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'bg-brand-50' : 'bg-transparent'
                        }`}
                      >
                        {tasks.map((task, index) => (
                          <TaskCard
                            key={task._id}
                            task={task}
                            index={index}
                            onClick={setDetailTask}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {createStatus && (
        <CreateTaskModal
          projectId={id}
          members={members}
          defaultStatus={createStatus}
          onClose={() => setCreateStatus(null)}
          onCreated={handleTaskCreated}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          members={members}
          canEdit={canManage}
          onClose={() => setDetailTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}

      {showEditProject && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onUpdated={(updated) => setProject((prev) => ({ ...prev, ...updated }))}
        />
      )}
    </DashboardLayout>
  );
};

export default KanbanPage;
