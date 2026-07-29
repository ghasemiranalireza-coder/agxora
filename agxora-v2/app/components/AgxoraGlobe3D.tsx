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
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  DAY_TOKENS,
  NIGHT_TOKENS,
  THEME_TRANSITION_MS,
  getThemeDayBlend,
  lerp,
  useTheme,
} from "../lib/theme";

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
  const cities = makeValueNoise3D(0x9f2a);

  const colorData = new Uint8Array(width * height * 4);
  const roughData = new Uint8Array(width * height * 4);
  const bumpData = new Uint8Array(width * height * 4);
  const cloudData = new Uint8Array(width * height * 4);
  const lightsData = new Uint8Array(width * height * 4);

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
        roughness = 0.28;
        bump = 0.31;
      }

      if (iceEdge > 0) {
        color = mixColors(color, POLAR_ICE, iceEdge);
        roughness = THREE.MathUtils.lerp(roughness, 0.55, iceEdge);
      }

/** Cover threshold — softer cloud edges for premium volume. */
      const puff = fbm3D(clouds, px * 3.05 + 11, py * 3.05 - 7, pz * 3.05 + 3, 5);
      const swirl = fbm3D(clouds, px * 7.2 - 5, py * 7.2 + 9, pz * 7.2 - 2, 4);
      const wisps = fbm3D(clouds, px * 14.5 + 2, py * 14.5 - 3, pz * 14.5 + 8, 3);
      const dense = puff * 0.58 + swirl * 0.28 + wisps * 0.14;
      const cover = Math.pow(smooth(0.46, 0.78, dense), 1.08);

      // City lights: subtle warm emission on land, reduced under ice.
      const landness = smooth(SEA_LEVEL, SEA_LEVEL + 0.22, elevation);
      const cityNoise = fbm3D(
        cities,
        px * 12.2 + 3,
        py * 12.2 - 2,
        pz * 12.2 + 7,
        2,
      );
      const cityMask = smooth(0.62, 0.86, cityNoise);
      const equatorGain = 0.55 + 0.45 * (1 - latAbs / Math.PI);
      const iceDim = 1 - iceEdge;
      const lights = Math.pow(cityMask * landness, 2.0) * equatorGain * iceDim;
      const cityByte = Math.round(THREE.MathUtils.clamp(lights, 0, 1) * 255);

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

      // Warm emissive RGB — emissiveMap will modulate this by intensity.
      lightsData[i] = cityByte;
      lightsData[i + 1] = Math.round(cityByte * 0.78);
      lightsData[i + 2] = Math.round(cityByte * 0.35);
      lightsData[i + 3] = 255;
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
/** Slow continuous spin — premium, never aggressive. */
const PLANET_SPIN = 0.0088;
const CLOUD_SPIN = 0.014;
const CLOUD_HIGH_SPIN = 0.009;
/** Hero composition — globe sits high in the stage. */
const PLANET_BASE_Y = 0.115;
const PLANET_FLOAT_AMP = 0.03;
const PLANET_FLOAT_SPEED = 0.26;

interface PlanetProps {
  readonly profile: RenderProfile;
}

function Planet({ profile }: PlanetProps): JSX.Element {
  const floatGroup = useRef<THREE.Group>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);
  const cloudHighMesh = useRef<THREE.Mesh>(null);
  const surfaceMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const cloudMat = useRef<THREE.MeshStandardMaterial>(null);
  const cloudHighMat = useRef<THREE.MeshStandardMaterial>(null);
  const reduceMotion = useReducedMotion();

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

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (!reduceMotion) {
      if (floatGroup.current !== null) {
        floatGroup.current.position.y =
          PLANET_BASE_Y + Math.sin(t * PLANET_FLOAT_SPEED) * PLANET_FLOAT_AMP;
        floatGroup.current.rotation.z = Math.sin(t * 0.14) * 0.007;
      }
      if (spinGroup.current !== null) {
        spinGroup.current.rotation.y += delta * PLANET_SPIN;
      }
      if (cloudMesh.current !== null) {
        cloudMesh.current.rotation.y += delta * CLOUD_SPIN;
      }
      if (cloudHighMesh.current !== null) {
        cloudHighMesh.current.rotation.y += delta * CLOUD_HIGH_SPIN;
      }
    }

    const blend = getThemeDayBlend();
    if (surfaceMat.current) {
      surfaceMat.current.clearcoat = lerp(
        NIGHT_TOKENS.surfaceClearcoat,
        DAY_TOKENS.surfaceClearcoat,
        blend,
      );
      surfaceMat.current.clearcoatRoughness = lerp(0.28, 0.14, blend);
      surfaceMat.current.emissiveIntensity = lerp(
        NIGHT_TOKENS.emissiveIntensity * 0.7,
        DAY_TOKENS.emissiveIntensity * 0.18,
        blend,
      );
      surfaceMat.current.bumpScale = lerp(0.016, 0.022, blend);
      surfaceMat.current.sheen = lerp(0.1, 0.24, blend);
      surfaceMat.current.sheenRoughness = lerp(0.42, 0.28, blend);
      surfaceMat.current.specularIntensity = lerp(0.82, 1.08, blend);
      surfaceMat.current.metalness = lerp(0.035, 0.06, blend);
    }
    if (cloudMat.current) {
      cloudMat.current.opacity = lerp(
        NIGHT_TOKENS.cloudOpacity * 0.8,
        DAY_TOKENS.cloudOpacity * 0.7,
        blend,
      );
    }
    if (cloudHighMat.current) {
      cloudHighMat.current.opacity = lerp(0.22, 0.34, blend);
    }
  });

  return (
    <group ref={floatGroup} position={[0, PLANET_BASE_Y, 0]}>
      <group ref={spinGroup} rotation={[0.1, -1.05, 0.04]}>
        {/* Surface — physically based oceans + continents */}
        <mesh>
          <sphereGeometry
            args={[PLANET_RADIUS, profile.sphereDetail, profile.sphereDetail]}
          />
          <meshPhysicalMaterial
            ref={surfaceMat}
            map={maps.colorMap}
            roughnessMap={maps.roughnessMap}
            roughness={0.95}
            bumpMap={maps.bumpMap}
            bumpScale={0.018}
            metalness={0.04}
            clearcoat={0.65}
            clearcoatRoughness={0.26}
            sheen={0.1}
            sheenColor={new THREE.Color("#8ec4ff")}
            sheenRoughness={0.42}
            specularIntensity={0.92}
            reflectivity={0.46}
            envMapIntensity={1.15}
            emissive={new THREE.Color("#ffffff")}
            emissiveMap={maps.lightsMap}
            emissiveIntensity={0.14}
          />
        </mesh>

        {/* Primary cloud deck — softer volume */}
        <mesh ref={cloudMesh}>
          <sphereGeometry
            args={[
              PLANET_RADIUS * 1.018,
              profile.sphereDetail,
              profile.sphereDetail,
            ]}
          />
          <meshStandardMaterial
            ref={cloudMat}
            color="#f4f8ff"
            alphaMap={maps.cloudMap}
            transparent
            opacity={0.52}
            depthWrite={false}
            roughness={0.93}
            metalness={0}
            emissive={new THREE.Color("#c8dcff")}
            emissiveIntensity={0.03}
          />
        </mesh>

        {/* High cirrus veil — depth + parallax vs lower deck */}
        <mesh ref={cloudHighMesh}>
          <sphereGeometry
            args={[
              PLANET_RADIUS * 1.032,
              Math.max(32, Math.floor(profile.sphereDetail * 0.75)),
              Math.max(32, Math.floor(profile.sphereDetail * 0.75)),
            ]}
          />
          <meshStandardMaterial
            ref={cloudHighMat}
            color="#ffffff"
            alphaMap={maps.cloudMap}
            transparent
            opacity={0.22}
            depthWrite={false}
            roughness={1}
            metalness={0}
          />
        </mesh>
      </group>

      <AtmosphereGlow />
      <EarthAura />
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
    float dissolve = smoothstep(1.0, 0.62, vFresnel);
    float scatter = pow(clamp(vFresnel, 0.0, 1.0), 2.4) * 0.35;
    float a = (rim * dissolve + scatter) * rimGain;
    gl_FragColor = vec4(rimTint * a, a);
  }
`;

const NIGHT_ATMO = new THREE.Color(NIGHT_TOKENS.atmosphereTint);
const DAY_ATMO = new THREE.Color(DAY_TOKENS.atmosphereTint);

function AtmosphereLayer({
  scale,
  gainScale,
  curve,
}: {
  readonly scale: number;
  readonly gainScale: number;
  readonly curve: number;
}): JSX.Element {
  const rimMaterial = useMemo<THREE.ShaderMaterial>(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RIM_VERTEX,
        fragmentShader: RIM_FRAGMENT,
        uniforms: {
          rimTint: { value: new THREE.Color(NIGHT_TOKENS.atmosphereTint) },
          rimGain: { value: NIGHT_TOKENS.atmosphereGain * gainScale },
          rimCurve: { value: curve },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [curve, gainScale],
  );

  useEffect(() => () => rimMaterial.dispose(), [rimMaterial]);

  useFrame(() => {
    const blend = getThemeDayBlend();
    (rimMaterial.uniforms.rimTint.value as THREE.Color)
      .copy(NIGHT_ATMO)
      .lerp(DAY_ATMO, blend);
    rimMaterial.uniforms.rimGain.value =
      lerp(NIGHT_TOKENS.atmosphereGain, DAY_TOKENS.atmosphereGain, blend) *
      gainScale;
    rimMaterial.uniforms.rimCurve.value = lerp(curve, curve * 0.82, blend);
  });

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
      <primitive object={rimMaterial} attach="material" />
    </mesh>
  );
}

/** Exact desktop globe diameter (px) and atmosphere thickness (px). */
const GLOBE_DIAMETER_PX = 520;
const ATMOSPHERE_THICKNESS_PX = 6;
/** Atmosphere outer scale so shell thickness = 6px when diameter = 520px. */
const ATMOSPHERE_SCALE =
  1 + (2 * ATMOSPHERE_THICKNESS_PX) / GLOBE_DIAMETER_PX;

function AtmosphereGlow(): JSX.Element {
  return (
    <>
      {/* Exact 6px atmosphere thickness at 520px globe diameter */}
      <AtmosphereLayer scale={ATMOSPHERE_SCALE} gainScale={0.42} curve={4.2} />
    </>
  );
}

/** Soft additive sprite-like aura for subtle Earth glow (depth cue). */
function EarthAura(): JSX.Element {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#3d9aef"),
        transparent: true,
        // Exact halo opacity: 18%
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    [],
  );

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(() => {
    const blend = getThemeDayBlend();
    // Exact night halo 18%; day slightly softer but capped at 18%
    mat.opacity = lerp(0.18, 0.18 * 0.55, blend);
    mat.color.set(blend > 0.5 ? "#9ec8e8" : "#3d9aef");
  });

  return (
    <mesh scale={ATMOSPHERE_SCALE}>
      <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
      <primitive object={mat} attach="material" />
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
  uniform float uOpacity;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.06, d) * uOpacity;
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
  const reduceMotion = useReducedMotion();

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
      uniforms: {
        uOpacity: { value: 1 },
      },
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

    if (!reduceMotion) {
      points.rotation.y += delta * shell.drift;
      const targetX = -state.pointer.y * shell.parallax;
      const targetZ = state.pointer.x * shell.parallax;
      const ease = 1 - Math.exp(-delta * 1.4);
      points.rotation.x += (targetX - points.rotation.x) * ease;
      points.rotation.z += (targetZ - points.rotation.z) * ease;
    }

    const blend = getThemeDayBlend();
    starMaterial.uniforms.uOpacity.value = lerp(
      NIGHT_TOKENS.starOpacity,
      DAY_TOKENS.starOpacity,
      blend,
    );
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

/** Closer cinematic framing for free-floating hero globe. */
const CAMERA_HOME_Z = 3.35;
const CAMERA_FOCUS = new THREE.Vector3(0, PLANET_BASE_Y + 0.02, 0);

interface CameraDriftProps {
  readonly parallax: boolean;
}

function CameraDrift({ parallax }: CameraDriftProps): null {
  const reduceMotion = useReducedMotion();

  useFrame(({ camera, clock, pointer }, delta) => {
    const t = clock.elapsedTime;

    const glideX = Math.sin(t * 0.009) * 0.2;
    const glideY = PLANET_BASE_Y * 0.55 + Math.sin(t * 0.018) * 0.03;
    const glideZ = CAMERA_HOME_Z + Math.sin(t * 0.024) * 0.038;

    const px = parallax ? pointer.x * 0.06 : 0;
    const py = parallax ? pointer.y * 0.035 : 0;

    const ease = 1 - Math.exp(-delta * 0.85);
    if (!reduceMotion) {
      camera.position.x += (glideX + px - camera.position.x) * ease;
      camera.position.y += (glideY + py - camera.position.y) * ease;
      camera.position.z += (glideZ - camera.position.z) * ease;
    }
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
  readonly globeScale: number;
}

const NIGHT_SUN = new THREE.Color("#ffffff");
const DAY_SUN = new THREE.Color("#fff4e8");
const NIGHT_FILL = new THREE.Color("#4d7fd6");
const DAY_FILL = new THREE.Color("#a8c4dc");
const NIGHT_RIM = new THREE.Color("#3d8fd8");
const DAY_RIM = new THREE.Color("#b8d4ec");

function SpaceScene({
  profile,
  compact,
  globeScale,
}: SpaceSceneProps): JSX.Element {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const { gl } = useThree();
  const { appearance } = useTheme();
  const bloomIntensity =
    appearance === "day"
      ? compact
        ? DAY_TOKENS.bloomIntensityCompact
        : DAY_TOKENS.bloomIntensity
      : compact
        ? NIGHT_TOKENS.bloomIntensityCompact
        : NIGHT_TOKENS.bloomIntensity;
  const vignetteDarkness =
    appearance === "day"
      ? DAY_TOKENS.vignetteDarkness
      : NIGHT_TOKENS.vignetteDarkness;

  useEffect(() => {
    gl.setClearColor(0x000000, 0);
  }, [gl]);

  useFrame(({ scene, gl: renderer }) => {
    const blend = getThemeDayBlend();
    // Keep canvas transparent so the dashboard starfield shows through.
    scene.background = null;
    renderer.setClearColor(0x000000, 0);

    if (sunRef.current) {
      sunRef.current.intensity = lerp(
        NIGHT_TOKENS.sunIntensity,
        DAY_TOKENS.sunIntensity,
        blend,
      );
      sunRef.current.color.copy(NIGHT_SUN).lerp(DAY_SUN, blend);
      // Soft daylight sun angle — slightly higher and warmer
      sunRef.current.position.set(
        lerp(5, 4.2, blend),
        lerp(2.6, 3.4, blend),
        lerp(4, 3.6, blend),
      );
    }
    if (fillRef.current) {
      fillRef.current.intensity = lerp(
        NIGHT_TOKENS.fillIntensity,
        DAY_TOKENS.fillIntensity,
        blend,
      );
      fillRef.current.color.copy(NIGHT_FILL).lerp(DAY_FILL, blend);
    }
    if (rimRef.current) {
      rimRef.current.intensity = lerp(0.72, 0.42, blend);
      rimRef.current.color.copy(NIGHT_RIM).lerp(DAY_RIM, blend);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = lerp(
        NIGHT_TOKENS.ambientIntensity,
        DAY_TOKENS.ambientIntensity,
        blend,
      );
    }

    renderer.toneMappingExposure = lerp(
      NIGHT_TOKENS.exposure,
      DAY_TOKENS.exposure,
      blend,
    );
  });

  return (
    <>
      {/* Key sun — clean white night / soft warm daylight */}
      <directionalLight
        ref={sunRef}
        position={[5, 2.6, 4]}
        intensity={NIGHT_TOKENS.sunIntensity}
        color="#ffffff"
      />
      {/* Bounce fill — cold space at night, soft sky fill by day */}
      <directionalLight
        ref={fillRef}
        position={[-5, -1.8, -3.5]}
        intensity={NIGHT_TOKENS.fillIntensity}
        color="#4d7fd6"
      />
      {/* Blue atmospheric rim — subtle HDR edge light */}
      <directionalLight
        ref={rimRef}
        position={[-2.2, 1.4, -4.5]}
        intensity={0.72}
        color="#3d8fd8"
      />
      {/* Soft front fill for specular catch lights */}
      <pointLight
        position={[1.6, 0.8, 3.2]}
        intensity={appearance === "day" ? 0.35 : 0.22}
        color={appearance === "day" ? "#fff6ee" : "#a8d4ff"}
        distance={12}
        decay={2}
      />
      <ambientLight ref={ambientRef} intensity={NIGHT_TOKENS.ambientIntensity} />
      {/* Soft sky dome fill for believable daylight bounce */}
      <hemisphereLight
        args={["#b8d8f8", "#0c1a2e", 0.22]}
        intensity={appearance === "day" ? 0.48 : 0.18}
      />

      {profile.shells.map((shell) => (
        <StarShellPoints key={shell.seed} shell={shell} />
      ))}

      <group scale={globeScale}>
        <Planet profile={profile} />
      </group>
      <CameraDrift parallax={!compact} />

      <EffectComposer multisampling={profile.msaa} frameBufferType={THREE.HalfFloatType}>
        <Bloom
          intensity={bloomIntensity * 0.78}
          luminanceThreshold={appearance === "day" ? 0.78 : 0.62}
          luminanceSmoothing={0.95}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.42} darkness={vignetteDarkness} />
      </EffectComposer>
    </>
  );
}

/* ======================================================================== */
/*  Exported component                                                      */
/* ======================================================================== */

export type GlobeVariant = "hero" | "framed";

interface AgxoraGlobe3DProps {
  readonly variant?: GlobeVariant;
}

export default function AgxoraGlobe3D({
  variant = "hero",
}: AgxoraGlobe3DProps): JSX.Element {
  const { profile, compact } = useRenderProfile();
  const { tokens } = useTheme();
  const isHero = variant === "hero";
  const globeScale = isHero ? 0.68 : 1;

  const frameStyle = useMemo<CSSProperties>(() => {
    if (isHero) {
      return {
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "inherit",
        borderRadius: 0,
        overflow: "visible",
        background: "transparent",
        border: "none",
        boxShadow: "none",
      };
    }

    return {
      position: "relative",
      width: "100%",
      height: "clamp(420px, 78vh, 800px)",
      borderRadius: "28px",
      overflow: "hidden",
      background: tokens.globeFrameBg,
      border: `1px solid ${tokens.globeBorder}`,
      boxShadow: tokens.panelShadow,
      transition: `background ${THEME_TRANSITION_MS}ms ease, border-color ${THEME_TRANSITION_MS}ms ease, box-shadow ${THEME_TRANSITION_MS}ms ease`,
    };
  }, [isHero, tokens.globeFrameBg, tokens.globeBorder, tokens.panelShadow]);

  return (
    <div
      style={frameStyle}
      aria-label="AGXORA AI CORE — 3D globe"
      className={
        isHero ? "agx-globe-stage agx-globe-enter" : "agx-globe-frame agx-globe-enter"
      }
    >
      <Canvas
        dpr={profile.pixelRatio}
        camera={{
          position: [0, PLANET_BASE_Y * 0.55, CAMERA_HOME_Z],
          fov: isHero ? 36 : 38,
          near: 0.1,
          far: 220,
        }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: true,
          premultipliedAlpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.18,
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          pointerEvents: compact ? "none" : "auto",
        }}
      >
        <Suspense fallback={null}>
          <SpaceScene
            profile={profile}
            compact={compact}
            globeScale={globeScale}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
