import { useRef, useState } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { fmtBSDate, fmtBSDateTime, fmtBSDateStr } from '../../utils/nepaliDate.js';

const PRIORITY_BADGE = {
  Low:      'bg-gray-100 text-gray-600',
  Medium:   'bg-blue-50 text-blue-700',
  High:     'bg-orange-50 text-orange-700',
  Critical: 'bg-red-50 text-red-700',
};

const STATUS_BADGE = {
  Backlog:    'bg-gray-100 text-gray-600',
  Todo:       'bg-blue-50 text-blue-700',
  InProgress: 'bg-amber-50 text-amber-700',
  Review:     'bg-purple-50 text-purple-700',
  Done:       'bg-green-50 text-green-700',
};

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES   = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done'];

const fmtDate     = fmtBSDate;
const fmtDateTime = fmtBSDateTime;

const fileIcon = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif'].includes(ext)) return '🖼';
  if (ext === 'pdf') return '📄';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx'].includes(ext)) return '📊';
  if (ext === 'zip') return '🗜';
  return '📎';
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-xs text-gray-400 uppercase tracking-wide mb-0.5';

const TaskDetailModal = ({ task: initialTask, members = [], canEdit = false, onClose, onUpdated }) => {
  const { user } = useAuth();
  const [task,        setTask]        = useState(initialTask);
  const [editing,     setEditing]     = useState(false);
  const [editForm,    setEditForm]    = useState({
    title:      initialTask.title,
    description: initialTask.description ?? '',
    priority:   initialTask.priority,
    status:     initialTask.status,
    assignedTo: initialTask.assignedTo?._id ?? '',
    dueDate:    initialTask.dueDate ? new Date(initialTask.dueDate).toISOString().slice(0, 10) : '',
  });
  const [saving,      setSaving]      = useState(false);
  const [editError,   setEditError]   = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef(null);

  const setField = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) { setEditError('Title is required'); return; }
    setSaving(true); setEditError('');
    try {
      const payload = {
        ...editForm,
        assignedTo: editForm.assignedTo || undefined,
        dueDate:    editForm.dueDate    || undefined,
      };
      const { data } = await api.patch(`/tasks/${task._id}`, payload);
      // re-attach comments/attachments that aren't returned by updateTask
      const merged = { ...data.data, comments: task.comments, attachments: task.attachments };
      setTask(merged);
      onUpdated?.(merged);
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tasks/${task._id}/comments`, { text: commentText.trim() });
      setTask(data.data);
      setCommentText('');
      onUpdated?.(data.data);
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/tasks/${task._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTask((prev) => ({ ...prev, attachments: [...(prev.attachments ?? []), data.data] }));
    } catch { /* ignore */ } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                className="w-full border border-brand-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={editForm.title}
                onChange={(e) => setField('title', e.target.value)}
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-800 leading-snug">{task.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status]}`}>{task.status}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {editing ? (
            /* ── Edit Form ── */
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Priority</label>
                  <select className={inputCls} value={editForm.priority} onChange={(e) => setField('priority', e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={editForm.status} onChange={(e) => setField('status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Assign To</label>
                  <select className={inputCls} value={editForm.assignedTo} onChange={(e) => setField('assignedTo', e.target.value)}>
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input type="date" className={inputCls} value={editForm.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
                  {editForm.dueDate && <p className="text-xs text-brand-600 mt-1">{fmtBSDateStr(editForm.dueDate)}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Task description…"
                />
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* ── View Mode ── */
            <>
              {/* Meta */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className={labelCls}>Assigned To</p>
                  <p className="text-gray-700 font-medium">{task.assignedTo?.name ?? 'Unassigned'}</p>
                </div>
                <div>
                  <p className={labelCls}>Due Date</p>
                  <p className="text-gray-700">{fmtDate(task.dueDate)}</p>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <p className={labelCls}>Description</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
            </>
          )}

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={labelCls}>
                Attachments {task.attachments?.length > 0 && `(${task.attachments.length})`}
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-brand-600 hover:underline disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : '+ Attach file'}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
            </div>

            {task.attachments?.length > 0 ? (
              <div className="space-y-1">
                {task.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={`${apiBase}${a.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-600 hover:underline"
                  >
                    <span>{fileIcon(a.name)}</span>
                    <span className="truncate">{a.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No attachments.</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className={labelCls}>
              Comments {task.comments?.length > 0 && `(${task.comments.length})`}
            </p>

            {task.comments?.length === 0 && (
              <p className="text-sm text-gray-400 italic">No comments yet.</p>
            )}

            <div className="space-y-3">
              {task.comments?.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {c.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-gray-700">{c.user?.name ?? 'Unknown'}</span>
                      <span className="text-xs text-gray-400">{fmtDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div className="flex gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  placeholder="Add a comment…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
