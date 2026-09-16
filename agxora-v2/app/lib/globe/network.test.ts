import { describe, expect, it } from "vitest";
import {
  GLOBE_ARCS,
  GLOBE_HUBS,
  buildArcVertices,
  hubById,
  latLonToUnit,
} from "./network";

describe("globe network", () => {
  it("keeps a sparse curated hub set", () => {
    expect(GLOBE_HUBS.length).toBeGreaterThanOrEqual(8);
    expect(GLOBE_HUBS.length).toBeLessThanOrEqual(16);
    expect(GLOBE_ARCS.length).toBeLessThanOrEqual(14);
    expect(new Set(GLOBE_HUBS.map((hub) => hub.id)).size).toBe(GLOBE_HUBS.length);
  });

  it("resolves every arc endpoint", () => {
    for (const arc of GLOBE_ARCS) {
      expect(hubById(arc.from)).toBeTruthy();
      expect(hubById(arc.to)).toBeTruthy();
    }
  });

  it("maps lat/lon onto the unit sphere used by the Earth textures", () => {
    const [x, y, z] = latLonToUnit(0, 0);
    expect(x).toBeCloseTo(1, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(0, 5);
    const north = latLonToUnit(90, 0);
    expect(north[1]).toBeCloseTo(1, 5);
    const length = Math.hypot(...latLonToUnit(51.5, -0.13));
    expect(length).toBeCloseTo(1, 5);
  });

  it("builds lifted great-circle arcs that stay outside the planet radius", () => {
    const from = latLonToUnit(40.7, -74);
    const to = latLonToUnit(51.5, -0.13);
    const points = buildArcVertices(from, to, 1, 0.22, 24);
    expect(points.length).toBe(25 * 3);
    const midX = points[12 * 3];
    const midY = points[12 * 3 + 1];
    const midZ = points[12 * 3 + 2];
    expect(Math.hypot(midX, midY, midZ)).toBeGreaterThan(1.1);
  });
});
