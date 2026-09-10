"use client";

/**
 * AgxoraGlobe3D — AGXORA Business Operating System.
 *
 * 100% procedural cinematic Earth: continents, oceans, ice caps, clouds,
 * warm gold city lights, orbital rings and connection arcs are all computed
 * at runtime from seeded noise — zero files, zero loaders, zero network.
 *
 * The canvas is frameless and edge-masked so it blends into the page's
 * global starfield backdrop. Sized by its parent container.
 *
 * Next.js 16 · React 19 · React Three Fiber · three.js ·
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
import { Bloom, EffectComposer } from "@react-three/postprocessing";

/* ======================================================================== */
/*  Deterministic noise toolkit                                             */
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

type Noise3D = (x: number, y: number, z: number) => number;

/** Seamless 3D value noise built on a shuffled permutation table. */
function makeValueNoise3D(seed: number): Noise3D {
  const rand = seededRandom(seed);
  const table = new Uint8Array(512);
  const source = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  for (let i = 0; i < 512; i += 1) {
    table[i] = source[i & 255];
  }

  const lattice = (xi: number, yi: number, zi: number): number =>
    table[(table[(table[xi & 255] + yi) & 255] + zi) & 255] / 255;

  const fade = (t: number): number => t * t * (3 - 2 * t);

  return (x: number, y: number, z: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const fx = fade(x - xi);
    const fy = fade(y - yi);
    const fz = fade(z - zi);

    const c000 = lattice(xi, yi, zi);
    const c100 = lattice(xi + 1, yi, zi);
    const c010 = lattice(xi, yi + 1, zi);
    const c110 = lattice(xi + 1, yi + 1, zi);
    const c001 = lattice(xi, yi, zi + 1);
    const c101 = lattice(xi + 1, yi, zi + 1);
    const c011 = lattice(xi, yi + 1, zi + 1);
    const c111 = lattice(xi + 1, yi + 1, zi + 1);

    const x00 = c000 + (c100 - c000) * fx;
    const x10 = c010 + (c110 - c010) * fx;
    const x01 = c001 + (c101 - c001) * fx;
    const x11 = c011 + (c111 - c011) * fx;
    const y0 = x00 + (x10 - x00) * fy;
    const y1 = x01 + (x11 - x01) * fy;
    return y0 + (y1 - y0) * fz;
  };
}

/** Fractal Brownian motion over 3D value noise, normalized to 0..1. */
function fbm3D(
  noise: Noise3D,
  x: number,
  y: number,
  z: number,
  octaves: number,
): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += noise(x * frequency, y * frequency, z * frequency) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }
  return sum / norm;
}

/* ======================================================================== */
/*  Procedural planet maps (DataTexture — no files, no loaders)             */
/* ======================================================================== */

interface PlanetMaps {
  readonly colorMap: THREE.DataTexture;
  readonly roughnessMap: THREE.DataTexture;
  readonly bumpMap: THREE.DataTexture;
  readonly cloudMap: THREE.DataTexture;
  readonly lightsMap: THREE.DataTexture;
  readonly cityAnchors: readonly THREE.Vector3[];
}

const SEA_LEVEL = 0.535;

/** Muted premium palette — deep night-navy oceans, dark warm land. */
const ABYSS = new THREE.Color("#031430");
const SHALLOWS = new THREE.Color("#0a3a6a");
const LOWLAND = new THREE.Color("#3c5233");
const HIGHLAND = new THREE.Color("#6b5c40");
const PEAKS = new THREE.Color("#7d7663");
const POLAR_ICE = new THREE.Color("#d5e0ea");

function mixColors(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

function smooth(edge0: number, edge1: number, value: number): number {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Renders equirectangular surface / roughness / elevation / cloud / city
 * light maps by sampling seamless 3D noise on the unit sphere, and collects
 * anchor points of the brightest city clusters for beacons and arcs.
 * Runs once per quality profile and is fully deterministic.
 */
function generatePlanetMaps(width: number, height: number): PlanetMaps {
  const continents = makeValueNoise3D(0xa17c);
  const detail = makeValueNoise3D(0x52f1);
  const clouds = makeValueNoise3D(0x39d7);
  const cities = makeValueNoise3D(0x77aa);

  const colorData = new Uint8Array(width * height * 4);
  const roughData = new Uint8Array(width * height * 4);
  const bumpData = new Uint8Array(width * height * 4);
  const cloudData = new Uint8Array(width * height * 4);
  const lightsData = new Uint8Array(width * height * 4);
  const cityAnchors: THREE.Vector3[] = [];

  for (let row = 0; row < height; row += 1) {
    const v = row / (height - 1);
    const lat = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const latAbs = Math.abs(lat);

    for (let col = 0; col < width; col += 1) {
      const u = col / width;
      const lon = u * Math.PI * 2;
      const px = cosLat * Math.cos(lon);
      const py = sinLat;
      const pz = cosLat * Math.sin(lon);

      const base = fbm3D(continents, px * 1.7, py * 1.7, pz * 1.7, 5);
      const ridges = fbm3D(detail, px * 5.2, py * 5.2, pz * 5.2, 4);
      const elevation = base * 0.72 + ridges * 0.28;

      const isLand = elevation > SEA_LEVEL;
      const iceEdge = smooth(1.12, 1.32, latAbs + (ridges - 0.5) * 0.14);

      let color: THREE.Color;
      let roughness: number;
      let bump: number;
      let cityGlow = 0;

      if (isLand) {
        const relief = smooth(SEA_LEVEL, SEA_LEVEL + 0.22, elevation);
        color =
          relief < 0.45
            ? mixColors(LOWLAND, HIGHLAND, relief / 0.45)
            : mixColors(HIGHLAND, PEAKS, (relief - 0.45) / 0.55);
        // Dry out land near the equator, cool it toward the poles.
        color = mixColors(color, HIGHLAND, (1 - latAbs / Math.PI) * 0.12);
        roughness = 0.9;
        bump = 0.45 + relief * 0.55;

        // Warm gold civilization glow — clustered, biased toward coasts
        // and lowlands, fading toward the poles.
        const cluster = fbm3D(cities, px * 6.4, py * 6.4, pz * 6.4, 4);
        const sprinkle = cities(px * 30, py * 30, pz * 30);
        const coastBias = 1 - smooth(SEA_LEVEL + 0.02, SEA_LEVEL + 0.17, elevation);
        const latBand = 1 - smooth(0.92, 1.22, latAbs);
        cityGlow =
          smooth(0.55, 0.76, cluster) *
          (0.4 + sprinkle * 0.6) *
          (0.3 + coastBias * 0.7) *
          latBand *
          (1 - iceEdge);
      } else {
        const depth = smooth(SEA_LEVEL, SEA_LEVEL - 0.3, elevation);
        color = mixColors(SHALLOWS, ABYSS, depth);
        roughness = 0.24;
        bump = 0.35;
      }

      if (iceEdge > 0) {
        color = mixColors(color, POLAR_ICE, iceEdge);
        roughness = THREE.MathUtils.lerp(roughness, 0.55, iceEdge);
      }

      const puff = fbm3D(clouds, px * 3.1 + 11, py * 3.1 - 7, pz * 3.1 + 3, 4);
      const swirl = fbm3D(clouds, px * 7.4 - 5, py * 7.4 + 9, pz * 7.4 - 2, 3);
      const cover = smooth(0.56, 0.74, puff * 0.7 + swirl * 0.3);

      const i = (row * width + col) * 4;
      colorData[i] = Math.round(color.r * 255);
      colorData[i + 1] = Math.round(color.g * 255);
      colorData[i + 2] = Math.round(color.b * 255);
      colorData[i + 3] = 255;

      const roughByte = Math.round(roughness * 255);
      roughData[i] = roughByte;
      roughData[i + 1] = roughByte;
      roughData[i + 2] = roughByte;
      roughData[i + 3] = 255;

      const bumpByte = Math.round(bump * 255);
      bumpData[i] = bumpByte;
      bumpData[i + 1] = bumpByte;
      bumpData[i + 2] = bumpByte;
      bumpData[i + 3] = 255;

      // three.js alphaMap reads the GREEN channel — store coverage in RGB.
      const cloudByte = Math.round(cover * 255);
      cloudData[i] = cloudByte;
      cloudData[i + 1] = cloudByte;
      cloudData[i + 2] = cloudByte;
      cloudData[i + 3] = 255;

      // Gold-tinted emissive city lights.
      const glow = THREE.MathUtils.clamp(cityGlow * 1.8, 0, 1);
      lightsData[i] = Math.round(glow * 255);
      lightsData[i + 1] = Math.round(glow * 176);
      lightsData[i + 2] = Math.round(glow * 84);
      lightsData[i + 3] = 255;

      // Sparse, deterministic sampling of the brightest clusters.
      if (cityGlow > 0.42 && row % 5 === 2 && col % 9 === 4) {
        cityAnchors.push(new THREE.Vector3(px, py, pz));
      }
    }
  }

  const buildTexture = (
    data: Uint8Array,
    srgb: boolean,
  ): THREE.DataTexture => {
    const texture = new THREE.DataTexture(data, width, height);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    if (srgb) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.needsUpdate = true;
    return texture;
  };

  return {
    colorMap: buildTexture(colorData, true),
    roughnessMap: buildTexture(roughData, false),
    bumpMap: buildTexture(bumpData, false),
    cloudMap: buildTexture(cloudData, false),
    lightsMap: buildTexture(lightsData, true),
    cityAnchors,
  };
}

/* ======================================================================== */
/*  Quality profiles                                                        */
/* ======================================================================== */

interface RenderProfile {
  readonly pixelRatio: [number, number];
  readonly sphereDetail: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly beaconCount: number;
  readonly arcCount: number;
  readonly msaa: number;
}

const PROFILE_DESKTOP: RenderProfile = {
  pixelRatio: [1, 2],
  sphereDetail: 96,
  mapWidth: 1024,
  mapHeight: 512,
  beaconCount: 64,
  arcCount: 7,
  msaa: 4,
};

const PROFILE_COMPACT: RenderProfile = {
  pixelRatio: [1, 1.5],
  sphereDetail: 64,
  mapWidth: 512,
  mapHeight: 256,
  beaconCount: 36,
  arcCount: 5,
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

interface CityBeaconsProps {
  readonly anchors: readonly THREE.Vector3[];
  readonly count: number;
}

/** Small warm-gold glow points on the strongest illuminated clusters. */
function CityBeacons({ anchors, count }: CityBeaconsProps): JSX.Element | null {
  const assets = useMemo(() => {
    if (anchors.length === 0) return null;
    const rand = seededRandom(0xc17b);
    const picked = Math.min(count, anchors.length);
    const positions = new Float32Array(picked * 3);
    const sizes = new Float32Array(picked);

    for (let i = 0; i < picked; i += 1) {
      const anchor = anchors[Math.floor(rand() * anchors.length)];
      const lifted = anchor.clone().multiplyScalar(1.006);
      positions[i * 3] = lifted.x;
      positions[i * 3 + 1] = lifted.y;
      positions[i * 3 + 2] = lifted.z;
      sizes[i] = 0.024 + rand() * 0.05;
    }

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
  }, [anchors, count]);

  useEffect(() => {
    if (assets === null) return undefined;
    return () => {
      assets.geometry.dispose();
      assets.material.dispose();
    };
  }, [assets]);

  if (assets === null) return null;

  return (
    <points>
      <primitive object={assets.geometry} attach="geometry" />
      <primitive object={assets.material} attach="material" />
    </points>
  );
}

interface ConnectionArcsProps {
  readonly anchors: readonly THREE.Vector3[];
  readonly count: number;
}

/** Very subtle luminous arcs linking distant city clusters. */
function ConnectionArcs({
  anchors,
  count,
}: ConnectionArcsProps): JSX.Element | null {
  const lines = useMemo<THREE.Line[]>(() => {
    if (anchors.length < 2) return [];
    const rand = seededRandom(0xa4c5);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color("#7fd0ff"),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const built: THREE.Line[] = [];
    let guard = 0;
    while (built.length < count && guard < 200) {
      guard += 1;
      const a = anchors[Math.floor(rand() * anchors.length)];
      const b = anchors[Math.floor(rand() * anchors.length)];
      const angle = a.angleTo(b);
      if (angle < 0.55 || angle > 2.1) continue;

      const start = a.clone().multiplyScalar(1.008);
      const end = b.clone().multiplyScalar(1.008);
      const lift = 1 + 0.12 + angle * 0.16;
      const mid = start.clone().add(end).normalize().multiplyScalar(lift);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(56),
      );
      built.push(new THREE.Line(geometry, material));
    }
    return built;
  }, [anchors, count]);

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

  if (lines.length === 0) return null;

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
          opacity={0.26}
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
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ======================================================================== */
/*  Planet                                                                  */
/* ======================================================================== */

const PLANET_RADIUS = 1;
const PLANET_SPIN = 0.02;
const CLOUD_SPIN = 0.031;

interface PlanetProps {
  readonly profile: RenderProfile;
}

function Planet({ profile }: PlanetProps): JSX.Element {
  const spinGroup = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);

  const maps = useMemo<PlanetMaps>(
    () => generatePlanetMaps(profile.mapWidth, profile.mapHeight),
    [profile.mapWidth, profile.mapHeight],
  );

  useEffect(
    () => () => {
      maps.colorMap.dispose();
      maps.roughnessMap.dispose();
      maps.bumpMap.dispose();
      maps.cloudMap.dispose();
      maps.lightsMap.dispose();
    },
    [maps],
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
    <group ref={spinGroup} rotation={[0.11, -1.05, 0.05]}>
      {/* Surface — physically based, fully procedural, gold city lights */}
      <mesh>
        <sphereGeometry
          args={[PLANET_RADIUS, profile.sphereDetail, profile.sphereDetail]}
        />
        <meshPhysicalMaterial
          map={maps.colorMap}
          roughnessMap={maps.roughnessMap}
          roughness={1}
          bumpMap={maps.bumpMap}
          bumpScale={0.014}
          metalness={0}
          clearcoat={0.42}
          clearcoatRoughness={0.42}
          emissiveMap={maps.lightsMap}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={1.35}
        />
      </mesh>

      {/* Thin procedural cloud veil */}
      <mesh ref={cloudMesh}>
        <sphereGeometry
          args={[
            PLANET_RADIUS * 1.014,
            profile.sphereDetail,
            profile.sphereDetail,
          ]}
        />
        <meshStandardMaterial
          color="#ffffff"
          alphaMap={maps.cloudMap}
          transparent
          opacity={0.4}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <CityBeacons anchors={maps.cityAnchors} count={profile.beaconCount} />
      <ConnectionArcs anchors={maps.cityAnchors} count={profile.arcCount} />
    </group>
  );
}

/* ======================================================================== */
/*  Fresnel atmosphere                                                      */
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

function AtmosphereGlow(): JSX.Element {
  const rimMaterial = useMemo<THREE.ShaderMaterial>(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RIM_VERTEX,
        fragmentShader: RIM_FRAGMENT,
        uniforms: {
          rimTint: { value: new THREE.Color("#5cbcf6") },
          rimGain: { value: 0.9 },
          rimCurve: { value: 4.8 },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => rimMaterial.dispose(), [rimMaterial]);

  return (
    <mesh scale={1.045}>
      <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
      <primitive object={rimMaterial} attach="material" />
    </mesh>
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
      <color attach="background" args={["#030b1a"]} />

      {/* Key sun — clean white, slightly high and camera-left */}
      <directionalLight position={[5, 2.2, 4]} intensity={2.4} color="#ffffff" />
      {/* Cold bounce from deep space for the shadowed limb */}
      <directionalLight
        position={[-5, -1.8, -3.5]}
        intensity={0.38}
        color="#4d7fd6"
      />
      <ambientLight intensity={0.12} />

      <Planet profile={profile} />
      <AtmosphereGlow />
      <OrbitalRings />
      <CameraDrift parallax={!compact} />

      <EffectComposer multisampling={profile.msaa}>
        <Bloom
          intensity={compact ? 0.32 : 0.44}
          luminanceThreshold={0.46}
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
          toneMappingExposure: 1.12,
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
