import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDateStr } from '../../utils/nepaliDate.js';
import BSDatePicker from '../../components/ui/BSDatePicker.jsx';
import GpxMap from '../../components/map/GpxMap.jsx';
import { parseGpx, computeStats } from '../../utils/gpx.js';

// ── GPX view modal ────────────────────────────────────────────────────────────

const GpxViewModal = ({ gpxFile, title, onClose }) => {
  const [gpxData, setGpxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/uploads/${gpxFile}`);
        if (!res.ok) throw new Error('Could not load GPX file.');
        const text = await res.text();
        const { points, name } = parseGpx(text);
        if (points.length === 0) throw new Error('No track points found in GPX file.');
        setGpxData({ points, name: name || title, stats: computeStats(points) });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [gpxFile, title]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{title} — Route Map</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-16 animate-pulse">Loading route…</p>
          )}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
          )}
          {gpxData && (
            <div className="space-y-4">
              {gpxData.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['Distance',       `${gpxData.stats.distanceKm.toFixed(1)} km`],
                    ['Elevation Gain', `+${gpxData.stats.elevGain} m`],
                    ['Elevation Loss', `−${gpxData.stats.elevLoss} m`],
                    ['Max Elevation',  `${gpxData.stats.maxEle} m`],
                  ].map(([label, value]) => (
                    <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-lg font-bold text-gray-800">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              <GpxMap points={gpxData.points} height="420px" showElevation />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Excursion row ─────────────────────────────────────────────────────────────

const ExcursionRow = ({ excursion: e, onDeleted, onGpxUpdate }) => {
  const [deleting,  setDeleting]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMap,   setShowMap]   = useState(false);

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

  const handleGpxUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      alert('Please select a .gpx file.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('gpx', file);
      const { data } = await api.post(`/excursions/${e._id}/gpx`, form);
      onGpxUpdate(e._id, data.data.gpxFile);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 font-medium text-gray-800">{e.topic}</td>
        <td className="px-4 py-3 text-gray-600">{fmtBSDateStr(e.startDate)}</td>
        <td className="px-4 py-3 text-gray-600">{fmtBSDateStr(e.endDate)}</td>
        <td className="px-4 py-3 text-gray-500">{e.createdBy?.name ?? '—'}</td>
        <td className="px-4 py-3">
          {e.gpxFile ? (
            <button
              onClick={() => setShowMap(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              View Route
            </button>
          ) : (
            <label className={`text-xs font-medium cursor-pointer transition-colors ${
              uploading ? 'text-gray-400 pointer-events-none' : 'text-gray-500 hover:text-gray-700'
            }`}>
              {uploading ? 'Uploading…' : 'Upload GPX'}
              <input
                type="file"
                accept=".gpx"
                className="hidden"
                disabled={uploading}
                onChange={(ev) => handleGpxUpload(ev.target.files[0])}
              />
            </label>
          )}
        </td>
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

      {showMap && (
        <GpxViewModal
          gpxFile={e.gpxFile}
          title={e.topic}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
};

// ── New excursion modal ───────────────────────────────────────────────────────

const NewExcursionModal = ({ onClose, onCreated }) => {
  const [form,      setForm]      = useState({ topic: '', startDate: '', endDate: '' });
  const [users,     setUsers]     = useState([]);
  const [selected,  setSelected]  = useState(new Set());
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [result,    setResult]    = useState(null);

  useEffect(() => {
    api.get('/users').then(({ data }) => {
      const list = data.data ?? [];
      setUsers(list);
      setSelected(new Set(list.map((u) => u._id)));
    }).catch(() => {});
  }, []);

  const toggleUser = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected((prev) =>
    prev.size === users.length ? new Set() : new Set(users.map((u) => u._id))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await api.post('/excursions', { ...form, userIds: [...selected] });
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create excursion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                <BSDatePicker
                  value={form.startDate}
                  onChange={(iso) => setForm((f) => ({ ...f, startDate: iso }))}
                  placeholder="Start date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <BSDatePicker
                  value={form.endDate}
                  onChange={(iso) => setForm((f) => ({ ...f, endDate: iso }))}
                  placeholder="End date"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Participants ({selected.size} / {users.length})
                </label>
                <button type="button" onClick={toggleAll}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  {selected.size === users.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <label key={u._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 select-none">
                    <input
                      type="checkbox"
                      checked={selected.has(u._id)}
                      onChange={() => toggleUser(u._id)}
                      className="rounded accent-brand-600"
                    />
                    <span className="text-sm text-gray-700 flex-1">{u.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{u.role}</span>
                  </label>
                ))}
                {users.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving || selected.size === 0}
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

// ── Page ──────────────────────────────────────────────────────────────────────

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

  const handleGpxUpdate = (id, gpxFile) => {
    setExcursions((prev) => prev.map((e) => (e._id === id ? { ...e, gpxFile } : e)));
  };

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
                  {['Topic', 'Start Date', 'End Date', 'Added By', 'Route', ''].map((h) => (
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
                    onGpxUpdate={handleGpxUpdate}
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

export default ExcursionPage;
