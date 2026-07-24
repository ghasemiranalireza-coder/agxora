"use client";

/**
 * AgxoraGlobe3D — AGXORA AI Business Operating System.
 *
 * 100% procedural cinematic Earth. Every pixel is computed at runtime:
 * continents, oceans, ice caps, clouds, atmosphere and stars are all
 * generated from seeded noise — zero files, zero loaders, zero network.
 *
 * Next.js 16 · React 19 · React Three Fiber · three.js ·
 * @react-three/drei · @react-three/postprocessing · strict TypeScript.
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
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

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
}

const SEA_LEVEL = 0.535;

/** Muted, premium palette — nothing saturated or cartoon-like. */
const ABYSS = new THREE.Color("#041c38");
const SHALLOWS = new THREE.Color("#0c4174");
const LOWLAND = new THREE.Color("#46603c");
const HIGHLAND = new THREE.Color("#79684a");
const PEAKS = new THREE.Color("#8f8878");
const POLAR_ICE = new THREE.Color("#dbe4ea");

function mixColors(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

function smooth(edge0: number, edge1: number, value: number): number {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Renders equirectangular surface / roughness / elevation / cloud maps by
 * sampling seamless 3D noise on the unit sphere. Runs once per quality
 * profile and is fully deterministic.
 */
function generatePlanetMaps(width: number, height: number): PlanetMaps {
  const continents = makeValueNoise3D(0xa17c);
  const detail = makeValueNoise3D(0x52f1);
  const clouds = makeValueNoise3D(0x39d7);

  const colorData = new Uint8Array(width * height * 4);
  const roughData = new Uint8Array(width * height * 4);
  const bumpData = new Uint8Array(width * height * 4);
  const cloudData = new Uint8Array(width * height * 4);

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

      if (isLand) {
        const relief = smooth(SEA_LEVEL, SEA_LEVEL + 0.22, elevation);
        color =
          relief < 0.45
            ? mixColors(LOWLAND, HIGHLAND, relief / 0.45)
            : mixColors(HIGHLAND, PEAKS, (relief - 0.45) / 0.55);
        // Dry out land near the equator, cool it toward the poles.
        color = mixColors(color, HIGHLAND, (1 - latAbs / Math.PI) * 0.12);
        roughness = 0.86;
        bump = 0.45 + relief * 0.55;
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
  };
}

/* ======================================================================== */
/*  Quality profiles                                                        */
/* ======================================================================== */

interface StarShell {
  readonly amount: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly sizeFloor: number;
  readonly sizeCeil: number;
  readonly drift: number;
  readonly parallax: number;
  readonly seed: number;
}

interface RenderProfile {
  readonly pixelRatio: [number, number];
  readonly sphereDetail: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly shells: readonly StarShell[];
  readonly msaa: number;
}

function starShells(density: number): readonly StarShell[] {
  return [
    {
      amount: Math.round(6500 * density),
      innerRadius: 50,
      outerRadius: 105,
      sizeFloor: 0.2,
      sizeCeil: 0.85,
      drift: 0.0014,
      parallax: 0.007,
      seed: 0xbead01,
    },
    {
      amount: Math.round(4200 * density),
      innerRadius: 26,
      outerRadius: 54,
      sizeFloor: 0.28,
      sizeCeil: 1.25,
      drift: 0.0026,
      parallax: 0.018,
      seed: 0xbead02,
    },
    {
      amount: Math.round(2300 * density),
      innerRadius: 12,
      outerRadius: 28,
      sizeFloor: 0.32,
      sizeCeil: 1.15,
      drift: 0.004,
      parallax: 0.034,
      seed: 0xbead03,
    },
  ];
}

const PROFILE_DESKTOP: RenderProfile = {
  pixelRatio: [1, 2],
  sphereDetail: 96,
  mapWidth: 1024,
  mapHeight: 512,
  shells: starShells(1),
  msaa: 4,
};

const PROFILE_COMPACT: RenderProfile = {
  pixelRatio: [1, 1.5],
  sphereDetail: 64,
  mapWidth: 512,
  mapHeight: 256,
  shells: starShells(0.4),
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
      {/* Surface — physically based, fully procedural */}
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
          emissive={new THREE.Color("#08223f")}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Thin procedural cloud veil */}
      <mesh ref={cloudMesh}>
        <sphereGeometry
          args={[PLANET_RADIUS * 1.014, profile.sphereDetail, profile.sphereDetail]}
        />
        <meshStandardMaterial
          color="#ffffff"
          alphaMap={maps.cloudMap}
          transparent
          opacity={0.5}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
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
          rimTint: { value: new THREE.Color("#6fb0e8") },
          rimGain: { value: 0.8 },
          rimCurve: { value: 5.2 },
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
    <mesh scale={1.04}>
      <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
      <primitive object={rimMaterial} attach="material" />
    </mesh>
  );
}

/* ======================================================================== */
/*  Layered starfield                                                       */
/* ======================================================================== */

const STARS_VERTEX = /* glsl */ `
  attribute float starSize;
  attribute vec3 starTint;
  varying vec3 vTint;

  void main() {
    vTint = starTint;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = starSize * (170.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STARS_FRAGMENT = /* glsl */ `
  varying vec3 vTint;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.06, d);
    gl_FragColor = vec4(vTint, a);
  }
`;

const STAR_TINTS: readonly THREE.Color[] = [
  new THREE.Color("#ffffff"),
  new THREE.Color("#d8e6fb"),
  new THREE.Color("#c2d8f7"),
  new THREE.Color("#f7e7cd"),
  new THREE.Color("#a8c8f2"),
];

interface StarShellProps {
  readonly shell: StarShell;
}

function StarShellPoints({ shell }: StarShellProps): JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { starGeometry, starMaterial } = useMemo(() => {
    const rand = seededRandom(shell.seed);
    const positions = new Float32Array(shell.amount * 3);
    const sizes = new Float32Array(shell.amount);
    const tints = new Float32Array(shell.amount * 3);
    const span = shell.outerRadius - shell.innerRadius;
    const sizeSpan = shell.sizeCeil - shell.sizeFloor;

    for (let i = 0; i < shell.amount; i += 1) {
      const r = shell.innerRadius + Math.cbrt(rand()) * span;
      const azimuth = rand() * Math.PI * 2;
      const polar = Math.acos(2 * rand() - 1);

      positions[i * 3] = r * Math.sin(polar) * Math.cos(azimuth);
      positions[i * 3 + 1] = r * Math.sin(polar) * Math.sin(azimuth);
      positions[i * 3 + 2] = r * Math.cos(polar);

      sizes[i] = shell.sizeFloor + Math.pow(rand(), 3) * sizeSpan;

      const tint = STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)];
      const luma = 0.35 + Math.pow(rand(), 1.5) * 0.65;
      tints[i * 3] = tint.r * luma;
      tints[i * 3 + 1] = tint.g * luma;
      tints[i * 3 + 2] = tint.b * luma;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("starSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("starTint", new THREE.BufferAttribute(tints, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: STARS_VERTEX,
      fragmentShader: STARS_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { starGeometry: geometry, starMaterial: material };
  }, [shell]);

  useEffect(
    () => () => {
      starGeometry.dispose();
      starMaterial.dispose();
    },
    [starGeometry, starMaterial],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (points === null) return;

    points.rotation.y += delta * shell.drift;
    const targetX = -state.pointer.y * shell.parallax;
    const targetZ = state.pointer.x * shell.parallax;
    const ease = 1 - Math.exp(-delta * 1.4);
    points.rotation.x += (targetX - points.rotation.x) * ease;
    points.rotation.z += (targetZ - points.rotation.z) * ease;
  });

  return (
    <points ref={pointsRef}>
      <primitive object={starGeometry} attach="geometry" />
      <primitive object={starMaterial} attach="material" />
    </points>
  );
}

/* ======================================================================== */
/*  Cinematic camera                                                        */
/* ======================================================================== */

const CAMERA_HOME_Z = 4.3;
const CAMERA_FOCUS = new THREE.Vector3(0, -0.22, 0);

interface CameraDriftProps {
  readonly parallax: boolean;
}

function CameraDrift({ parallax }: CameraDriftProps): null {
  useFrame(({ camera, clock, pointer }, delta) => {
    const t = clock.elapsedTime;

    const glideX = Math.sin(t * 0.014) * 0.42;
    const glideY = 0.38 + Math.sin(t * 0.029) * 0.055;
    const glideZ = CAMERA_HOME_Z + Math.sin(t * 0.041) * 0.08;

    const px = parallax ? pointer.x * 0.14 : 0;
    const py = parallax ? pointer.y * 0.08 : 0;

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
      <color attach="background" args={["#01030a"]} />

      {/* Key sun — clean white, slightly high and camera-left */}
      <directionalLight position={[5, 2.6, 4]} intensity={2.9} color="#ffffff" />
      {/* Cold bounce from deep space for the shadowed limb */}
      <directionalLight
        position={[-5, -1.8, -3.5]}
        intensity={0.32}
        color="#4d7fd6"
      />
      <ambientLight intensity={0.07} />

      {profile.shells.map((shell) => (
        <StarShellPoints key={shell.seed} shell={shell} />
      ))}

      <Planet profile={profile} />
      <AtmosphereGlow />
      <CameraDrift parallax={!compact} />

      <EffectComposer multisampling={profile.msaa}>
        <Bloom
          intensity={compact ? 0.24 : 0.34}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.92}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

/* ======================================================================== */
/*  Exported component                                                      */
/* ======================================================================== */

const frameStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "clamp(340px, 60vh, 560px)",
  borderRadius: "24px",
  overflow: "hidden",
  background: "radial-gradient(circle at 50% 45%, #071226 0%, #01030a 70%)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
};

const coreBadgeStyle: CSSProperties = {
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

const coreBadgeDotStyle: CSSProperties = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: "#7dd3fc",
  boxShadow: "0 0 6px rgba(125, 211, 252, 0.55)",
};

export default function AgxoraGlobe3D(): JSX.Element {
  const { profile, compact } = useRenderProfile();

  return (
    <div style={frameStyle} aria-label="AGXORA AI CORE — 3D globe">
      <Canvas
        dpr={profile.pixelRatio}
        camera={{
          position: [0, 0.38, CAMERA_HOME_Z],
          fov: 42,
          near: 0.1,
          far: 220,
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

      {/* The single AGXORA AI CORE label */}
      <div style={coreBadgeStyle}>
        <span style={coreBadgeDotStyle} />
        AGXORA AI CORE
      </div>
    </div>
  );
}
