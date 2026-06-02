"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CoreSphere() {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.003;
      sphereRef.current.rotation.x += 0.001;
    }
  });

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[2, 64, 64]} />

      <meshStandardMaterial
        color="#0b1e42"
        emissive="#22d3ee"
        emissiveIntensity={0.7}
        wireframe
      />
    </mesh>
  );
}

function CityNode({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.09, 32, 32]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive="#22d3ee"
        emissiveIntensity={2}
      />
    </mesh>
  );
}

export default function AgxoraGlobe() {
  return (
    <div
      style={{
        width: "100%",
        height: "500px",
      }}
    >
      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight intensity={1.2} />

        <pointLight
          position={[5, 5, 5]}
          intensity={3}
          color="#22d3ee"
        />

        <pointLight
          position={[-5, -5, -5]}
          intensity={1.5}
          color="#2563eb"
        />

        <CoreSphere />

        {/* Germany */}
        <CityNode position={[1.4, 0.8, 1.1]} />

        {/* Dubai */}
        <CityNode position={[1.7, -0.2, 0.9]} />

        {/* London */}
        <CityNode position={[1.2, 1.0, 1.2]} />

        {/* New York */}
        <CityNode position={[-1.3, 0.7, 1.1]} />

        <OrbitControls
          autoRotate
          autoRotateSpeed={1.2}
          enableZoom={false}
        />
      </Canvas>
    </div>
  );
}