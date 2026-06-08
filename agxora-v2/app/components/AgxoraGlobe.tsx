"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Globe() {
  const nodes = [
    [1.8, 1.0, 1.6],
    [1.7, -0.5, 1.8],
    [1.1, 1.8, 1.5],
    [-1.8, 0.9, 1.7],
    [-1.4, -0.8, 1.9],
    [0.4, 2.0, 1.6],
    [0.8, -1.9, 1.5],
    [-0.6, 1.6, 2.0],
  ];

  return (
    <>
      <ambientLight intensity={2} />

      <pointLight
        position={[6, 6, 6]}
        intensity={3}
        color="#22d3ee"
      />

      <pointLight
        position={[-6, -6, -6]}
        intensity={1.5}
        color="#00ffff"
      />

      {/* Globe */}

      <mesh rotation={[0.3, 0.5, 0]}>
        <sphereGeometry args={[2.6, 96, 96]} />

        <meshStandardMaterial
          color="#081120"
          emissive="#22d3ee"
          emissiveIntensity={0.5}
          wireframe
        />
      </mesh>

      {/* Global Nodes */}

      {nodes.map((node, index) => (
        <mesh
          key={index}
          position={[node[0], node[1], node[2]]}
        >
          <sphereGeometry args={[0.07, 24, 24]} />

          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={3}
          />
        </mesh>
      ))}

      <OrbitControls
        autoRotate
        autoRotateSpeed={1.2}
        enableZoom={false}
      />
    </>
  );
}

export default function AgxoraGlobe() {
  return (
    <div
      style={{
        width: "100%",
        height: "520px",
        position: "relative",
      }}
    >
      <Canvas camera={{ position: [0, 0, 7] }}>
        <Globe />
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            color: "#22d3ee",
            fontSize: "14px",
            letterSpacing: "4px",
            fontWeight: "bold",
          }}
        >
          GLOBAL AI NETWORK
        </div>

        <div
          style={{
            color: "#ffffff",
            opacity: 0.8,
            marginTop: "8px",
            fontSize: "13px",
          }}
        >
          126 ACTIVE REGIONS
        </div>
      </div>
    </div>
  );
}