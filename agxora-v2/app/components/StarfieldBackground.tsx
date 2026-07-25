"use client";

/**
 * StarfieldBackground — global full-viewport environmental backdrop.
 *
 * Night: cinematic procedural starfield over deep space.
 * Day: pearl atmospheric sky (CSS layers) + nearly invisible dust,
 * soft sun glow, and horizon haze. Stars fade to zero.
 *
 * Theme blend is lerped from the visual store (no per-frame React work).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  DAY_TOKENS,
  NIGHT_TOKENS,
  THEME_TRANSITION_MS,
  getThemeDayBlend,
  lerp,
  useTheme,
} from "../lib/theme";

/* ------------------------------------------------------------------ */
/* Deterministic PRNG                                                  */
/* ------------------------------------------------------------------ */

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Layer configuration                                                 */
/* ------------------------------------------------------------------ */

interface BackdropLayer {
  readonly total: number;
  readonly nearRadius: number;
  readonly farRadius: number;
  readonly minPoint: number;
  readonly maxPoint: number;
  readonly spin: number;
  readonly sway: number;
  readonly seed: number;
}

function backdropLayers(density: number): readonly BackdropLayer[] {
  return [
    {
      total: Math.round(5200 * density),
      nearRadius: 55,
      farRadius: 115,
      minPoint: 0.28,
      maxPoint: 1.05,
      spin: 0.0011,
      sway: 0.005,
      seed: 0x51a001,
    },
    {
      total: Math.round(3400 * density),
      nearRadius: 28,
      farRadius: 58,
      minPoint: 0.34,
      maxPoint: 1.35,
      spin: 0.002,
      sway: 0.012,
      seed: 0x51a002,
    },
    {
      total: Math.round(1800 * density),
      nearRadius: 12,
      farRadius: 30,
      minPoint: 0.4,
      maxPoint: 1.25,
      spin: 0.0031,
      sway: 0.022,
      seed: 0x51a003,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Viewport hook                                                       */
/* ------------------------------------------------------------------ */

function useSmallScreen(): boolean {
  const [small, setSmall] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const sync = (): void => setSmall(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return small;
}

/* ------------------------------------------------------------------ */
/* Star shaders                                                        */
/* ------------------------------------------------------------------ */

const POINT_VERTEX = /* glsl */ `
  attribute float pointScale;
  attribute vec3 pointTint;
  varying vec3 vTint;

  void main() {
    vTint = pointTint;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = pointScale * (220.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  varying vec3 vTint;
  uniform float uOpacity;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.06, d) * uOpacity;
    gl_FragColor = vec4(vTint, a);
  }
`;

const TINTS: readonly THREE.Color[] = [
  new THREE.Color("#ffffff"),
  new THREE.Color("#dce8fb"),
  new THREE.Color("#c6d9f6"),
  new THREE.Color("#f6e8d2"),
  new THREE.Color("#adcbf1"),
];

/* ------------------------------------------------------------------ */
/* Night star layers                                                   */
/* ------------------------------------------------------------------ */

interface LayerProps {
  readonly layer: BackdropLayer;
  readonly pointerRef: React.RefObject<{ x: number; y: number }>;
}

function DriftingLayer({ layer, pointerRef }: LayerProps): JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const rand = makeRandom(layer.seed);
    const positions = new Float32Array(layer.total * 3);
    const scales = new Float32Array(layer.total);
    const tints = new Float32Array(layer.total * 3);
    const shell = layer.farRadius - layer.nearRadius;
    const sizeShell = layer.maxPoint - layer.minPoint;

    for (let i = 0; i < layer.total; i += 1) {
      const r = layer.nearRadius + Math.cbrt(rand()) * shell;
      const az = rand() * Math.PI * 2;
      const pol = Math.acos(2 * rand() - 1);

      positions[i * 3] = r * Math.sin(pol) * Math.cos(az);
      positions[i * 3 + 1] = r * Math.sin(pol) * Math.sin(az);
      positions[i * 3 + 2] = r * Math.cos(pol);

      scales[i] = layer.minPoint + Math.pow(rand(), 3) * sizeShell;

      const tint = TINTS[Math.floor(rand() * TINTS.length)];
      const luma = 0.45 + Math.pow(rand(), 1.45) * 0.55;
      tints[i * 3] = tint.r * luma;
      tints[i * 3 + 1] = tint.g * luma;
      tints[i * 3 + 2] = tint.b * luma;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("pointScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("pointTint", new THREE.BufferAttribute(tints, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 1 } },
    });

    return { geometry: geo, material: mat };
  }, [layer]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (points === null) return;

    points.rotation.y += delta * layer.spin;
    const pointer = pointerRef.current;
    const ease = 1 - Math.exp(-delta * 1.2);
    points.rotation.x += (-pointer.y * layer.sway - points.rotation.x) * ease;
    points.rotation.z += (pointer.x * layer.sway - points.rotation.z) * ease;

    const blend = getThemeDayBlend();
    material.uniforms.uOpacity.value = lerp(
      NIGHT_TOKENS.starOpacity,
      DAY_TOKENS.starOpacity,
      blend,
    );
  });

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Day: floating dust / light particles                                */
/* ------------------------------------------------------------------ */

const DUST_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  varying float vAlpha;
  uniform float uTime;
  uniform float uOpacity;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.12 + aPhase * 6.2831) * 0.35;
    p.y += cos(uTime * 0.09 + aPhase * 4.1) * 0.28;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (140.0 / -mv.z);
    vAlpha = (0.25 + 0.75 * sin(uTime * 0.4 + aPhase * 6.28)) * uOpacity;
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAGMENT = /* glsl */ `
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.12, d) * vAlpha;
    gl_FragColor = vec4(0.96, 0.98, 1.0, a * 0.55);
  }
`;

function DayDust({ count }: { readonly count: number }): JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const rand = makeRandom(0xd00501);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (rand() - 0.5) * 28;
      positions[i * 3 + 1] = (rand() - 0.5) * 18;
      positions[i * 3 + 2] = -4 - rand() * 22;
      sizes[i] = 0.35 + rand() * 1.1;
      phases[i] = rand();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERTEX,
      fragmentShader: DUST_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
    });

    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    const blend = getThemeDayBlend();
    material.uniforms.uOpacity.value = lerp(
      NIGHT_TOKENS.particleOpacity,
      DAY_TOKENS.particleOpacity,
      blend,
    );
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.004;
    }
  });

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Day: soft sun bloom + horizon haze                                  */
/* ------------------------------------------------------------------ */

function SoftSunGlow(): JSX.Element {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const blend = getThemeDayBlend();
    if (matRef.current) {
      matRef.current.opacity = lerp(0, 0.42, blend);
    }
  });

  return (
    <mesh position={[6.5, 4.2, -18]} scale={[14, 14, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color="#fff8f0"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function HorizonHaze(): JSX.Element {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const blend = getThemeDayBlend();
    if (matRef.current) {
      matRef.current.opacity = lerp(0, 0.22, blend);
    }
  });

  return (
    <mesh position={[0, -5.5, -12]} scale={[40, 8, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color="#b8cfe0"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Exported backdrop                                                   */
/* ------------------------------------------------------------------ */

export default function StarfieldBackground(): JSX.Element {
  const small = useSmallScreen();
  const { tokens } = useTheme();
  const layers = useMemo(
    () => backdropLayers(small ? 0.4 : 1),
    [small],
  );
  const dustCount = small ? 160 : 420;

  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (small) return undefined;
    const onMove = (event: PointerEvent): void => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [small]);

  const backdropStyle = useMemo<CSSProperties>(
    () => ({
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      minHeight: "100vh",
      height: "100dvh",
      zIndex: 0,
      pointerEvents: "none",
      overflow: "hidden",
      background: tokens.skyGradient,
      transition: `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    }),
    [tokens.skyGradient],
  );

  return (
    <div style={backdropStyle} aria-hidden="true">
      {/* Extra CSS depth layers for daylight atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 45% at 70% 12%, rgba(255,255,255,0.35) 0%, transparent 55%)",
          opacity: tokens.tone === "day" ? 1 : 0,
          transition: `opacity ${THEME_TRANSITION_MS}ms ease`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 100% 40% at 50% 100%, rgba(170,195,215,0.28) 0%, transparent 60%)",
          opacity: tokens.tone === "day" ? 1 : 0,
          transition: `opacity ${THEME_TRANSITION_MS}ms ease`,
          pointerEvents: "none",
        }}
      />

      <Canvas
        dpr={small ? [1, 1.5] : [1, 1.75]}
        camera={{ position: [0, 0, 0.1], fov: 60, near: 0.1, far: 240 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          premultipliedAlpha: false,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        {layers.map((layer) => (
          <DriftingLayer
            key={layer.seed}
            layer={layer}
            pointerRef={pointerRef}
          />
        ))}
        <DayDust count={dustCount} />
        <SoftSunGlow />
        <HorizonHaze />
      </Canvas>
    </div>
  );
}
