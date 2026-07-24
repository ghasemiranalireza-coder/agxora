"use client";

/**
 * StarfieldBackground — global full-viewport procedural space backdrop.
 *
 * Theme-aware: night keeps the cinematic starfield; day fades stars to
 * nearly zero while the sky gradient shifts to bright daylight blue.
 * Blend is lerped from the theme visual store (no per-frame React work).
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
/* One drifting layer                                                  */
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
      uniforms: {
        uOpacity: { value: 1 },
      },
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
    const targetX = -pointer.y * layer.sway;
    const targetZ = pointer.x * layer.sway;
    const ease = 1 - Math.exp(-delta * 1.2);
    points.rotation.x += (targetX - points.rotation.x) * ease;
    points.rotation.z += (targetZ - points.rotation.z) * ease;

    const blend = getThemeDayBlend();
    const opacity = lerp(
      NIGHT_TOKENS.starOpacity,
      DAY_TOKENS.starOpacity,
      blend,
    );
    material.uniforms.uOpacity.value = opacity;
  });

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Sky clear color                                                     */
/* ------------------------------------------------------------------ */

const nightSky = new THREE.Color(NIGHT_TOKENS.skySolid);
const daySky = new THREE.Color(DAY_TOKENS.skySolid);
const scratchSky = new THREE.Color();

function ThemeSky(): null {
  useFrame(({ scene }) => {
    const blend = getThemeDayBlend();
    scratchSky.copy(nightSky).lerp(daySky, blend);
    scene.background = scratchSky;
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Exported backdrop                                                   */
/* ------------------------------------------------------------------ */

export default function StarfieldBackground(): JSX.Element {
  const small = useSmallScreen();
  const { tokens } = useTheme();
  const layers = useMemo(
    () => backdropLayers(small ? 0.45 : 1),
    [small],
  );

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
      transition: `background ${THEME_TRANSITION_MS}ms ease`,
    }),
    [tokens.skyGradient],
  );

  return (
    <div style={backdropStyle} aria-hidden="true">
      <Canvas
        dpr={small ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0, 0.1], fov: 60, near: 0.1, far: 240 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ThemeSky />
        {layers.map((layer) => (
          <DriftingLayer key={layer.seed} layer={layer} pointerRef={pointerRef} />
        ))}
      </Canvas>
    </div>
  );
}
