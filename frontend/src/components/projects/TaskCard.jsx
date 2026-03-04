import { Draggable } from '@hello-pangea/dnd';

const PRIORITY = {
  Low:      { dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600' },
  Medium:   { dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700' },
  High:     { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700' },
  Critical: { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700' },
};

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

const isOverdue = (iso) => iso && new Date(iso) < new Date();

const TaskCard = ({ task, index, onClick }) => {
  const p = PRIORITY[task.priority] ?? PRIORITY.Medium;
  const due = fmtDate(task.dueDate);
  const overdue = isOverdue(task.dueDate) && task.status !== 'Done';

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`
            bg-white rounded-lg border border-gray-100 p-3 mb-2 cursor-pointer
            hover:border-brand-300 hover:shadow-sm transition-all select-none
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-brand-400 rotate-1' : ''}
          `}
        >
          {/* Priority bar */}
          <div className={`h-0.5 w-full rounded-full mb-2.5 ${p.dot}`} />

          {/* Title */}
          <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">
            {task.title}
          </p>

          {/* Description preview */}
          {task.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5 gap-2">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${p.badge}`}>
              {task.priority}
            </span>

            <div className="flex items-center gap-2 ml-auto">
              {due && (
                <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {overdue ? '⚠ ' : ''}{due}
                </span>
              )}
              {task.assignedTo && (
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {initials(task.assignedTo.name)}
                </div>
              )}
            </div>
          </div>

          {/* Comment count */}
          {task.comments?.length > 0 && (
            <p className="text-xs text-gray-400 mt-1.5">💬 {task.comments.length}</p>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
