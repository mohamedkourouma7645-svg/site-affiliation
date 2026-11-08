"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Burger3D, burgerHeight } from "./Burger3D";
import { Pizza3D } from "./Pizza3D";

export interface DishLayer { key: string; quantity: number }

/** Real-time 3D view (React Three Fiber). Loaded lazily; the 2D fallback is used without WebGL. */
export default function Dish3D({ kind, layers, scale }: { kind: "pizza" | "burger"; layers: DishLayer[]; scale: number }) {
  const [interacted, setInteracted] = useState(false);
  const h = kind === "burger" ? burgerHeight(layers) : 0.1;
  const target: [number, number, number] = [0, kind === "burger" ? h * 0.45 : 0, 0];
  const camera = kind === "burger" ? { position: [0, h * 0.6 + 1.2, h * 1.6 + 2.6] as [number, number, number], fov: 36 } : { position: [0, 2.3, 2.0] as [number, number, number], fov: 40 };

  return (
    <Canvas shadows dpr={[1, 2]} camera={camera} gl={{ antialias: true, preserveDrawingBuffer: false }}>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#fff8ef", "#b9a48f", 0.9]} />
      <directionalLight position={[2.5, 5, 3]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2} shadow-camera-bottom={-2} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#ffd9b0" />
      {kind === "pizza" ? <Pizza3D layers={layers} scale={scale} /> : <Burger3D layers={layers} />}
      <ContactShadows position={[0, -0.06, 0]} opacity={0.45} scale={6} blur={2.6} far={3} />
      <OrbitControls
        target={target}
        enablePan={false}
        minDistance={kind === "burger" ? 2.4 : 1.6}
        maxDistance={6}
        maxPolarAngle={Math.PI * 0.47}
        autoRotate={!interacted}
        autoRotateSpeed={0.8}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
