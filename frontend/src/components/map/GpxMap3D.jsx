import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TERRAIN_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// Free base map styles — no API key required
const STYLES = {
  street: 'https://tiles.openfreemap.org/styles/liberty',
  satellite: {
    version: 8,
    sources: {
      sat: {
        type:        'raster',
        tiles:       ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize:    256,
        maxzoom:     19,
        attribution: '&copy; Esri &mdash; Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS',
      },
    },
    layers: [{ id: 'sat', type: 'raster', source: 'sat', minzoom: 0, maxzoom: 22 }],
  },
};

const injectCSS = () => {
  if (document.getElementById('gpx-map-css')) return;
  const s = document.createElement('style');
  s.id = 'gpx-map-css';
  s.textContent = `
    @keyframes gpx-pulse {
      0%   { box-shadow: 0 0 0 0   rgba(59,130,246,0.75); }
      70%  { box-shadow: 0 0 0 12px rgba(59,130,246,0);   }
      100% { box-shadow: 0 0 0 0   rgba(59,130,246,0);    }
    }
    .gpx-loc-dot {
      width:20px; height:20px; border-radius:50%;
      background:#3b82f6; border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.4);
      animation:gpx-pulse 2s ease-in-out infinite;
    }
    .maplibregl-ctrl-attrib { font-size:9px !important; }
  `;
  document.head.appendChild(s);
};

const GpxMap3D = ({ routes = [], userLocation = null }) => {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);
  const initialized    = useRef(false);
  const activeIds      = useRef(new Set());
  const locMarker      = useRef(null);

  // State that lives inside the map component
  const [mapReady,     setMapReady]     = useState(false);
  const [styleKey,     setStyleKey]     = useState('street');
  const [is3D,         setIs3D]         = useState(true);
  const [terrainOn,    setTerrainOn]    = useState(true);
  const [exaggeration, setExaggeration] = useState(1.5);

  // Refs that mirror state/props for use inside closures
  const routesRef       = useRef(routes);
  const terrainOnRef    = useRef(terrainOn);
  const exaggerationRef = useRef(exaggeration);

  useEffect(() => { routesRef.current = routes; },       [routes]);
  useEffect(() => { terrainOnRef.current = terrainOn; }, [terrainOn]);
  useEffect(() => { exaggerationRef.current = exaggeration; }, [exaggeration]);

  // ── Shared: add terrain + all current routes to map ────────────────────────
  const applyLayers = useCallback((map) => {
    // Terrain DEM
    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem', tiles: [TERRAIN_URL],
        tileSize: 256, maxzoom: 14, encoding: 'terrarium',
      });
    }
    try {
      if (terrainOnRef.current) {
        map.setTerrain({ source: 'terrain-dem', exaggeration: exaggerationRef.current });
      }
    } catch (_) {}

    // Routes
    const current = routesRef.current;
    current.forEach(route => {
      const srcId  = `rs-${route.id}`;
      const coords = route.points.map(p => [p.lng, p.lat]);
      if (coords.length < 2 || map.getSource(srcId)) return;

      map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
      map.addLayer({ id: `rl-glow-${route.id}`, type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': route.color, 'line-width': 12, 'line-opacity': 0.18, 'line-blur': 5 } });
      map.addLayer({ id: `rl-line-${route.id}`, type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': route.color, 'line-width': 4,  'line-opacity': 0.92 } });

      const addDot = (sid, coord, color) => {
        if (map.getSource(sid)) return;
        map.addSource(sid, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: coord } } });
        map.addLayer({ id: `${sid}-dot`, type: 'circle', source: sid, paint: { 'circle-radius': 7, 'circle-color': color, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff' } });
      };
      addDot(`rs-start-${route.id}`, coords[0],              '#22c55e');
      addDot(`rs-end-${route.id}`,   coords[coords.length-1],'#ef4444');
    });

    activeIds.current = new Set(current.map(r => r.id));
  }, []);

  // ── Map init (once) ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    injectCSS();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     STYLES.street,
      center:    [85.3, 27.7],
      zoom:      7, pitch: 60, bearing: -15,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-right');

    map.on('load', () => {
      applyLayers(map);
      mapRef.current  = map;
      initialized.current = true;
      setMapReady(true);
    });

    return () => { map.remove(); mapRef.current = null; initialized.current = false; setMapReady(false); };
  }, [applyLayers]);

  // ── Base map / satellite switch ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialized.current) return;

    activeIds.current.clear();
    locMarker.current?.remove();
    locMarker.current = null;
    setMapReady(false);

    map.setStyle(STYLES[styleKey]);

    const onLoad = () => {
      applyLayers(map);
      // Re-add location marker if tracking
      if (userLocation) {
        const el = document.createElement('div');
        el.className = 'gpx-loc-dot';
        locMarker.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);
      }
      setMapReady(true);
    };

    // 'styledata' fires when the new style has been applied
    map.once('styledata', () => {
      // Wait one more tick for all sources to be ready
      map.once('idle', onLoad);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey, applyLayers]);

  // ── Routes (add / remove as selection changes) ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const newIds = new Set(routes.map(r => r.id));

    // Remove deselected
    activeIds.current.forEach(id => {
      if (newIds.has(id)) return;
      [`rl-glow-${id}`, `rl-line-${id}`, `rs-start-${id}-dot`, `rs-end-${id}-dot`].forEach(l => { if (map.getLayer(l)) map.removeLayer(l); });
      [`rs-${id}`, `rs-start-${id}`, `rs-end-${id}`].forEach(s => { if (map.getSource(s)) map.removeSource(s); });
    });

    const bounds = new maplibregl.LngLatBounds();
    let hasAny = false;

    routes.forEach(route => {
      const srcId  = `rs-${route.id}`;
      const coords = route.points.map(p => [p.lng, p.lat]);
      if (coords.length < 2) return;

      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
        map.addLayer({ id: `rl-glow-${route.id}`, type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': route.color, 'line-width': 12, 'line-opacity': 0.18, 'line-blur': 5 } });
        map.addLayer({ id: `rl-line-${route.id}`, type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': route.color, 'line-width': 4, 'line-opacity': 0.92 } });

        const addDot = (sid, coord, color) => {
          if (map.getSource(sid)) return;
          map.addSource(sid, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: coord } } });
          map.addLayer({ id: `${sid}-dot`, type: 'circle', source: sid, paint: { 'circle-radius': 7, 'circle-color': color, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff' } });
        };
        addDot(`rs-start-${route.id}`, coords[0],              '#22c55e');
        addDot(`rs-end-${route.id}`,   coords[coords.length-1],'#ef4444');
      }

      coords.forEach(c => { bounds.extend(c); hasAny = true; });
    });

    activeIds.current = newIds;
    if (hasAny && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1200 });
    }
  }, [routes, mapReady]);

  // ── 3D / pitch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, bearing: is3D ? -15 : 0, duration: 700 });
  }, [is3D]);

  // ── Terrain + exaggeration ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    try {
      terrainOnRef.current = terrainOn;
      exaggerationRef.current = exaggeration;
      if (terrainOn) map.setTerrain({ source: 'terrain-dem', exaggeration });
      else           map.setTerrain(null);
    } catch (_) {}
  }, [terrainOn, exaggeration, mapReady]);

  // ── Location marker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (userLocation) {
      const { lat, lng } = userLocation;
      if (!locMarker.current) {
        const el = document.createElement('div');
        el.className = 'gpx-loc-dot';
        locMarker.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat]).addTo(map);
      } else {
        locMarker.current.setLngLat([lng, lat]);
      }
    } else {
      locMarker.current?.remove();
      locMarker.current = null;
    }
  }, [userLocation, mapReady]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Style switch: Street / Satellite */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">

        {/* Basemap */}
        <div className="flex rounded-lg overflow-hidden shadow-lg border border-gray-200/80 backdrop-blur-sm">
          {[['street', 'Street'], ['satellite', '🛰 Satellite']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStyleKey(key)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                styleKey === key
                  ? 'bg-gray-900/90 text-white'
                  : 'bg-white/90 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 3D toggle */}
        <button
          onClick={() => setIs3D(v => !v)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm border transition-all ${
            is3D ? 'bg-gray-900/90 text-white border-gray-700' : 'bg-white/90 text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {is3D ? '3D' : '2D'}
        </button>

        {/* Terrain toggle */}
        <button
          onClick={() => setTerrainOn(v => !v)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm border transition-all ${
            terrainOn ? 'bg-emerald-700/90 text-white border-emerald-600' : 'bg-white/90 text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          ⛰ Terrain
        </button>

        {/* Exaggeration slider */}
        {terrainOn && (
          <div className="hidden sm:flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-gray-200">
            <span className="text-[11px] font-semibold text-gray-600 whitespace-nowrap">{exaggeration.toFixed(1)}×</span>
            <input type="range" min="1" max="4" step="0.1" value={exaggeration}
              onChange={e => setExaggeration(Number(e.target.value))}
              className="w-16 accent-emerald-600 cursor-pointer" />
          </div>
        )}
      </div>

      {/* Switching overlay */}
      {!mapReady && initialized.current && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white rounded-xl px-5 py-3 shadow-2xl text-sm font-medium text-gray-700 animate-pulse">
            Switching map…
          </div>
        </div>
      )}

      {/* Empty state */}
      {routes.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
          <div className="bg-white/85 backdrop-blur-md rounded-2xl px-6 py-4 shadow-xl text-center max-w-xs">
            <p className="text-sm font-semibold text-gray-700">Select routes from the panel</p>
            <p className="text-xs text-gray-400 mt-1">Uploaded GPX files appear in the route library</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-10 left-3 z-10 bg-white/85 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 shrink-0" /> Start</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0" /> End</span>
        {userLocation && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" /> You</span>}
      </div>
    </div>
  );
};

export default GpxMap3D;
