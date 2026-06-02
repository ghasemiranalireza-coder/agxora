"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Globe() {
  return (
    <>
      <ambientLight intensity={1.5} />

      <pointLight position={[5, 5, 5]} intensity={2} color="#22d3ee" />

      <mesh rotation={[0.3, 0.5, 0]}>
        <sphereGeometry args={[2, 64, 64]} />

        <meshStandardMaterial
          color="#0a1f44"
          emissive="#22d3ee"
          emissiveIntensity={0.4}
          wireframe
        />
      </mesh>

      {/* Germany */}
      <mesh position={[1.4, 0.8, 1.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>

      {/* Dubai */}
      <mesh position={[1.7, -0.2, 0.9]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>

      {/* London */}
      <mesh position={[1.2, 1.0, 1.2]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>

      {/* New York */}
      <mesh position={[-1.3, 0.7, 1.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>

      <OrbitControls
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.5}
      />
    </>
  );
}

export default function AgxoraGlobe() {
  return (
    <div
      style={{
        width: "100%",
        height: "450px",
      }}
    >
      <Canvas camera={{ position: [0, 0, 6] }}>
        <Globe />
      </Canvas>
    </div>
  );
}