import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import GpxMap3D from '../../components/map/GpxMap3D.jsx';
import api from '../../services/api.js';
import { parseGpx, computeStats } from '../../utils/gpx.js';

const PALETTE = [
  '#ef4444','#3b82f6','#22c55e','#f59e0b',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
  '#f97316','#a855f7','#14b8a6','#eab308',
];

// ── Stat pill ─────────────────────────────────────────────────────────────────
const Stat = ({ label, value }) => (
  <div className="text-center bg-gray-50 rounded-xl py-2 px-1">
    <p className="text-xs font-bold text-gray-800 leading-tight">{value}</p>
    <p className="text-[9px] text-gray-400 mt-0.5">{label}</p>
  </div>
);

// ── File row ──────────────────────────────────────────────────────────────────
const FileItem = ({ file, index, selected, loading: isLoading, onToggle, onDelete }) => {
  const color = PALETTE[index % PALETTE.length];
  return (
    <div
      onClick={onToggle}
      className={`relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors select-none ${
        selected ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 rounded-lg bg-white/75 flex items-center justify-center">
          <span className="text-[10px] text-gray-400 animate-pulse">Loading…</span>
        </div>
      )}
      <input type="checkbox" checked={selected} onChange={onToggle}
        onClick={e => e.stopPropagation()}
        className="rounded accent-blue-600 shrink-0 cursor-pointer" />
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">
          {file.name || file.originalName}
        </p>
        <p className="text-[10px] text-gray-400 truncate">
          {file.uploadedBy?.name} · {new Date(file.createdAt).toLocaleDateString()}
        </p>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors p-0.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const GpxMapPage = () => {
  const [files,      setFiles]      = useState([]);
  const [selected,   setSelected]   = useState(new Set());
  const [routes,     setRoutes]     = useState([]);
  const [location,   setLocation]   = useState(null);
  const [tracking,   setTracking]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const [loadingId,  setLoadingId]  = useState(null);
  const [panelOpen,  setPanelOpen]  = useState(false); // mobile panel toggle

  const watchId     = useRef(null);
  const parsedCache = useRef(new Map());

  // Fetch library
  useEffect(() => {
    api.get('/gpx')
      .then(({ data }) => setFiles(data.data))
      .finally(() => setLoading(false));
  }, []);

  // Rebuild routes array from current selection
  const rebuildRoutes = useCallback((nextSel, currentFiles) => {
    const result = [];
    currentFiles.forEach((f, i) => {
      if (!nextSel.has(f._id)) return;
      const cached = parsedCache.current.get(f.filename);
      if (!cached) return;
      result.push({
        id: f._id, name: f.name || f.originalName || f.filename,
        color: PALETTE[i % PALETTE.length],
        points: cached.points, stats: computeStats(cached.points),
      });
    });
    setRoutes(result);
  }, []);

  // Toggle file selection
  const toggleFile = async (file, index) => {
    const next = new Set(selected);
    if (next.has(file._id)) {
      next.delete(file._id);
      setSelected(next);
      rebuildRoutes(next, files);
      return;
    }
    if (!parsedCache.current.has(file.filename)) {
      setLoadingId(file._id);
      try {
        const res  = await fetch(`/uploads/${file.filename}`);
        if (!res.ok) throw new Error('Could not load file');
        const text = await res.text();
        const parsed = parseGpx(text);
        if (!parsed.points.length) throw new Error('No track points');
        parsedCache.current.set(file.filename, parsed);
      } catch (err) {
        alert(`"${file.name || file.originalName}": ${err.message}`);
        setLoadingId(null);
        return;
      }
      setLoadingId(null);
    }
    next.add(file._id);
    setSelected(next);
    rebuildRoutes(next, files);
  };

  // Upload
  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gpx')) { alert('Please select a .gpx file'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('gpx', file);
      const { data } = await api.post('/gpx', form);
      setFiles(prev => [data.data, ...prev]);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Delete
  const deleteFile = async (fileId) => {
    if (!confirm('Delete this GPX file from the library?')) return;
    try {
      await api.delete(`/gpx/${fileId}`);
      const next = new Set(selected);
      next.delete(fileId);
      setSelected(next);
      setFiles(prev => {
        const updated = prev.filter(f => f._id !== fileId);
        rebuildRoutes(next, updated);
        return updated;
      });
    } catch (err) { alert(err.response?.data?.message ?? 'Delete failed'); }
  };

  // Location
  const startTracking = () => {
    if (!navigator.geolocation) { alert('Geolocation not available'); return; }
    watchId.current = navigator.geolocation.watchPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => stopTracking(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
    setTracking(true);
  };
  const stopTracking = () => {
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    setTracking(false);
    setLocation(null);
  };
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files[0]);
  }, []);

  // Combined stats across all selected routes
  const combined = routes.reduce(
    (a, r) => {
      if (!r.stats) return a;
      a.km  += r.stats.distanceKm;
      a.gain += r.stats.elevGain;
      a.loss += r.stats.elevLoss;
      if (r.stats.maxEle > a.max) a.max = r.stats.maxEle;
      return a;
    },
    { km: 0, gain: 0, loss: 0, max: 0 },
  );

  // ── Sidebar panel content ─────────────────────────────────────────────────
  const PanelContent = () => (
    <div className="flex flex-col gap-3 h-full">

      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => document.getElementById('gpx-lib-inp').click()}
        className={`card border-2 border-dashed text-center py-4 cursor-pointer transition-colors select-none shrink-0 ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
        }`}
      >
        {uploading ? (
          <p className="text-xs text-gray-400 animate-pulse">Uploading…</p>
        ) : (
          <>
            <svg className="w-6 h-6 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-xs font-semibold text-gray-600">{dragging ? 'Drop GPX here' : 'Upload GPX File'}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Click or drag & drop</p>
          </>
        )}
        <input id="gpx-lib-inp" type="file" accept=".gpx" className="hidden"
          onChange={e => { uploadFile(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {/* Library */}
      <div className="card p-3 flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Route Library</p>
          {selected.size > 0 && (
            <span className="text-[10px] text-blue-600 font-semibold">{selected.size} selected</span>
          )}
        </div>
        {loading && <p className="text-xs text-gray-400 animate-pulse py-2 text-center">Loading…</p>}
        {!loading && files.length === 0 && (
          <p className="text-xs text-gray-400 py-2 text-center">No GPX files yet — upload one above.</p>
        )}
        <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
          {files.map((f, i) => (
            <FileItem key={f._id} file={f} index={i}
              selected={selected.has(f._id)} loading={loadingId === f._id}
              onToggle={() => toggleFile(f, i)}
              onDelete={() => deleteFile(f._id)} />
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="card p-3 shrink-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">My Location</p>
        <button
          onClick={() => tracking ? stopTracking() : startTracking()}
          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
            tracking ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tracking ? '● Tracking active' : 'Start location tracking'}
        </button>
        {location && (
          <div className="mt-2 space-y-0.5">
            <p className="text-[11px] text-gray-600 font-mono">{location.lat.toFixed(5)}°N {location.lng.toFixed(5)}°E</p>
            <p className="text-[10px] text-gray-400">±{Math.round(location.accuracy)} m accuracy</p>
          </div>
        )}
      </div>

      {/* Selected route stats */}
      {routes.length > 0 && (
        <div className="card p-3 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {routes.length === 1 ? 'Route Stats' : `${routes.length} Routes — Combined`}
          </p>
          <div className="space-y-1.5 mb-3">
            {routes.map(r => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="w-5 h-1.5 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-[10px] text-gray-600 truncate flex-1">{r.name}</span>
                {r.stats && <span className="text-[10px] text-gray-400 shrink-0">{r.stats.distanceKm.toFixed(1)} km</span>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Stat label="Distance"    value={`${combined.km.toFixed(1)} km`} />
            <Stat label="Max Elev"    value={`${combined.max} m`} />
            <Stat label="↑ Gain"      value={`+${combined.gain} m`} />
            <Stat label="↓ Loss"      value={`−${combined.loss} m`} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout title="GPX Route Viewer">

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden flex items-center gap-2 mb-3">
        <button
          onClick={() => setPanelOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Routes {selected.size > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{selected.size}</span>}
          <span className="text-gray-400">{panelOpen ? '▲' : '▼'}</span>
        </button>
        {tracking && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Tracking
          </span>
        )}
      </div>

      {/* ── Mobile panel (collapsible) ── */}
      {panelOpen && (
        <div className="lg:hidden mb-3 max-h-72 overflow-y-auto">
          <PanelContent />
        </div>
      )}

      {/* ── Main layout: side-by-side on desktop, map-only on mobile ── */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 13.5rem)' }}>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex w-72 shrink-0 flex-col gap-3 overflow-y-auto pr-0.5">
          <PanelContent />
        </div>

        {/* Map */}
        <div className="flex-1 min-w-0 min-h-[300px]">
          <GpxMap3D routes={routes} userLocation={location} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GpxMapPage;
