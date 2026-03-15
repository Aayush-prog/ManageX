import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';

// Fix leaflet default icon paths broken by bundlers
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Parse GPX XML string → array of [lat, lng] pairs
function parseGpx(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const trkpts = doc.querySelectorAll('trkpt');
  if (trkpts.length > 0) {
    return Array.from(trkpts).map(pt => [
      parseFloat(pt.getAttribute('lat')),
      parseFloat(pt.getAttribute('lon')),
    ]);
  }
  // fallback: route points
  const rtepts = doc.querySelectorAll('rtept');
  return Array.from(rtepts).map(pt => [
    parseFloat(pt.getAttribute('lat')),
    parseFloat(pt.getAttribute('lon')),
  ]);
}

// Auto-fit map bounds to the track
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions, { padding: [30, 30] });
    }
  }, [positions, map]);
  return null;
}

export default function GpxPage() {
  const [tracks, setTracks]         = useState([]);
  const [selected, setSelected]     = useState(null);   // GpxTrack object
  const [positions, setPositions]   = useState([]);     // parsed coords
  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile]             = useState(null);
  const fileRef = useRef();

  const fetchTracks = useCallback(async () => {
    try {
      const { data } = await api.get('/gpx');
      setTracks(data.data);
    } catch {
      setError('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  // When a track is selected, fetch the GPX file and parse it
  useEffect(() => {
    if (!selected) return;
    setPositions([]);
    const apiBase = import.meta.env.VITE_API_BASE?.replace('/api', '') || '';
    fetch(`${apiBase}${selected.url}`)
      .then(r => r.text())
      .then(text => setPositions(parseGpx(text)))
      .catch(() => setError('Failed to load GPX file'));
  }, [selected]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || file.name);
      if (description) fd.append('description', description);
      const { data } = await api.post('/gpx', fd);
      setTracks(prev => [data.data, ...prev]);
      setTitle(''); setDescription(''); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this track?')) return;
    try {
      await api.delete(`/gpx/${id}`);
      setTracks(prev => prev.filter(t => t._id !== id));
      if (selected?._id === id) { setSelected(null); setPositions([]); }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const center = positions.length > 0 ? positions[0] : [27.7172, 85.3240]; // Kathmandu default

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">GPX Tracks</h1>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Upload form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload GPX File</h2>
          <form onSubmit={handleUpload} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Track title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">GPX File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".gpx"
                onChange={e => setFile(e.target.files[0] || null)}
                className="text-sm text-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Track list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Tracks ({tracks.length})</span>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Loading…</p>
            ) : tracks.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No GPX tracks uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                {tracks.map(t => (
                  <li key={t._id}
                    onClick={() => setSelected(t)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?._id === t._id ? 'bg-brand-50 border-l-2 border-brand-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                        {t.description && <p className="text-xs text-gray-500 truncate mt-0.5">{t.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.uploadedBy?.name} · {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(t._id); }}
                        className="text-gray-400 hover:text-red-500 text-xs shrink-0 mt-0.5"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map viewer */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {!selected ? (
              <div className="flex items-center justify-center h-[480px] text-gray-400 text-sm">
                Select a track to view on map
              </div>
            ) : (
              <div className="h-[480px]">
                <MapContainer
                  center={center}
                  zoom={13}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {positions.length > 0 && (
                    <>
                      <Polyline positions={positions} color="#2563eb" weight={3} />
                      <FitBounds positions={positions} />
                    </>
                  )}
                </MapContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
