/**
 * Curated global-intelligence network for the dashboard globe.
 * Positions use the same lat/lon convention as the procedural Earth maps.
 */

export type GlobeHub = {
  readonly id: string;
  readonly lat: number;
  readonly lon: number;
  readonly weight: number;
};

export type GlobeArc = {
  readonly from: string;
  readonly to: string;
  readonly altitude: number;
};

export const GLOBE_HUBS: readonly GlobeHub[] = [
  { id: "nyc", lat: 40.7, lon: -74.0, weight: 1 },
  { id: "sfo", lat: 37.8, lon: -122.4, weight: 0.86 },
  { id: "mex", lat: 19.4, lon: -99.1, weight: 0.62 },
  { id: "sao", lat: -23.55, lon: -46.63, weight: 0.78 },
  { id: "lon", lat: 51.5, lon: -0.13, weight: 1 },
  { id: "fra", lat: 50.11, lon: 8.68, weight: 0.92 },
  { id: "jnb", lat: -26.2, lon: 28.05, weight: 0.7 },
  { id: "dxb", lat: 25.2, lon: 55.27, weight: 0.88 },
  { id: "bom", lat: 19.08, lon: 72.88, weight: 0.8 },
  { id: "sin", lat: 1.29, lon: 103.85, weight: 0.9 },
  { id: "tyo", lat: 35.68, lon: 139.69, weight: 0.96 },
  { id: "syd", lat: -33.87, lon: 151.21, weight: 0.72 },
];

/** Sparse routes — global business intelligence, not a mesh of spaghetti. */
export const GLOBE_ARCS: readonly GlobeArc[] = [
  { from: "nyc", to: "lon", altitude: 0.22 },
  { from: "lon", to: "fra", altitude: 0.1 },
  { from: "fra", to: "dxb", altitude: 0.2 },
  { from: "dxb", to: "sin", altitude: 0.22 },
  { from: "sin", to: "tyo", altitude: 0.18 },
  { from: "tyo", to: "syd", altitude: 0.2 },
  { from: "nyc", to: "sao", altitude: 0.24 },
  { from: "lon", to: "jnb", altitude: 0.26 },
  { from: "sfo", to: "tyo", altitude: 0.28 },
  { from: "fra", to: "bom", altitude: 0.2 },
  { from: "nyc", to: "sfo", altitude: 0.14 },
];

export function latLonToUnit(
  lat: number,
  lon: number,
): readonly [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    cosLat * Math.sin(lonRad),
  ];
}

export function hubById(id: string): GlobeHub | undefined {
  return GLOBE_HUBS.find((hub) => hub.id === id);
}

export function buildArcVertices(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  altitude: number,
  segments: number,
): Float32Array {
  const safeSegments = Math.max(4, segments);
  const points = new Float32Array((safeSegments + 1) * 3);
  const dot = Math.min(
    1,
    Math.max(-1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2]),
  );
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega) || 1e-6;

  for (let i = 0; i <= safeSegments; i += 1) {
    const t = i / safeSegments;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    const x = from[0] * a + to[0] * b;
    const y = from[1] * a + to[1] * b;
    const z = from[2] * a + to[2] * b;
    const len = Math.hypot(x, y, z) || 1;
    const lift = Math.sin(t * Math.PI) * altitude;
    const r = radius + lift;
    const offset = i * 3;
    points[offset] = (x / len) * r;
    points[offset + 1] = (y / len) * r;
    points[offset + 2] = (z / len) * r;
  }
  return points;
}
