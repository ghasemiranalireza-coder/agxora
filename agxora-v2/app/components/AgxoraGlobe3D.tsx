"use client";

/**
 * AgxoraGlobe3D — cinematic, enterprise-grade 3D Earth.
 *
 * Stack: Next.js 16 · React 19 · React Three Fiber · three.js ·
 *        @react-three/drei · @react-three/postprocessing
 *
 * Features: PBR Earth, HDR image-based lighting, fresnel atmosphere,
 * animated cloud layer, deep 3D starfield, cinematic camera drift,
 * bloom + vignette post-processing, responsive + mobile optimized.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS = 1.35;
const CLOUD_ALTITUDE = 1.012;
const ATMOSPHERE_SCALE = 1.12;

const EARTH_SPIN_SPEED = 0.018;
const CLOUD_SPIN_SPEED = 0.026;

/** Ordered as [map, normalMap, specularMap, emissiveMap, cloudsMap]. */
const TEXTURE_URLS: [string, string, string, string, string] = [
  "/textures/earth_atmos_2048.jpg",
  "/textures/earth_normal_2048.jpg",
  "/textures/earth_specular_2048.jpg",
  "/textures/earth_lights_2048.png",
  "/textures/earth_clouds_1024.png",
];

/** Indices in TEXTURE_URLS holding color (sRGB) data: map, emissive, clouds. */
const SRGB_TEXTURE_INDICES: readonly number[] = [0, 3, 4];

const HDR_ENVIRONMENT = "/hdr/space_env_1k.hdr";

interface QualityProfile {
  readonly dpr: [number, number];
  readonly earthSegments: number;
  readonly starCount: number;
  readonly postprocessing: boolean;
  readonly multisampling: number;
  readonly anisotropy: number;
}

const DESKTOP_QUALITY: QualityProfile = {
  dpr: [1, 2],
  earthSegments: 96,
  starCount: 5000,
  postprocessing: true,
  multisampling: 4,
  anisotropy: 8,
};

const MOBILE_QUALITY: QualityProfile = {
  dpr: [1, 1.5],
  earthSegments: 64,
  starCount: 2200,
  postprocessing: true,
  multisampling: 0,
  anisotropy: 4,
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

/**
 * Builds an inverted grayscale copy of a texture. The three.js Earth
 * specular map is white over oceans; inverting it yields a physically
 * plausible roughness map (smooth water, rough land).
 */
function useInvertedRoughnessMap(source: THREE.Texture): THREE.Texture {
  return useMemo<THREE.Texture>(() => {
    const image = source.image as HTMLImageElement | ImageBitmap;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");
    if (ctx === null) return source;

    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    ctx.putImageData(pixels, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [source]);
}

/* -------------------------------------------------------------------------- */
/*                                   Earth                                    */
/* -------------------------------------------------------------------------- */

interface EarthProps {
  readonly quality: QualityProfile;
}

function Earth({ quality }: EarthProps): JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const configureTextures = useCallback(
    (loaded: THREE.Texture[]): void => {
      for (const [index, texture] of loaded.entries()) {
        if (SRGB_TEXTURE_INDICES.includes(index)) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        texture.anisotropy = quality.anisotropy;
        texture.needsUpdate = true;
      }
    },
    [quality.anisotropy],
  );

  // Array form is used because drei invokes `onLoad` with the texture array.
  const [map, normalMap, specularMap, emissiveMap, cloudsMap] = useTexture(
    TEXTURE_URLS,
    configureTextures,
  );

  const roughnessMap = useInvertedRoughnessMap(specularMap);

  useFrame((_, delta) => {
    if (groupRef.current !== null) {
      groupRef.current.rotation.y += delta * EARTH_SPIN_SPEED;
    }
    if (cloudsRef.current !== null) {
      cloudsRef.current.rotation.y += delta * CLOUD_SPIN_SPEED;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.12, -1.2, 0.05]}>
      {/* Planet surface — full PBR */}
      <mesh>
        <sphereGeometry
          args={[EARTH_RADIUS, quality.earthSegments, quality.earthSegments]}
        />
        <meshStandardMaterial
          map={map}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={roughnessMap}
          roughness={1}
          metalness={0.02}
          emissiveMap={emissiveMap}
          emissive={new THREE.Color("#ffd9a0")}
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry
          args={[
            EARTH_RADIUS * CLOUD_ALTITUDE,
            quality.earthSegments,
            quality.earthSegments,
          ]}
        />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.55}
          depthWrite={false}
          roughness={1}
          metalness={0}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

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
    float fresnel = 1.0 - abs(dot(normalize(vNormal), normalize(vViewDir)));
    float glow = pow(fresnel, uPower) * uIntensity;
    gl_FragColor = vec4(uColor, glow);
  }
`;

function Atmosphere(): JSX.Element {
  const material = useMemo<THREE.ShaderMaterial>(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color("#4db8ff") },
          uIntensity: { value: 1.4 },
          uPower: { value: 3.2 },
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
}

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

interface StarfieldProps {
  readonly count: number;
}

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

function Starfield({ count }: StarfieldProps): JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const random = createRandom(0xa6f0ea);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const palette: readonly THREE.Color[] = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#dbeafe"),
      new THREE.Color("#bfdbfe"),
      new THREE.Color("#fde8c8"),
      new THREE.Color("#93c5fd"),
    ];

    for (let i = 0; i < count; i += 1) {
      // Uniform distribution inside a thick spherical shell → real depth.
      const radius = 18 + Math.cbrt(random()) * 70;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.35 + Math.pow(random(), 3) * 1.6;

      const color = palette[Math.floor(random() * palette.length)];
      const brightness = 0.55 + random() * 0.45;
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
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (pointsRef.current !== null) {
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

/* -------------------------------------------------------------------------- */
/*                             Cinematic camera rig                           */
/* -------------------------------------------------------------------------- */

interface CameraRigProps {
  readonly parallax: boolean;
}

const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

function CameraRig({ parallax }: CameraRigProps): null {
  useFrame((state, delta) => {
    const camera = state.camera;
    const t = state.clock.elapsedTime;

    // Slow orbital drift + breathing dolly.
    const angle = t * 0.05;
    const dolly = 4.4 + Math.sin(t * 0.12) * 0.28;

    const baseX = Math.sin(angle) * dolly * 0.35;
    const baseY = 0.55 + Math.sin(t * 0.09) * 0.22;
    const baseZ = Math.cos(angle * 0.6) * 0.2 + dolly;

    // Subtle pointer parallax on desktop only.
    const px = parallax ? state.pointer.x * 0.35 : 0;
    const py = parallax ? state.pointer.y * 0.2 : 0;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, baseX + px, 1.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, baseY + py, 1.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, baseZ, 1.5, delta);

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

function Scene({ quality, isMobile }: SceneProps): JSX.Element {
  return (
    <>
      <color attach="background" args={["#02040a"]} />

      {/* HDR image-based lighting */}
      <Environment files={HDR_ENVIRONMENT} environmentIntensity={0.35} />

      {/* Key "sun" light */}
      <directionalLight
        position={[6, 2.5, 4]}
        intensity={3.2}
        color="#fff4e0"
      />
      {/* Cool rim fill from deep space */}
      <directionalLight
        position={[-6, -1.5, -4]}
        intensity={0.25}
        color="#3b82f6"
      />
      <ambientLight intensity={0.06} />

      <Starfield count={quality.starCount} />
      <Earth quality={quality} />
      <Atmosphere />
      <CameraRig parallax={!isMobile} />

      {quality.postprocessing && (
        <EffectComposer multisampling={quality.multisampling}>
          <Bloom
            intensity={isMobile ? 0.55 : 0.85}
            luminanceThreshold={0.28}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.28} darkness={0.78} />
        </EffectComposer>
      )}
    </>
  );
}

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
  bottom: "26px",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 24px",
  borderRadius: "999px",
  background: "rgba(2, 6, 16, 0.6)",
  border: "1px solid rgba(34, 211, 238, 0.35)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "#22d3ee",
  fontWeight: 700,
  fontSize: "13px",
  letterSpacing: "3px",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  userSelect: "none",
};

const labelDotStyle: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#22d3ee",
  boxShadow: "0 0 12px rgba(34, 211, 238, 0.9)",
};

export default function AgxoraGlobe3D(): JSX.Element {
  const isMobile = useIsMobile();
  const quality = isMobile ? MOBILE_QUALITY : DESKTOP_QUALITY;

  return (
    <div style={containerStyle} aria-label="AGXORA AI CORE — 3D globe">
      <Canvas
        dpr={quality.dpr}
        camera={{ position: [0, 0.6, 4.4], fov: 42, near: 0.1, far: 300 }}
        gl={{
          antialias: !quality.postprocessing,
          powerPreference: "high-performance",
          alpha: false,
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
