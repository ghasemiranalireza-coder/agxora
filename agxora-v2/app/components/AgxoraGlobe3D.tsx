"use client";

/**
 * AgxoraGlobe3D — cinematic, enterprise-grade 3D Earth.
 *
 * Stack: Next.js 16 · React 19 · React Three Fiber · three.js ·
 *        @react-three/drei · @react-three/postprocessing
 *
 * Features: procedural PBR Earth (zero external assets), HDR preset
 * lighting, fresnel atmosphere, deep 3D starfield, cinematic camera drift,
 * bloom + vignette post-processing, responsive + mobile optimized.
 */

import {
  memo,
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
import { Environment } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS = 0.98;
/** Very thin shell — the fresnel falloff does the rest. */
const ATMOSPHERE_SCALE = 1.03;

/** Vertical offset applied to the camera target: looking slightly below
 *  center frames the globe a touch higher, balancing the dashboard card. */
const FRAME_Y_OFFSET = -0.24;

const EARTH_SPIN_SPEED = 0.018;

/** Deep realistic ocean blue with a faint atmospheric self-glow. */
const EARTH_OCEAN_COLOR = new THREE.Color("#0b3d6f");
const EARTH_EMISSIVE_COLOR = new THREE.Color("#0a2440");

interface StarLayerConfig {
  readonly count: number;
  readonly minRadius: number;
  readonly maxRadius: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly driftSpeed: number;
  readonly parallaxFactor: number;
  readonly seed: number;
}

interface QualityProfile {
  readonly dpr: [number, number];
  readonly earthSegments: number;
  readonly starLayers: readonly StarLayerConfig[];
  readonly postprocessing: boolean;
  readonly multisampling: number;
}

/** Three depth layers: near stars drift and parallax more than far ones. */
function buildStarLayers(scale: number): readonly StarLayerConfig[] {
  return [
    {
      count: Math.round(8000 * scale),
      minRadius: 55,
      maxRadius: 110,
      minSize: 0.22,
      maxSize: 0.9,
      driftSpeed: 0.0016,
      parallaxFactor: 0.008,
      seed: 0x1a2b3c,
    },
    {
      count: Math.round(5000 * scale),
      minRadius: 30,
      maxRadius: 60,
      minSize: 0.3,
      maxSize: 1.3,
      driftSpeed: 0.0028,
      parallaxFactor: 0.02,
      seed: 0x4d5e6f,
    },
    {
      count: Math.round(3000 * scale),
      minRadius: 14,
      maxRadius: 32,
      minSize: 0.35,
      maxSize: 1.2,
      driftSpeed: 0.0042,
      parallaxFactor: 0.038,
      seed: 0x708192,
    },
  ];
}

const DESKTOP_QUALITY: QualityProfile = {
  dpr: [1, 2],
  earthSegments: 96,
  starLayers: buildStarLayers(1),
  postprocessing: true,
  multisampling: 4,
};

const MOBILE_QUALITY: QualityProfile = {
  dpr: [1, 1.5],
  earthSegments: 64,
  starLayers: buildStarLayers(0.4),
  postprocessing: true,
  multisampling: 0,
};

/* -------------------------------------------------------------------------- */
/*                                   Hooks                                    */
/* -------------------------------------------------------------------------- */

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const update = (): void => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

/* -------------------------------------------------------------------------- */
/*                                   Earth                                    */
/* -------------------------------------------------------------------------- */

interface EarthProps {
  readonly quality: QualityProfile;
}

/**
 * Procedural Earth — no external assets. A physically based ocean sphere:
 * deep blue water with a glossy clearcoat sheen and a faint emissive
 * atmospheric self-glow; the fresnel shell supplies the limb haze.
 */
const Earth = memo(function Earth({ quality }: EarthProps): JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current !== null) {
      groupRef.current.rotation.y += delta * EARTH_SPIN_SPEED;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.12, -1.2, 0.05]}>
      <mesh>
        <sphereGeometry
          args={[EARTH_RADIUS, quality.earthSegments, quality.earthSegments]}
        />
        <meshPhysicalMaterial
          color={EARTH_OCEAN_COLOR}
          roughness={0.32}
          metalness={0}
          clearcoat={0.65}
          clearcoatRoughness={0.35}
          emissive={EARTH_EMISSIVE_COLOR}
          emissiveIntensity={0.35}
          envMapIntensity={1.1}
        />
      </mesh>
    </group>
  );
});

/* -------------------------------------------------------------------------- */
/*                              Fresnel atmosphere                            */
/* -------------------------------------------------------------------------- */

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    // Rayleigh-style rim: strongest exactly at the limb, decaying
    // exponentially inward — a thin, soft haze instead of a ring.
    float fresnel = 1.0 - abs(dot(normalize(vNormal), normalize(vViewDir)));
    float rim = pow(fresnel, uPower);
    // Soften the outer edge so the glow dissolves into space.
    float falloff = smoothstep(1.0, 0.72, fresnel);
    float glow = rim * falloff * uIntensity;
    gl_FragColor = vec4(uColor * glow, glow);
  }
`;

const Atmosphere = memo(function Atmosphere(): JSX.Element {
  const material = useMemo<THREE.ShaderMaterial>(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color("#7ab8f0") },
          uIntensity: { value: 0.72 },
          uPower: { value: 6.0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={ATMOSPHERE_SCALE}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
});

/* -------------------------------------------------------------------------- */
/*                               Deep starfield                               */
/* -------------------------------------------------------------------------- */

const STAR_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (180.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.05, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/** Deterministic PRNG (mulberry32) — keeps the starfield stable and pure. */
function createRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_PALETTE: readonly THREE.Color[] = [
  new THREE.Color("#ffffff"),
  new THREE.Color("#dbeafe"),
  new THREE.Color("#bfdbfe"),
  new THREE.Color("#fde8c8"),
  new THREE.Color("#ffe9d6"),
  new THREE.Color("#93c5fd"),
];

interface StarLayerProps {
  readonly config: StarLayerConfig;
}

/** One depth slice of the starfield with its own drift and parallax. */
const StarLayer = memo(function StarLayer({
  config,
}: StarLayerProps): JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const random = createRandom(config.seed);
    const positions = new Float32Array(config.count * 3);
    const sizes = new Float32Array(config.count);
    const colors = new Float32Array(config.count * 3);

    const radiusSpan = config.maxRadius - config.minRadius;
    const sizeSpan = config.maxSize - config.minSize;

    for (let i = 0; i < config.count; i += 1) {
      // Uniform density inside the shell — no clustering, no visible tiling.
      const radius = config.minRadius + Math.cbrt(random()) * radiusSpan;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Cubic bias keeps most stars tiny, with rare bright ones.
      sizes[i] = config.minSize + Math.pow(random(), 3) * sizeSpan;

      const color = STAR_PALETTE[Math.floor(random() * STAR_PALETTE.length)];
      const brightness = 0.35 + Math.pow(random(), 1.6) * 0.65;
      colors[i * 3] = color.r * brightness;
      colors[i * 3 + 1] = color.g * brightness;
      colors[i * 3 + 2] = color.b * brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [config]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (points === null) return;

    // Constant slow drift plus pointer parallax scaled by layer depth,
    // so near stars shift more than far ones.
    points.rotation.y += delta * config.driftSpeed;
    points.rotation.x = THREE.MathUtils.damp(
      points.rotation.x,
      -state.pointer.y * config.parallaxFactor,
      1.2,
      delta,
    );
    points.rotation.z = THREE.MathUtils.damp(
      points.rotation.z,
      state.pointer.x * config.parallaxFactor,
      1.2,
      delta,
    );
  });

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  );
});

interface StarfieldProps {
  readonly layers: readonly StarLayerConfig[];
}

const Starfield = memo(function Starfield({
  layers,
}: StarfieldProps): JSX.Element {
  return (
    <>
      {layers.map((layer) => (
        <StarLayer key={layer.seed} config={layer} />
      ))}
    </>
  );
});

/* -------------------------------------------------------------------------- */
/*                             Cinematic camera rig                           */
/* -------------------------------------------------------------------------- */

interface CameraRigProps {
  readonly parallax: boolean;
}

const CAMERA_TARGET = new THREE.Vector3(0, FRAME_Y_OFFSET, 0);

function CameraRig({ parallax }: CameraRigProps): null {
  useFrame((state, delta) => {
    const camera = state.camera;
    const t = state.clock.elapsedTime;

    // Near-imperceptible orbital drift and breathing dolly — the motion
    // should only register subconsciously.
    const angle = t * 0.016;
    const dolly = 4.35 + Math.sin(t * 0.045) * 0.09;

    const baseX = Math.sin(angle) * dolly * 0.12;
    const baseY = 0.42 + Math.sin(t * 0.032) * 0.06;
    const baseZ = Math.cos(angle * 0.6) * 0.08 + dolly;

    // Gentle pointer parallax on desktop only.
    const px = parallax ? state.pointer.x * 0.16 : 0;
    const py = parallax ? state.pointer.y * 0.09 : 0;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, baseX + px, 1.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, baseY + py, 1.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, baseZ, 1.0, delta);

    camera.lookAt(CAMERA_TARGET);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                   Scene                                    */
/* -------------------------------------------------------------------------- */

interface SceneProps {
  readonly quality: QualityProfile;
  readonly isMobile: boolean;
}

const Scene = memo(function Scene({
  quality,
  isMobile,
}: SceneProps): JSX.Element {
  return (
    <>
      <color attach="background" args={["#02040a"]} />

      {/* HDR image-based lighting for realistic reflections */}
      <Environment preset="night" />

      {/* Soft white key light */}
      <directionalLight position={[6, 3, 4]} intensity={2.4} color="#ffffff" />
      {/* Subtle blue rim light from deep space */}
      <directionalLight
        position={[-6, -1.5, -4]}
        intensity={0.35}
        color="#5b8cff"
      />
      <ambientLight intensity={0.05} />

      <Starfield layers={quality.starLayers} />
      <Earth quality={quality} />
      <Atmosphere />
      <CameraRig parallax={!isMobile} />

      {quality.postprocessing && (
        <EffectComposer multisampling={quality.multisampling}>
          <Bloom
            intensity={isMobile ? 0.22 : 0.32}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.95}
            radius={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.26} darkness={0.72} />
        </EffectComposer>
      )}
    </>
  );
});

/* -------------------------------------------------------------------------- */
/*                              Public component                              */
/* -------------------------------------------------------------------------- */

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "clamp(340px, 60vh, 560px)",
  borderRadius: "24px",
  overflow: "hidden",
  background: "radial-gradient(circle at 50% 45%, #071226 0%, #02040a 70%)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
};

const labelStyle: CSSProperties = {
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
    "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
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

const labelDotStyle: CSSProperties = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: "#7dd3fc",
  boxShadow: "0 0 6px rgba(125, 211, 252, 0.55)",
};

export default function AgxoraGlobe3D(): JSX.Element {
  const isMobile = useIsMobile();
  const quality = isMobile ? MOBILE_QUALITY : DESKTOP_QUALITY;

  return (
    <div style={containerStyle} aria-label="AGXORA AI CORE — 3D globe">
      <Canvas
        dpr={quality.dpr}
        camera={{ position: [0, 0.42, 4.35], fov: 42, near: 0.1, far: 300 }}
        gl={{
          antialias: !quality.postprocessing,
          powerPreference: "high-performance",
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <Scene quality={quality} isMobile={isMobile} />
        </Suspense>
      </Canvas>

      {/* The single AGXORA AI CORE label */}
      <div style={labelStyle}>
        <span style={labelDotStyle} />
        AGXORA AI CORE
      </div>
    </div>
  );
}
