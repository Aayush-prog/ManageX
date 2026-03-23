import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDateStr } from '../../utils/nepaliDate.js';

const ExcursionPage = () => {
  const [excursions, setExcursions] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  const fetchExcursions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/excursions');
      setExcursions(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExcursions(); }, []);

  return (
    <DashboardLayout title="Excursions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Filming Excursions</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage excursion records — attendance is auto-generated for all staff.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            + New Excursion
          </button>
        </div>

        {loading && (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
          </div>
        )}

        {!loading && excursions.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-sm">No excursions yet.</p>
          </div>
        )}

        {!loading && excursions.length > 0 && (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Topic', 'Start Date', 'End Date', 'Added By', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {excursions.map((e) => (
                  <ExcursionRow
                    key={e._id}
                    excursion={e}
                    onDeleted={(id) => setExcursions((prev) => prev.filter((x) => x._id !== id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <NewExcursionModal
          onClose={() => setShowForm(false)}
          onCreated={(excursion) => {
            setExcursions((prev) => [excursion, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const ExcursionRow = ({ excursion: e, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete excursion "${e.topic}"? This will also remove all auto-generated attendance records for this excursion.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/excursions/${e._id}`);
      onDeleted(e._id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-800">{e.topic}</td>
      <td className="px-4 py-3 text-gray-600">{fmtBSDateStr(e.startDate)}</td>
      <td className="px-4 py-3 text-gray-600">{fmtBSDateStr(e.endDate)}</td>
      <td className="px-4 py-3 text-gray-500">{e.createdBy?.name ?? '—'}</td>
      <td className="px-4 py-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </td>
    </tr>
  );
};

// ── New Excursion Modal ───────────────────────────────────────────────────────

const NewExcursionModal = ({ onClose, onCreated }) => {
  const [form,    setForm]    = useState({ topic: '', startDate: '', endDate: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await api.post('/excursions', form);
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create excursion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">New Filming Excursion</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-sm text-green-700 space-y-1">
              <p className="font-semibold">Excursion created!</p>
              <p>{result.days} working day{result.days !== 1 ? 's' : ''} · {result.created} attendance records created · {result.skipped} skipped (existing)</p>
            </div>
            <button
              onClick={() => onCreated(result.excursion)}
              className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Topic</label>
              <input
                type="text"
                required
                placeholder="e.g. Mountain Trail Filming"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Attendance will be auto-generated for all active staff (9 AM – 5 PM) for each working day. Saturdays are skipped.</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Excursion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ExcursionPage;
