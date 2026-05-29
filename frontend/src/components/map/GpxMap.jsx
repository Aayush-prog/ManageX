import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { samplePoints } from '../../utils/gpx.js';

const makeIcon = (color) =>
  L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.55)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const startIcon = makeIcon('#22c55e');
const endIcon   = makeIcon('#ef4444');

const TILES = [
  {
    key: 'street',
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    key: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
  },
  {
    key: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
];

const FitRoute = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [30, 30] });
    }
  }, [map, positions]);
  return null;
};

const ElevationProfile = ({ points }) => {
  if (!points || points.length < 2) return null;
  const sampled = samplePoints(points, 400);
  const eles    = sampled.map((p) => p.ele);
  const minE    = Math.min(...eles);
  const maxE    = Math.max(...eles);
  const range   = maxE - minE || 1;
  const W = 1000, H = 110;
  const pad = { t: 10, r: 6, b: 28, l: 48 };
  const iW  = W - pad.l - pad.r;
  const iH  = H - pad.t - pad.b;

  const coords = sampled.map((p, i) => {
    const x = pad.l + (i / (sampled.length - 1)) * iW;
    const y = pad.t + iH - ((p.ele - minE) / range) * iH;
    return [x, y];
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} L${(pad.l + iW).toFixed(1)},${(pad.t + iH).toFixed(1)} L${pad.l.toFixed(1)},${(pad.t + iH).toFixed(1)} Z`;

  const yTicks = [minE, minE + range * 0.5, maxE];

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-gray-500 mb-1">Elevation Profile</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
        <defs>
          <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => {
          const y = pad.t + iH - ((t - minE) / range) * iH;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + iW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
              <text x={pad.l - 5} y={y + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{Math.round(t)}m</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#eGrad)" />
        <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
        <text x={pad.l}        y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">Start</text>
        <text x={pad.l + iW}   y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">End</text>
      </svg>
    </div>
  );
};

const GpxMap = ({ points, height = '450px', showElevation = true }) => {
  const [tileIdx, setTileIdx] = useState(0);

  if (!points || points.length === 0) return null;

  const positions = points.map((p) => [p.lat, p.lng]);
  const tile      = TILES[tileIdx];

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden" style={{ height }}>
        {/* Tile layer toggle */}
        <div className="absolute top-3 right-12 z-[1000] flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-1 py-1">
          {TILES.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTileIdx(i)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                tileIdx === i ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <MapContainer center={positions[0]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer key={tile.key} url={tile.url} attribution={tile.attribution} maxZoom={18} />
          <FitRoute positions={positions} />
          <Polyline
            positions={positions}
            color="#ef4444"
            weight={4}
            opacity={0.85}
            lineJoin="round"
            lineCap="round"
          />
          <Marker position={positions[0]}                    icon={startIcon} />
          <Marker position={positions[positions.length - 1]} icon={endIcon}   />
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0" /> Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block shrink-0" /> End
          </span>
        </div>
      </div>

      {showElevation && <ElevationProfile points={points} />}
    </div>
  );
};

export default GpxMap;
