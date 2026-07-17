"use client";

/**
 * AGXORA — Cinematic Earth
 *
 * Enterprise-grade, photoreal 3D globe for the AGXORA command center.
 * Ultra-realistic PBR Earth, animated cloud shell, fresnel atmosphere,
 * HDR image-based lighting, deep parallax starfield, filmic bloom and
 * vignette, and a slow cinematic camera drift.
 */

import { Suspense, useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdaptiveDpr,
  Environment,
  Html,
  PerspectiveCamera,
  Preload,
  Stars,
  useTexture,
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS = 1;
const CLOUD_ALTITUDE = 1.012;
const ATMOSPHERE_SCALE = 1.055;

const EARTH_SPIN_SPEED = 0.028;
const CLOUD_SPIN_SPEED = 0.041;

const TEXTURES = {
  day: "/textures/earth_atmos_2048.jpg",
  normal: "/textures/earth_normal_2048.jpg",
  night: "/textures/earth_night_4096.jpg",
  clouds: "/textures/earth_clouds_1024.png",
} as const;

const HDR_ENVIRONMENT = "/hdr/potsdamer_platz_1k.hdr";

/* ------------------------------------------------------------------ */
/* Atmosphere — analytic fresnel rim shader                            */
/* ------------------------------------------------------------------ */

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
    float fresnel = pow(
      1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0),
      uPower
    );
    gl_FragColor = vec4(uColor, 1.0) * fresnel * uIntensity;
  }
`;

interface AtmosphereUniforms {
  uColor: THREE.IUniform<THREE.Color>;
  uIntensity: THREE.IUniform<number>;
  uPower: THREE.IUniform<number>;
  [uniform: string]: THREE.IUniform<unknown>;
}

function Atmosphere(): JSX.Element {
  const material = useMemo(() => {
    const uniforms: AtmosphereUniforms = {
      uColor: { value: new THREE.Color("#4a8bff") },
      uIntensity: { value: 0.5 },
      uPower: { value: 5.0 },
    };
    return new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={ATMOSPHERE_SCALE}>
      <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Earth — PBR surface, night lights, animated cloud shell             */
/* ------------------------------------------------------------------ */

function Earth(): JSX.Element {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, normalMap, nightMap, cloudMap] = useTexture(
    [TEXTURES.day, TEXTURES.normal, TEXTURES.night, TEXTURES.clouds],
    (textures) => {
      const [day, , night, clouds] = textures;
      day.colorSpace = THREE.SRGBColorSpace;
      night.colorSpace = THREE.SRGBColorSpace;
      day.anisotropy = 8;
      night.anisotropy = 8;
      clouds.anisotropy = 4;
      textures.forEach((texture) => {
        texture.needsUpdate = true;
      });
    },
  );

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * EARTH_SPIN_SPEED;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * CLOUD_SPIN_SPEED;
    }
  });

  return (
    <group rotation={[0.12, -1.1, 0.28]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          metalness={0}
          roughness={0.62}
          emissiveMap={nightMap}
          emissive={new THREE.Color("#ffddaa")}
          emissiveIntensity={0.85}
          envMapIntensity={0.45}
        />
      </mesh>

      {/* Thin animated cloud layer */}
      <mesh ref={cloudsRef} scale={CLOUD_ALTITUDE}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial
          alphaMap={cloudMap}
          color="#ffffff"
          transparent
          opacity={0.42}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <Atmosphere />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Floating "AGXORA AI CORE" label                                     */
/* ------------------------------------------------------------------ */

function CoreLabel(): JSX.Element {
  const anchorRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (anchorRef.current) {
      anchorRef.current.position.y =
        1.32 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
    }
  });

  return (
    <group ref={anchorRef} position={[0, 1.32, 0]}>
      <Html
        center
        transform={false}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            whiteSpace: "nowrap",
            padding: "10px 22px",
            borderRadius: "999px",
            background: "rgba(4, 10, 22, 0.62)",
            border: "1px solid rgba(120, 170, 255, 0.28)",
            boxShadow:
              "0 0 32px rgba(61, 125, 255, 0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            color: "rgba(226, 238, 255, 0.94)",
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "clamp(10px, 2.4vw, 13px)",
            fontWeight: 600,
            letterSpacing: "0.32em",
            textShadow: "0 0 18px rgba(120, 170, 255, 0.55)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#6ea8ff",
              boxShadow: "0 0 12px #6ea8ff",
            }}
          />
          AGXORA&nbsp;AI&nbsp;CORE
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cinematic camera rig — slow drift, dolly breathing, parallax        */
/* ------------------------------------------------------------------ */

function CinematicCamera(): JSX.Element {
  useFrame(({ camera, pointer, clock }, delta) => {
    const t = clock.elapsedTime;

    // Slow orbital drift with a gentle dolly "breath".
    const driftX = Math.sin(t * 0.05) * 0.38;
    const driftY = 0.18 + Math.sin(t * 0.033) * 0.1;
    const dolly = 4.15 + Math.sin(t * 0.021) * 0.14;

    // Subtle pointer parallax (inert on touch devices).
    const targetX = driftX + pointer.x * 0.18;
    const targetY = driftY + pointer.y * 0.12;

    const smoothing = 1 - Math.exp(-delta * 1.6);
    camera.position.x += (targetX - camera.position.x) * smoothing;
    camera.position.y += (targetY - camera.position.y) * smoothing;
    camera.position.z += (dolly - camera.position.z) * smoothing;

    camera.lookAt(0, 0, 0);
  });

  return (
    <PerspectiveCamera
      makeDefault
      fov={40}
      near={0.1}
      far={120}
      position={[0, 0.18, 4.15]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Lighting — HDR environment + key sun for the day/night terminator   */
/* ------------------------------------------------------------------ */

function Lighting(): JSX.Element {
  return (
    <>
      <Environment files={HDR_ENVIRONMENT} environmentIntensity={0.32} />
      <directionalLight
        position={[4.5, 1.6, 2.6]}
        intensity={5.6}
        color="#fff4e0"
      />
      <ambientLight intensity={0.16} color="#5a7ab0" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Deep starfield                                                      */
/* ------------------------------------------------------------------ */

function Starfield(): JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.0045;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={55}
        depth={50}
        count={5200}
        factor={4.4}
        saturation={0}
        fade
        speed={0.5}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Post-processing — filmic bloom + vignette                           */
/* ------------------------------------------------------------------ */

function PostFX(): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.85}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.22} darkness={0.82} />
    </EffectComposer>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Scene(): JSX.Element {
  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <CinematicCamera />
      <Lighting />
      <Starfield />
      <Earth />
      <CoreLabel />
      <PostFX />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export default function AgxoraGlobe3D(): JSX.Element {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(340px, 58vw, 560px)",
        borderRadius: "28px",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 42%, #071226 0%, #030710 55%, #010309 100%)",
        border: "1px solid rgba(120, 170, 255, 0.12)",
        boxShadow: "0 40px 120px rgba(0, 0, 0, 0.55)",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <Scene />
          <Preload all />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}