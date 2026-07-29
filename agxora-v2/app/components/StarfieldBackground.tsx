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
import { useReducedMotion } from "framer-motion";
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
      // Deep space: fewer, subtler points (reduced visual noise).
      total: Math.round(4200 * density),
      nearRadius: 60,
      farRadius: 135,
      minPoint: 0.18,
      maxPoint: 0.85,
      spin: 0.0009,
      sway: 0.0038,
      seed: 0x51a001,
    },
    {
      total: Math.round(2600 * density),
      nearRadius: 26,
      farRadius: 70,
      minPoint: 0.2,
      maxPoint: 0.9,
      spin: 0.0014,
      sway: 0.009,
      seed: 0x51a002,
    },
    {
      total: Math.round(1200 * density),
      nearRadius: 10,
      farRadius: 36,
      minPoint: 0.22,
      maxPoint: 0.98,
      spin: 0.0022,
      sway: 0.016,
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
  attribute float twinklePhase;
  varying vec3 vTint;
  varying float vTwinkle;

  void main() {
    vTint = pointTint;
    vTwinkle = twinklePhase;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = pointScale * (220.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  varying vec3 vTint;
  varying float vTwinkle;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uTwinkleAmp;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float core = smoothstep(0.5, 0.06, d);
    float tw = 0.75 + 0.25 * sin(uTime * 1.25 + vTwinkle * 6.2831);
    float a = core * uOpacity * mix(1.0, tw, uTwinkleAmp);
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
  readonly reducedMotion: boolean;
}

function DriftingLayer({
  layer,
  pointerRef,
  reducedMotion,
}: LayerProps): JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const rand = makeRandom(layer.seed);
    const positions = new Float32Array(layer.total * 3);
    const scales = new Float32Array(layer.total);
    const tints = new Float32Array(layer.total * 3);
    const twinklePhases = new Float32Array(layer.total);
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

      twinklePhases[i] = rand();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("pointScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("pointTint", new THREE.BufferAttribute(tints, 3));
    geo.setAttribute(
      "twinklePhase",
      new THREE.BufferAttribute(twinklePhases, 1),
    );

    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uOpacity: { value: 1 },
        uTime: { value: 0 },
        uTwinkleAmp: { value: reducedMotion ? 0 : 1 },
      },
    });

    return { geometry: geo, material: mat };
  }, [layer, reducedMotion]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current;
    if (points === null) return;

    const t = clock.elapsedTime;
    material.uniforms.uTime.value = t;
    material.uniforms.uTwinkleAmp.value = reducedMotion ? 0 : 1;

    if (!reducedMotion) {
      points.rotation.y += delta * layer.spin;
    }
    const pointer = pointerRef.current;
    const ease = 1 - Math.exp(-delta * 1.2);
    if (!reducedMotion) {
      points.rotation.x += (-pointer.y * layer.sway - points.rotation.x) * ease;
      points.rotation.z += (pointer.x * layer.sway - points.rotation.z) * ease;
    }

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
/* Day atmosphere is CSS-layered; WebGL only adds faint dust           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Exported backdrop                                                   */
/* ------------------------------------------------------------------ */

export default function StarfieldBackground(): JSX.Element {
  const small = useSmallScreen();
  const reducedMotion = useReducedMotion() ?? false;
  const { tokens } = useTheme();
  const layers = useMemo(
    () => backdropLayers(small ? 0.4 : 1),
    [small],
  );
  const dustCount = small ? 160 : 420;

  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (small || reducedMotion) return undefined;
    const onMove = (event: PointerEvent): void => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [small, reducedMotion]);

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
          background: [
            "radial-gradient(ellipse 55% 40% at 78% 6%, rgba(255,252,248,0.7) 0%, rgba(255,252,248,0) 60%)",
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.35) 0%, transparent 55%)",
          ].join(", "),
          opacity: tokens.tone === "day" ? 1 : 0,
          transition: `opacity ${THEME_TRANSITION_MS}ms ease`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse 110% 42% at 50% 108%, rgba(176,200,220,0.32) 0%, transparent 58%)",
            "radial-gradient(ellipse 60% 35% at 20% 70%, rgba(220,232,242,0.2) 0%, transparent 55%)",
          ].join(", "),
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
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        {layers.map((layer) => (
          <DriftingLayer
            key={layer.seed}
            layer={layer}
            pointerRef={pointerRef}
            reducedMotion={reducedMotion}
          />
        ))}
        <DayDust count={dustCount} />
      </Canvas>
    </div>
  );
}
