import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout.jsx";
import api from "../../services/api.js";

// ── GPX parser ────────────────────────────────────────────────────────────────
function parseGpx(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  let nodes = Array.from(doc.getElementsByTagName("trkpt"));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagName("rtept"));

  const points = nodes.map((pt) => ({
    lat: +pt.getAttribute("lat"),
    lon: +pt.getAttribute("lon"),
    ele: pt.getElementsByTagName("ele")[0] ? +pt.getElementsByTagName("ele")[0].textContent : null,
    time: pt.getElementsByTagName("time")[0] ? new Date(pt.getElementsByTagName("time")[0].textContent) : null,
  }));
  return points;
}

// ── Stats calculator ──────────────────────────────────────────────────────────
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000; // metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcStats(points) {
  if (points.length < 2) return null;
  let distance = 0;
  let elevGain = 0;
  let elevLoss = 0;
  const eles = points.map((p) => p.ele).filter((e) => e !== null);

  for (let i = 1; i < points.length; i++) {
    distance += haversine(
      [points[i - 1].lat, points[i - 1].lon],
      [points[i].lat, points[i].lon]
    );
    if (eles.length === points.length) {
      const diff = points[i].ele - points[i - 1].ele;
      if (diff > 0) elevGain += diff;
      else elevLoss += Math.abs(diff);
    }
  }

  const hasEle = eles.length > 0;
  const hasTime = points[0].time && points[points.length - 1].time;
  const durationMs = hasTime
    ? points[points.length - 1].time - points[0].time
    : null;

  // Speed (requires timestamps)
  let maxSpeed = 0;
  if (points[0].time) {
    for (let i = 1; i < points.length; i++) {
      const d = haversine([points[i-1].lat, points[i-1].lon], [points[i].lat, points[i].lon]);
      const dt = (points[i].time - points[i-1].time) / 1000; // seconds
      if (dt > 0) {
        const spd = (d / dt) * 3.6; // km/h
        if (spd > maxSpeed) maxSpeed = spd;
      }
    }
  }

  const avgSpeedKmh = durationMs && distance > 0
    ? (distance / 1000) / (durationMs / 3600000)
    : null;

  // Calories: MET≈8 for running, assume 70 kg avg weight
  const calories = durationMs
    ? Math.round(8 * 70 * (durationMs / 3600000))
    : Math.round((distance / 1000) * 60); // fallback: ~60 kcal/km

  return {
    distance,
    elevGain: hasEle ? elevGain : null,
    elevLoss: hasEle ? elevLoss : null,
    minEle: hasEle ? Math.min(...eles) : null,
    maxEle: hasEle ? Math.max(...eles) : null,
    durationMs,
    pointCount: points.length,
    avgSpeedKmh,
    maxSpeedKmh: maxSpeed > 0 ? maxSpeed : null,
    calories,
  };
}

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtEle(m) {
  return m !== null ? `${Math.round(m)} m` : "—";
}
function fmtDuration(ms) {
  if (!ms) return "—";
  const h = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return h > 0 ? `${h}h ${min}m` : `${min}m ${sec}s`;
}

// ── Map component (plain Leaflet, no react-leaflet) ───────────────────────────
function TrackMap({ points }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const draw = useCallback((map, L, pts) => {
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    if (pts.length === 0) return;

    const latlngs = pts.map((p) => [p.lat, p.lon]);

    // Track line
    const line = L.polyline(latlngs, { color: "#2563eb", weight: 4, opacity: 1 }).addTo(map);
    layersRef.current.push(line);

    // Total distance to pick checkpoint interval
    let totalDist = 0;
    for (let i = 1; i < pts.length; i++)
      totalDist += haversine([pts[i-1].lat, pts[i-1].lon], [pts[i].lat, pts[i].lon]);
    const intervalM = totalDist >= 20000 ? 5000 : 1000; // 5 km or 1 km

    // Checkpoint markers at each interval
    let accumulated = 0;
    let nextCheckpoint = intervalM;
    for (let i = 1; i < pts.length; i++) {
      const seg = haversine([pts[i-1].lat, pts[i-1].lon], [pts[i].lat, pts[i].lon]);
      accumulated += seg;
      if (accumulated >= nextCheckpoint) {
        const km = nextCheckpoint / 1000;
        const cpIcon = L.divIcon({
          className: "",
          html: `<div style="background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)">${km % 1 === 0 ? km + ' km' : km.toFixed(1) + ' km'}</div>`,
          iconAnchor: [18, 9],
        });
        const m = L.marker([pts[i].lat, pts[i].lon], { icon: cpIcon }).addTo(map);
        layersRef.current.push(m);
        nextCheckpoint += intervalM;
      }
    }

    // Start marker (green)
    const startIcon = L.divIcon({
      className: "",
      html: `<div style="background:#16a34a;color:#fff;font-size:11px;font-weight:700;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">START</div>`,
      iconAnchor: [20, 10],
    });
    layersRef.current.push(L.marker(latlngs[0], { icon: startIcon }).addTo(map));

    // Finish marker (red)
    const finishIcon = L.divIcon({
      className: "",
      html: `<div style="background:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">FINISH</div>`,
      iconAnchor: [23, 10],
    });
    layersRef.current.push(L.marker(latlngs[latlngs.length - 1], { icon: finishIcon }).addTo(map));

    map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;
    import("leaflet").then((mod) => {
      if (destroyed) return;
      const L = mod.default;
      import("leaflet/dist/leaflet.css");
      const map = L.map(containerRef.current).setView([27.7172, 85.324], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = { map, L };
      draw(map, L, pointsRef.current);
    });
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.map.remove(); mapRef.current = null; }
    };
  }, [draw]);

  useEffect(() => {
    if (!mapRef.current) return;
    draw(mapRef.current.map, mapRef.current.L, points);
  }, [points, draw]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

// ── Stats panel ───────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GpxPage() {
  const [tracks, setTracks]       = useState([]);
  const [selected, setSelected]   = useState(null);
  const [points, setPoints]       = useState([]);
  const [stats, setStats]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [title, setTitle]         = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile]           = useState(null);
  const fileRef = useRef();

  const fetchTracks = useCallback(async () => {
    try {
      const { data } = await api.get("/gpx");
      setTracks(data.data);
    } catch {
      setError("Failed to load tracks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  useEffect(() => {
    if (!selected) return;
    setPoints([]);
    setStats(null);
    setError("");
    const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "");
    fetch(`${base}${selected.url}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("managex_token")}` },
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((text) => {
        const pts = parseGpx(text);
        if (pts.length === 0) throw new Error("No track points found in GPX");
        setPoints(pts);
        setStats(calcStats(pts));
      })
      .catch((err) => setError(`Failed to load GPX: ${err.message}`));
  }, [selected]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      if (description) fd.append("description", description);
      const { data } = await api.post("/gpx", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTracks((prev) => [data.data, ...prev]);
      setTitle(""); setDescription(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this track?")) return;
    try {
      await api.delete(`/gpx/${id}`);
      setTracks((prev) => prev.filter((t) => t._id !== id));
      if (selected?._id === id) { setSelected(null); setPoints([]); setStats(null); }
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

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
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Track title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">GPX File</label>
              <input ref={fileRef} type="file" accept=".gpx"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="text-sm text-gray-600" />
            </div>
            <button type="submit" disabled={!file || uploading}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {uploading ? "Uploading…" : "Upload"}
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
              <ul className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                {tracks.map((t) => (
                  <li key={t._id} onClick={() => setSelected(t)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?._id === t._id ? "bg-brand-50 border-l-2 border-brand-500" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                        {t.description && <p className="text-xs text-gray-500 truncate mt-0.5">{t.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.uploadedBy?.name} · {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}
                        className="text-gray-400 hover:text-red-500 text-xs shrink-0 mt-0.5" title="Delete">
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map + stats */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div style={{ height: "420px" }}>
                {!selected ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Select a track to view on map
                  </div>
                ) : (
                  <TrackMap key={selected._id} points={points} />
                )}
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Track Stats</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatCard label="Distance" value={fmtDist(stats.distance)} />
                  <StatCard label="Duration" value={fmtDuration(stats.durationMs)} />
                  <StatCard label="Avg Speed" value={stats.avgSpeedKmh ? `${stats.avgSpeedKmh.toFixed(1)} km/h` : "—"} />
                  <StatCard label="Max Speed" value={stats.maxSpeedKmh ? `${stats.maxSpeedKmh.toFixed(1)} km/h` : "—"} />
                  <StatCard label="Elev. Gain" value={fmtEle(stats.elevGain)} />
                  <StatCard label="Elev. Loss" value={fmtEle(stats.elevLoss)} />
                  <StatCard label="Min Elevation" value={fmtEle(stats.minEle)} />
                  <StatCard label="Max Elevation" value={fmtEle(stats.maxEle)} />
                  {stats.durationMs && (
                    <StatCard label="Avg Pace" value={fmtDuration((stats.durationMs / stats.distance) * 1000) + "/km"} />
                  )}
                  <StatCard label="Calories" value={`~${stats.calories.toLocaleString()} kcal`} />
                  <StatCard label="Track Points" value={stats.pointCount.toLocaleString()} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
