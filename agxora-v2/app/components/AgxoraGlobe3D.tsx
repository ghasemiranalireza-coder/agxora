"use client";

/**
 * AgxoraGlobe3D — asset-free cinematic globe.
 *
 * Built from scratch with zero external files: no /public/textures,
 * no /public/hdr. Lighting comes from drei's built-in "night"
 * Environment preset and two scene lights; the Earth is a procedural
 * MeshPhysicalMaterial ocean sphere with a fresnel atmosphere shell.
 */

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

const GLOBE_RADIUS = 1;
const SPIN_SPEED = 0.02;
const CAMERA_DISTANCE = 4.4;
const LOOK_TARGET = new THREE.Vector3(0, -0.22, 0);

const OCEAN_BLUE = "#0c4a8b";
const ATMOSPHERE_BLUE = "#78b4e8";
const GLOW_BLUE = "#0d2b52";

/* ------------------------------------------------------------------ */
/* Viewport hook                                                       */
/* ------------------------------------------------------------------ */

function useCompactViewport(): boolean {
  const [compact, setCompact] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const sync = (): void => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return compact;
}

/* ------------------------------------------------------------------ */
/* Procedural ocean planet                                             */
/* ------------------------------------------------------------------ */

interface OceanPlanetProps {
  readonly segments: number;
}

function OceanPlanet({ segments }: OceanPlanetProps): JSX.Element {
  const planetRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const planet = planetRef.current;
    if (planet !== null) {
      planet.rotation.y += delta * SPIN_SPEED;
    }
  });

  return (
    <mesh ref={planetRef} rotation={[0.1, -0.9, 0.04]}>
      <sphereGeometry args={[GLOBE_RADIUS, segments, segments]} />
      <meshPhysicalMaterial
        color={OCEAN_BLUE}
        roughness={0.28}
        metalness={0}
        clearcoat={0.7}
        clearcoatRoughness={0.3}
        emissive={GLOW_BLUE}
        emissiveIntensity={0.4}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Fresnel atmosphere shell                                            */
/* ------------------------------------------------------------------ */

const HALO_VERTEX_SHADER = /* glsl */ `
  varying float vRim;

  void main() {
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 toCamera = normalize(cameraPosition - worldPos.xyz);
    vRim = 1.0 - abs(dot(worldNormal, toCamera));
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const HALO_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 haloColor;
  uniform float haloStrength;
  uniform float haloExponent;

  varying float vRim;

  void main() {
    float rim = pow(clamp(vRim, 0.0, 1.0), haloExponent);
    float edgeFade = smoothstep(1.0, 0.7, vRim);
    float alpha = rim * edgeFade * haloStrength;
    gl_FragColor = vec4(haloColor * alpha, alpha);
  }
`;

function AtmosphereHalo(): JSX.Element {
  const haloMaterial = useMemo<THREE.ShaderMaterial>(() => {
    return new THREE.ShaderMaterial({
      vertexShader: HALO_VERTEX_SHADER,
      fragmentShader: HALO_FRAGMENT_SHADER,
      uniforms: {
        haloColor: { value: new THREE.Color(ATMOSPHERE_BLUE) },
        haloStrength: { value: 0.75 },
        haloExponent: { value: 5.5 },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useEffect(() => {
    return () => haloMaterial.dispose();
  }, [haloMaterial]);

  return (
    <mesh scale={1.035}>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <primitive object={haloMaterial} attach="material" />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Slow cinematic drift                                                */
/* ------------------------------------------------------------------ */

interface DriftCameraProps {
  readonly parallax: boolean;
}

function DriftCamera({ parallax }: DriftCameraProps): null {
  useFrame(({ camera, clock, pointer }, delta) => {
    const t = clock.elapsedTime;

    const orbit = Math.sin(t * 0.015) * 0.5;
    const bob = 0.4 + Math.sin(t * 0.03) * 0.05;
    const px = parallax ? pointer.x * 0.15 : 0;
    const py = parallax ? pointer.y * 0.08 : 0;

    const ease = 1 - Math.exp(-delta * 1.2);
    camera.position.x += (orbit + px - camera.position.x) * ease;
    camera.position.y += (bob + py - camera.position.y) * ease;
    camera.position.z += (CAMERA_DISTANCE - camera.position.z) * ease;
    camera.lookAt(LOOK_TARGET);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

interface GlobeSceneProps {
  readonly compact: boolean;
}

function GlobeScene({ compact }: GlobeSceneProps): JSX.Element {
  return (
    <>
      <color attach="background" args={["#020409"]} />

      {/* Built-in HDR preset — no local files required */}
      <Environment preset="night" />

      <directionalLight position={[5, 3, 4]} intensity={2.6} color="#ffffff" />
      <directionalLight
        position={[-5, -2, -4]}
        intensity={0.3}
        color="#4f83e8"
      />
      <ambientLight intensity={0.06} />

      {/* Procedural starfield from drei — generated at runtime */}
      <Stars
        radius={60}
        depth={80}
        count={compact ? 4000 : 9000}
        factor={3.2}
        saturation={0.15}
        fade
        speed={0.4}
      />

      <OceanPlanet segments={compact ? 48 : 80} />
      <AtmosphereHalo />
      <DriftCamera parallax={!compact} />

      <EffectComposer multisampling={compact ? 0 : 4}>
        <Bloom
          intensity={compact ? 0.25 : 0.35}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exported component                                                  */
/* ------------------------------------------------------------------ */

const shellStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "clamp(340px, 60vh, 560px)",
  borderRadius: "24px",
  overflow: "hidden",
  background: "radial-gradient(circle at 50% 45%, #071226 0%, #020409 70%)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
};

const badgeStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "32px",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "13px 30px",
  borderRadius: "999px",
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(18px) saturate(140%)",
  WebkitBackdropFilter: "blur(18px) saturate(140%)",
  color: "rgba(226, 240, 250, 0.95)",
  fontFamily:
    '"SF Pro Display", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontWeight: 600,
  fontSize: "14.5px",
  letterSpacing: "4px",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  userSelect: "none",
};

const badgeDotStyle: CSSProperties = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: "#7dd3fc",
  boxShadow: "0 0 6px rgba(125, 211, 252, 0.55)",
};

export default function AgxoraGlobe3D(): JSX.Element {
  const compact = useCompactViewport();

  return (
    <div style={shellStyle} aria-label="AGXORA AI CORE — 3D globe">
      <Canvas
        dpr={compact ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0.4, CAMERA_DISTANCE], fov: 42, near: 0.1, far: 200 }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <GlobeScene compact={compact} />
        </Suspense>
      </Canvas>

      {/* The single AGXORA AI CORE label */}
      <div style={badgeStyle}>
        <span style={badgeDotStyle} />
        AGXORA AI CORE
      </div>
    </div>
  );
}
