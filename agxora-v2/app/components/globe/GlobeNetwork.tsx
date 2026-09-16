"use client";

import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import {
  GLOBE_ARCS,
  GLOBE_HUBS,
  buildArcVertices,
  hubById,
  latLonToUnit,
} from "@/app/lib/globe/network";
import { getThemeDayBlend, lerp } from "@/app/lib/theme";

const HUB_NIGHT = new THREE.Color("#7ee7f7");
const HUB_DAY = new THREE.Color("#3d8eb8");
const ARC_NIGHT = new THREE.Color("#8fd7e8");
const ARC_DAY = new THREE.Color("#6a9bb0");
const GOLD_NIGHT = new THREE.Color("#e2c48a");
const GOLD_DAY = new THREE.Color("#b0894a");

export function GlobeNetwork({
  radius,
  compact,
}: {
  readonly radius: number;
  readonly compact: boolean;
}): JSX.Element {
  const reduceMotion = useReducedMotion();

  const resources = useMemo(() => {
    const sphere = new THREE.SphereGeometry(0.011, 10, 10);
    const material = new THREE.MeshBasicMaterial({
      color: HUB_NIGHT,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const meshes = GLOBE_HUBS.map((hub) => {
      const unit = latLonToUnit(hub.lat, hub.lon);
      const lift = radius * 1.012;
      const mesh = new THREE.Mesh(sphere, material);
      mesh.position.set(unit[0] * lift, unit[1] * lift, unit[2] * lift);
      mesh.scale.setScalar(0.85 + hub.weight * 0.5);
      mesh.frustumCulled = false;
      return mesh;
    });
    const segments = compact ? 16 : 28;
    const lines = GLOBE_ARCS.flatMap((arc, index) => {
      const fromHub = hubById(arc.from);
      const toHub = hubById(arc.to);
      if (!fromHub || !toHub) return [];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          buildArcVertices(
            latLonToUnit(fromHub.lat, fromHub.lon),
            latLonToUnit(toHub.lat, toHub.lon),
            radius,
            arc.altitude,
            segments,
          ),
          3,
        ),
      );
      const gold = index % 3 === 0;
      const lineMat = new THREE.LineBasicMaterial({
        color: gold ? GOLD_NIGHT : ARC_NIGHT,
        transparent: true,
        opacity: gold ? 0.4 : 0.26,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geometry, lineMat);
      line.frustumCulled = false;
      return [{ line, geometry, material: lineMat, gold }];
    });
    return { sphere, material, meshes, lines };
  }, [compact, radius]);

  useEffect(() => {
    return () => {
      resources.sphere.dispose();
      resources.material.dispose();
      for (const item of resources.lines) {
        item.geometry.dispose();
        item.material.dispose();
      }
    };
  }, [resources]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const blend = getThemeDayBlend();
    const pulse = reduceMotion ? 0 : Math.sin(t * 1.05) * 0.07;
    resources.material.opacity = lerp(0.78, 0.4, blend) + pulse;
    resources.material.color.copy(HUB_NIGHT).lerp(HUB_DAY, blend);
    for (const item of resources.lines) {
      const night = item.gold ? GOLD_NIGHT : ARC_NIGHT;
      const day = item.gold ? GOLD_DAY : ARC_DAY;
      item.material.color.copy(night).lerp(day, blend);
      item.material.opacity = lerp(
        item.gold ? 0.4 : 0.26,
        item.gold ? 0.16 : 0.1,
        blend,
      );
    }
  });

  return (
    <group>
      {resources.meshes.map((mesh, index) => (
        <primitive key={GLOBE_HUBS[index]?.id ?? index} object={mesh} />
      ))}
      {resources.lines.map((item, index) => (
        <primitive key={`arc-${index}`} object={item.line} />
      ))}
    </group>
  );
}
