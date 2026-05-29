export const parseGpx = (gpxText) => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, 'text/xml');
  const name =
    xml.querySelector('metadata > name')?.textContent?.trim() ||
    xml.querySelector('trk > name')?.textContent?.trim() ||
    'Route';
  const trkpts = Array.from(xml.querySelectorAll('trkpt'));
  const points = trkpts
    .map((pt) => ({
      lat: parseFloat(pt.getAttribute('lat')),
      lng: parseFloat(pt.getAttribute('lon')),
      ele: parseFloat(pt.querySelector('ele')?.textContent ?? 0),
    }))
    .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
  return { points, name };
};

const haversine = (a, b) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export const computeStats = (points) => {
  if (points.length < 2) return null;
  let distance = 0;
  let elevGain = 0;
  let elevLoss = 0;
  for (let i = 1; i < points.length; i++) {
    distance += haversine(points[i - 1], points[i]);
    const dEle = points[i].ele - points[i - 1].ele;
    if (dEle > 0) elevGain += dEle;
    else elevLoss += Math.abs(dEle);
  }
  const eles = points.map((p) => p.ele);
  return {
    distanceKm: distance,
    elevGain: Math.round(elevGain),
    elevLoss: Math.round(elevLoss),
    maxEle: Math.round(Math.max(...eles)),
    minEle: Math.round(Math.min(...eles)),
    totalPoints: points.length,
  };
};

export const samplePoints = (points, maxN = 500) => {
  if (points.length <= maxN) return points;
  const step = Math.ceil(points.length / maxN);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
};
