"use client";

/**
 * AgxoraGlobe3D — AGXORA Business Operating System.
 *
 * Photorealistic cinematic Earth built from real NASA-derived maps
 * (bundled in /public/textures — no network fetches at runtime):
 * true continents, real night-time city lights tinted warm gold,
 * cloud veil, layered cyan/blue atmosphere, thin orbital rings and
 * subtle connection arcs between real world cities.
 *
 * The canvas is frameless and edge-masked so it blends into the page's
 * global starfield backdrop. Sized by its parent container.
 *
 * Next.js 16 · React 19 · React Three Fiber · three.js · drei ·
 * @react-three/postprocessing · strict TypeScript.
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
import { useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

/* ======================================================================== */
/*  Deterministic PRNG (arc pairing)                                        */
/* ======================================================================== */

/** mulberry32 — small, fast, deterministic PRNG. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ======================================================================== */
/*  Textures (local files, bundled with the app)                            */
/* ======================================================================== */

const TEXTURE_URLS = [
  "/textures/earth_day_4096.jpg",
  "/textures/earth_night_4096.jpg",
  "/textures/earth_normal_2048.jpg",
  "/textures/earth_specular_2048.jpg",
  "/textures/earth_clouds_1024.png",
] as const;

/**
 * drei's `useTexture` onLoad receives the raw texture array. Configure
 * everything here — mutating the hook's return value in render would
 * violate React Compiler rules.
 */
function configureTextures(loaded: THREE.Texture | THREE.Texture[]): void {
  const list = Array.isArray(loaded) ? loaded : [loaded];
  list.forEach((texture, index) => {
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    // Day + night maps carry color; the rest stay linear.
    if (index <= 1) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.needsUpdate = true;
  });
}

/* ======================================================================== */
/*  Real city coordinates for beacons & connection arcs                     */
/* ======================================================================== */

interface City {
  readonly lat: number;
  readonly lon: number;
}

const CITIES: readonly City[] = [
  { lat: 52.5, lon: 13.4 }, // Berlin
  { lat: 50.1, lon: 8.7 }, // Frankfurt
  { lat: 51.5, lon: -0.1 }, // London
  { lat: 40.7, lon: -74.0 }, // New York
  { lat: 34.05, lon: -118.2 }, // Los Angeles
  { lat: 43.7, lon: -79.4 }, // Toronto
  { lat: -23.55, lon: -46.6 }, // São Paulo
  { lat: 25.2, lon: 55.3 }, // Dubai
  { lat: 19.1, lon: 72.9 }, // Mumbai
  { lat: 1.35, lon: 103.8 }, // Singapore
  { lat: 35.7, lon: 139.7 }, // Tokyo
  { lat: -33.9, lon: 151.2 }, // Sydney
  { lat: 6.5, lon: 3.4 }, // Lagos
  { lat: -26.2, lon: 28.0 }, // Johannesburg
];

/** Maps lat/lon onto three.js' equirectangular sphere UV orientation. */
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ======================================================================== */
/*  Quality profiles                                                        */
/* ======================================================================== */

interface RenderProfile {
  readonly pixelRatio: [number, number];
  readonly sphereDetail: number;
  readonly arcCount: number;
  readonly msaa: number;
}

const PROFILE_DESKTOP: RenderProfile = {
  pixelRatio: [1, 2],
  sphereDetail: 96,
  arcCount: 6,
  msaa: 4,
};

const PROFILE_COMPACT: RenderProfile = {
  pixelRatio: [1, 1.5],
  sphereDetail: 64,
  arcCount: 4,
  msaa: 0,
};

function useRenderProfile(): { profile: RenderProfile; compact: boolean } {
  const [compact, setCompact] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const sync = (): void => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return { profile: compact ? PROFILE_COMPACT : PROFILE_DESKTOP, compact };
}

/* ======================================================================== */
/*  City beacons & connection arcs                                          */
/* ======================================================================== */

const BEACON_VERTEX = /* glsl */ `
  attribute float beaconSize;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = beaconSize * (230.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const BEACON_FRAGMENT = /* glsl */ `
  uniform vec3 beaconTint;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float halo = smoothstep(0.5, 0.05, d);
    float core = smoothstep(0.16, 0.02, d);
    gl_FragColor = vec4(beaconTint * (halo * 0.55 + core), halo * 0.85);
  }
`;

/** Warm-gold glow points above real metropolitan areas. */
function CityBeacons(): JSX.Element {
  const assets = useMemo(() => {
    const rand = seededRandom(0xc17b);
    const positions = new Float32Array(CITIES.length * 3);
    const sizes = new Float32Array(CITIES.length);

    CITIES.forEach((city, i) => {
      const p = latLonToVec3(city.lat, city.lon, 1.008);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      sizes[i] = 0.035 + rand() * 0.04;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("beaconSize", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: BEACON_VERTEX,
      fragmentShader: BEACON_FRAGMENT,
      uniforms: { beaconTint: { value: new THREE.Color("#ffcb7a") } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      assets.geometry.dispose();
      assets.material.dispose();
    },
    [assets],
  );

  return (
    <points>
      <primitive object={assets.geometry} attach="geometry" />
      <primitive object={assets.material} attach="material" />
    </points>
  );
}

interface ConnectionArcsProps {
  readonly count: number;
}

/** Very subtle luminous arcs linking distant world cities. */
function ConnectionArcs({ count }: ConnectionArcsProps): JSX.Element {
  const lines = useMemo<THREE.Line[]>(() => {
    const rand = seededRandom(0xa4c5);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color("#7fd0ff"),
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const built: THREE.Line[] = [];
    let guard = 0;
    while (built.length < count && guard < 200) {
      guard += 1;
      const a = CITIES[Math.floor(rand() * CITIES.length)];
      const b = CITIES[Math.floor(rand() * CITIES.length)];
      const start = latLonToVec3(a.lat, a.lon, 1.01);
      const end = latLonToVec3(b.lat, b.lon, 1.01);
      const angle = start.angleTo(end);
      if (angle < 0.55 || angle > 2.1) continue;

      const lift = 1 + 0.05 + angle * 0.09;
      const mid = start.clone().add(end).normalize().multiplyScalar(lift);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(56),
      );
      built.push(new THREE.Line(geometry, material));
    }
    return built;
  }, [count]);

  useEffect(
    () => () => {
      lines.forEach((line) => {
        line.geometry.dispose();
      });
      if (lines.length > 0) {
        (lines[0].material as THREE.Material).dispose();
      }
    },
    [lines],
  );

  return (
    <group>
      {lines.map((line, index) => (
        <primitive key={index} object={line} />
      ))}
    </group>
  );
}

/* ======================================================================== */
/*  Orbital rings                                                           */
/* ======================================================================== */

const RING_DRIFT = 0.018;

/** Two paper-thin inclined orbital rings with a very slow precession. */
function OrbitalRings(): JSX.Element {
  const ringGroup = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ringGroup.current !== null) {
      ringGroup.current.rotation.y += delta * RING_DRIFT;
    }
  });

  return (
    <group ref={ringGroup}>
      <mesh rotation={[1.78, 0, -0.34]}>
        <ringGeometry args={[1.38, 1.392, 160]} />
        <meshBasicMaterial
          color="#8fd8ff"
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[1.32, 0.12, 0.42]}>
        <ringGeometry args={[1.58, 1.589, 160]} />
        <meshBasicMaterial
          color="#9fc7ff"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ======================================================================== */
/*  Planet — real NASA-derived maps                                         */
/* ======================================================================== */

const PLANET_RADIUS = 1;
const PLANET_SPIN = 0.02;
const CLOUD_SPIN = 0.029;

interface PlanetProps {
  readonly profile: RenderProfile;
}

function Planet({ profile }: PlanetProps): JSX.Element {
  const spinGroup = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);

  const [dayMap, nightMap, normalMap, specularMap, cloudsMap] = useTexture(
    [...TEXTURE_URLS],
    configureTextures,
  );

  useFrame((_, delta) => {
    if (spinGroup.current !== null) {
      spinGroup.current.rotation.y += delta * PLANET_SPIN;
    }
    if (cloudMesh.current !== null) {
      cloudMesh.current.rotation.y += delta * CLOUD_SPIN;
    }
  });

  return (
    <group ref={spinGroup} rotation={[0.12, -1.45, 0.04]}>
      {/* Surface — real continents, oceans and gold city lights */}
      <mesh>
        <sphereGeometry
          args={[PLANET_RADIUS, profile.sphereDetail, profile.sphereDetail]}
        />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          specularMap={specularMap}
          specular={new THREE.Color("#39536f")}
          shininess={14}
          emissiveMap={nightMap}
          emissive={new THREE.Color("#ffc276")}
          emissiveIntensity={2.1}
        />
      </mesh>

      {/* Thin cloud veil */}
      <mesh ref={cloudMesh}>
        <sphereGeometry
          args={[
            PLANET_RADIUS * 1.012,
            profile.sphereDetail,
            profile.sphereDetail,
          ]}
        />
        {/* The clouds texture carries soft coverage in its alpha channel —
            use it as a color map with transparency, not as an alphaMap. */}
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.38}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <CityBeacons />
      <ConnectionArcs count={profile.arcCount} />
    </group>
  );
}

/* ======================================================================== */
/*  Layered fresnel atmosphere                                              */
/* ======================================================================== */

const RIM_VERTEX = /* glsl */ `
  varying float vFresnel;

  void main() {
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 toEye = normalize(cameraPosition - wp.xyz);
    vFresnel = 1.0 - abs(dot(n, toEye));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const RIM_FRAGMENT = /* glsl */ `
  uniform vec3 rimTint;
  uniform float rimGain;
  uniform float rimCurve;

  varying float vFresnel;

  void main() {
    float rim = pow(clamp(vFresnel, 0.0, 1.0), rimCurve);
    float dissolve = smoothstep(1.0, 0.68, vFresnel);
    float a = rim * dissolve * rimGain;
    gl_FragColor = vec4(rimTint * a, a);
  }
`;

interface GlowShellProps {
  readonly scale: number;
  readonly tint: string;
  readonly gain: number;
  readonly curve: number;
}

function GlowShell({ scale, tint, gain, curve }: GlowShellProps): JSX.Element {
  const rimMaterial = useMemo<THREE.ShaderMaterial>(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RIM_VERTEX,
        fragmentShader: RIM_FRAGMENT,
        uniforms: {
          rimTint: { value: new THREE.Color(tint) },
          rimGain: { value: gain },
          rimCurve: { value: curve },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [tint, gain, curve],
  );

  useEffect(() => () => rimMaterial.dispose(), [rimMaterial]);

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
      <primitive object={rimMaterial} attach="material" />
    </mesh>
  );
}

/** Bright cyan rim close to the limb + wide soft blue haze around it. */
function AtmosphereGlow(): JSX.Element {
  return (
    <>
      <GlowShell scale={1.028} tint="#8ee4ff" gain={2.0} curve={4.6} />
      <GlowShell scale={1.05} tint="#54bcff" gain={2.9} curve={3.3} />
      <GlowShell scale={1.13} tint="#2f7fe0" gain={1.05} curve={2.4} />
    </>
  );
}

/* ======================================================================== */
/*  Cinematic camera                                                        */
/* ======================================================================== */

const CAMERA_HOME_Z = 3.35;
const CAMERA_FOCUS = new THREE.Vector3(0, 0.02, 0);

interface CameraDriftProps {
  readonly parallax: boolean;
}

function CameraDrift({ parallax }: CameraDriftProps): null {
  useFrame(({ camera, clock, pointer }, delta) => {
    const t = clock.elapsedTime;

    const glideX = Math.sin(t * 0.014) * 0.3;
    const glideY = 0.14 + Math.sin(t * 0.029) * 0.05;
    const glideZ = CAMERA_HOME_Z + Math.sin(t * 0.041) * 0.07;

    const px = parallax ? pointer.x * 0.11 : 0;
    const py = parallax ? pointer.y * 0.07 : 0;

    const ease = 1 - Math.exp(-delta * 1.1);
    camera.position.x += (glideX + px - camera.position.x) * ease;
    camera.position.y += (glideY + py - camera.position.y) * ease;
    camera.position.z += (glideZ - camera.position.z) * ease;
    camera.lookAt(CAMERA_FOCUS);
  });

  return null;
}

/* ======================================================================== */
/*  Scene                                                                   */
/* ======================================================================== */

interface SpaceSceneProps {
  readonly profile: RenderProfile;
  readonly compact: boolean;
}

function SpaceScene({ profile, compact }: SpaceSceneProps): JSX.Element {
  return (
    <>
      <color attach="background" args={["#0a1832"]} />

      {/* Key sun — warm white, high and off-axis so the ocean glint
          sits near the limb instead of mid-planet */}
      <directionalLight
        position={[6, 3, 2.8]}
        intensity={3.6}
        color="#fff1da"
      />
      {/* Warm sunset kiss on the upper-right limb, like the reference */}
      <pointLight position={[3.4, 2.2, 1.6]} intensity={15} color="#ffd9a0" distance={9} decay={2} />
      {/* Cool blue bounce for the shadowed limb */}
      <directionalLight
        position={[-5, -1.6, -3]}
        intensity={0.85}
        color="#6f9de8"
      />
      <ambientLight intensity={0.55} />

      <Planet profile={profile} />
      <AtmosphereGlow />
      <OrbitalRings />
      <CameraDrift parallax={!compact} />

      <EffectComposer multisampling={profile.msaa}>
        <Bloom
          intensity={compact ? 0.4 : 0.56}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/* ======================================================================== */
/*  Exported component                                                      */
/* ======================================================================== */

const EDGE_MASK =
  "radial-gradient(closest-side, black 58%, rgba(0, 0, 0, 0.4) 80%, transparent 99%)";

const frameStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  maskImage: EDGE_MASK,
  WebkitMaskImage: EDGE_MASK,
};

interface AgxoraGlobe3DProps {
  readonly className?: string;
}

export default function AgxoraGlobe3D({
  className,
}: AgxoraGlobe3DProps): JSX.Element {
  const { profile, compact } = useRenderProfile();

  return (
    <div
      style={frameStyle}
      className={className}
      aria-label="AGXORA — cinematic 3D globe"
      role="img"
    >
      <Canvas
        dpr={profile.pixelRatio}
        camera={{
          position: [0, 0.14, CAMERA_HOME_Z],
          fov: 41,
          near: 0.1,
          far: 60,
        }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.28,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <SpaceScene profile={profile} compact={compact} />
        </Suspense>
      </Canvas>
    </div>
  );
}
