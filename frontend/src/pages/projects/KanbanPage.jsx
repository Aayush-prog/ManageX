import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import TaskCard from '../../components/projects/TaskCard.jsx';
import CreateTaskModal from '../../components/projects/CreateTaskModal.jsx';
import TaskDetailModal from '../../components/projects/TaskDetailModal.jsx';
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

const KanbanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project,     setProject]     = useState(null);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [createStatus, setCreateStatus] = useState(null); // which column's + was clicked
  const [detailTask,  setDetailTask]  = useState(null);

  const canManage = ['manager', 'admin'].includes(user?.permissionLevel);

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then(({ data }) => {
        setProject(data.data.project);
        setTasksByStatus(data.data.tasksByStatus ?? {});
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const getTasks = (status) => tasksByStatus[status] ?? [];

  const handleTaskCreated = (task) => {
    setTasksByStatus((prev) => ({
      ...prev,
      [task.status]: [task, ...(prev[task.status] ?? [])],
    }));
  };

  const handleTaskUpdated = (updated) => {
    // update in the correct column
    setTasksByStatus((prev) => {
      const next = { ...prev };
      COLUMNS.forEach((col) => {
        next[col] = (prev[col] ?? []).map((t) => t._id === updated._id ? updated : t);
      });
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

    // Optimistic update
    setTasksByStatus((prev) => ({
      ...prev,
      [srcCol]: srcList,
      [dstCol]: dstList,
    }));

    // Persist
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

  return (
    <DashboardLayout title={project?.name ?? 'Kanban'}>
      <div className="space-y-4">
        {/* Project header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="text-sm text-gray-400 hover:text-gray-600">
              ← Projects
            </button>
            <span className="text-gray-200">|</span>
            <div>
              <span className="text-sm text-gray-500">{doneTasks}/{totalTasks} tasks done</span>
              <span className="ml-2 text-sm font-medium text-brand-600">{pct}%</span>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setCreateStatus('Backlog')} className="btn-primary text-sm">
              + Add Task
            </button>
          )}
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
            {COLUMNS.map((col) => {
              const tasks = getTasks(col);
              return (
                <div key={col} className="flex-shrink-0 w-60">
                  {/* Column header */}
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

                  {/* Droppable column */}
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
          members={project?.members ?? []}
          defaultStatus={createStatus}
          onClose={() => setCreateStatus(null)}
          onCreated={handleTaskCreated}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}
    </DashboardLayout>
  );
};

export default KanbanPage;
