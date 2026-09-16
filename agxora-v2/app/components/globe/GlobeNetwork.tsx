"use client";

import { useEffect, useMemo, useRef, type JSX } from "react";
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

type ArcResource = {
  readonly key: string;
  readonly gold: boolean;
  readonly positions: Float32Array;
};

export function GlobeNetwork({
  radius,
  compact,
}: {
  readonly radius: number;
  readonly compact: boolean;
}): JSX.Element {
  const reduceMotion = useReducedMotion();
  const hubMat = useRef<THREE.MeshBasicMaterial>(null);
  const arcMats = useRef<Array<THREE.LineBasicMaterial | null>>([]);

  const hubs = useMemo(
    () =>
      GLOBE_HUBS.map((hub) => {
        const unit = latLonToUnit(hub.lat, hub.lon);
        const lift = radius * 1.012;
        return {
          id: hub.id,
          position: [unit[0] * lift, unit[1] * lift, unit[2] * lift] as const,
          scale: 0.85 + hub.weight * 0.5,
        };
      }),
    [radius],
  );

  const arcs = useMemo<readonly ArcResource[]>(() => {
    const segments = compact ? 16 : 28;
    return GLOBE_ARCS.flatMap((arc, index) => {
      const fromHub = hubById(arc.from);
      const toHub = hubById(arc.to);
      if (!fromHub || !toHub) return [];
      return [
        {
          key: `${arc.from}-${arc.to}`,
          gold: index % 3 === 0,
          positions: buildArcVertices(
            latLonToUnit(fromHub.lat, fromHub.lon),
            latLonToUnit(toHub.lat, toHub.lon),
            radius,
            arc.altitude,
            segments,
          ),
        },
      ];
    });
  }, [compact, radius]);

  useEffect(() => {
    arcMats.current = arcMats.current.slice(0, arcs.length);
  }, [arcs.length]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const blend = getThemeDayBlend();
    const pulse = reduceMotion ? 0 : Math.sin(t * 1.05) * 0.07;
    if (hubMat.current) {
      hubMat.current.opacity = lerp(0.78, 0.4, blend) + pulse;
      hubMat.current.color.copy(HUB_NIGHT).lerp(HUB_DAY, blend);
    }
    for (let i = 0; i < arcs.length; i += 1) {
      const mat = arcMats.current[i];
      const arc = arcs[i];
      if (!mat || !arc) continue;
      const night = arc.gold ? GOLD_NIGHT : ARC_NIGHT;
      const day = arc.gold ? GOLD_DAY : ARC_DAY;
      mat.color.copy(night).lerp(day, blend);
      mat.opacity = lerp(arc.gold ? 0.4 : 0.26, arc.gold ? 0.16 : 0.1, blend);
    }
  });

  return (
    <group>
      {hubs.map((hub) => (
        <mesh key={hub.id} position={hub.position} scale={hub.scale}>
          <sphereGeometry args={[0.011, 10, 10]} />
          <meshBasicMaterial
            ref={hub.id === hubs[0]?.id ? hubMat : undefined}
            color={HUB_NIGHT}
            transparent
            opacity={0.72}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {arcs.map((arc, index) => (
        <NetworkArc
          key={arc.key}
          positions={arc.positions}
          gold={arc.gold}
          materialRef={(material) => {
            arcMats.current[index] = material;
          }}
        />
      ))}
    </group>
  );
}

function NetworkArc({
  positions,
  gold,
  materialRef,
}: {
  readonly positions: Float32Array;
  readonly gold: boolean;
  readonly materialRef: (material: THREE.LineBasicMaterial | null) => void;
}): JSX.Element {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial
        ref={materialRef}
        color={gold ? GOLD_NIGHT : ARC_NIGHT}
        transparent
        opacity={gold ? 0.4 : 0.26}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </line>
  );
}
