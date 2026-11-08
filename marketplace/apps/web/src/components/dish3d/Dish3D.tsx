"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Burger3D, burgerHeight } from "./Burger3D";
import { Pizza3D } from "./Pizza3D";

export interface DishLayer { key: string; quantity: number }

/** Real-time 3D view (React Three Fiber). Loaded lazily; the 2D fallback is used without WebGL. */
export default function Dish3D({ kind, layers, scale }: { kind: "pizza" | "burger"; layers: DishLayer[]; scale: number }) {
  const [interacted, setInteracted] = useState(false);
  // Render continuously only while something moves (drop-in animation, short intro
  // rotation, user dragging); otherwise render on demand to save battery/CPU.
  const [animating, setAnimating] = useState(true);
  const [intro, setIntro] = useState(true);
  const signature = layers.map((l) => `${l.key}:${l.quantity}`).join("|") + scale;
  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 1500);
    return () => clearTimeout(t);
  }, [signature]);
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 6000);
    return () => clearTimeout(t);
  }, []);
  const spinning = intro && !interacted;
  // Phones/tablets: lighter pipeline (no shadow maps, lower pixel ratio, cheaper contact shadow).
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const h = kind === "burger" ? burgerHeight(layers) : 0.1;
  const target: [number, number, number] = [0, kind === "burger" ? h * 0.45 : 0, 0];
  const camera = kind === "burger" ? { position: [0, h * 0.6 + 1.2, h * 1.6 + 2.6] as [number, number, number], fov: 36 } : { position: [0, 2.3, 2.0] as [number, number, number], fov: 40 };

  return (
    <Canvas frameloop={animating || spinning ? "always" : "demand"} shadows={!touch} dpr={touch ? [1, 1.5] : [1, 1.75]} camera={camera} gl={{ antialias: true, preserveDrawingBuffer: false }}>
      {/* Studio lighting baked locally from light panels (no HDRI download) for realistic reflections */}
      <Environment resolution={256} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2.5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd8b0" position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[5, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 2, 6]} scale={3} />
      </Environment>
      <ambientLight intensity={0.2} />
      <hemisphereLight args={["#fff8ef", "#b9a48f", 0.55]} />
      <directionalLight position={[2.5, 5, 3]} intensity={2.0} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2} shadow-camera-bottom={-2} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#ffd9b0" />
      {kind === "pizza" ? <Pizza3D layers={layers} scale={scale} /> : <Burger3D layers={layers} />}
      <ContactShadows position={[0, -0.06, 0]} opacity={0.45} scale={6} blur={2.6} far={3} resolution={touch ? 256 : 512} frames={animating || spinning ? Infinity : 1} />
      <OrbitControls
        target={target}
        enablePan={false}
        minDistance={kind === "burger" ? 2.4 : 1.6}
        maxDistance={6}
        maxPolarAngle={Math.PI * 0.47}
        autoRotate={spinning}
        autoRotateSpeed={0.8}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
