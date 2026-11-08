"use client";

import type { ReactNode } from "react";
import { Drop, G, seeded, textures } from "./parts";
import type { DishLayer } from "./Dish3D";

/** Builds the stack bottom → top; each layer knows its thickness so nothing floats. */
type Piece = { id: string; h: number; node: ReactNode };

const SAUCE_COLOR: Record<string, string> = { "burger-sosse": "#e8a868", ketchup: "#b3200f", mayonnaise: "#f7efd2", "bbq-sosse": "#5e2410" };

function Sesame() {
  const r = seeded("sesame");
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => {
        const a = r() * Math.PI * 2;
        const phi = r() * 1.15;
        const x = Math.sin(phi) * Math.cos(a) * 1.1, z = Math.sin(phi) * Math.sin(a) * 1.1, y = Math.cos(phi) * 1.1 * 0.62;
        return (
          <mesh key={i} position={[x, y + 0.006, z]} rotation={[-(phi * Math.cos(a)) * 0.6, a, phi * Math.sin(a) * 0.6]} geometry={G.corn()} scale={[0.6, 0.45, 1.2]}>
            <meshStandardMaterial color="#f5ead0" roughness={0.5} />
          </mesh>
        );
      })}
    </>
  );
}

export function Burger3D({ layers }: { layers: DishLayer[] }) {
  const q = (k: string) => layers.find((l) => l.key === k)?.quantity ?? 0;
  const whole = q("vollkorn-brotchen") > 0;
  const bunColor = whole ? "#b07a45" : "#e7b170";
  const pieces: Piece[] = [];
  const add = (id: string, h: number, node: ReactNode) => pieces.push({ id, h, node });

  add("bun-bottom", 0.31, <mesh geometry={G.bunBottom()} castShadow receiveShadow><meshStandardMaterial color={bunColor} roughness={0.7} /></mesh>);
  if (q("burger-sosse")) add("sauce-bottom", 0.012, <mesh geometry={G.sauce()} scale={0.95}><meshStandardMaterial color={SAUCE_COLOR["burger-sosse"]} roughness={0.3} /></mesh>);
  if (q("eisbergsalat")) for (let i = 0; i < q("eisbergsalat"); i++) add(`salat-${i}`, 0.07, <mesh geometry={G.lettuce()} castShadow receiveShadow rotation={[0, i, 0]}><meshStandardMaterial color="#79b443" roughness={0.55} side={2} /></mesh>);
  if (q("tomatenscheiben")) for (let i = 0; i < q("tomatenscheiben"); i++) add(`tomate-${i}`, 0.07, (
    <group rotation={[0, i * 0.7, 0]}>
      {[0, 2.1, 4.2].map((a) => (
        <group key={a} position={[Math.cos(a) * 0.45, 0.035, Math.sin(a) * 0.45]}>
          <mesh geometry={G.disc(0.42, 0.06, 36)} castShadow><meshPhysicalMaterial color="#d1351f" roughness={0.3} clearcoat={0.8} /></mesh>
          <mesh position={[0, 0.002, 0]} geometry={G.disc(0.3, 0.062, 36)}><meshStandardMaterial color="#ee6b4d" roughness={0.3} /></mesh>
        </group>
      ))}
    </group>
  ));

  const patties: { k: string; n: number; h: number; mat: ReactNode }[] = [
    { k: "rindfleisch-patty", n: q("rindfleisch-patty"), h: 0.26, mat: <meshPhysicalMaterial map={textures.patty()} roughness={0.75} bumpMap={textures.patty()} bumpScale={3} clearcoat={0.15} /> },
    { k: "crispy-chicken", n: q("crispy-chicken"), h: 0.28, mat: <meshStandardMaterial map={textures.crispy()} roughness={0.85} /> },
    { k: "veggie-patty", n: q("veggie-patty"), h: 0.24, mat: <meshStandardMaterial color="#7a6a3a" roughness={0.85} /> },
  ];
  let cheese = q("cheddar-scheibe");
  const totalPatties = patties.reduce((s, p) => s + p.n, 0);
  let placed = 0;
  for (const p of patties) {
    for (let i = 0; i < p.n; i++) {
      placed++;
      add(`${p.k}-${i}`, p.h, <mesh position={[0, p.h / 2, 0]} geometry={G.patty(1.02, p.h, p.k === "crispy-chicken" ? 0.03 : 0.015)} castShadow receiveShadow>{p.mat}</mesh>);
      // one slice per patty, the rest on the last patty
      const slices = placed === totalPatties ? cheese : Math.min(1, cheese);
      for (let s = 0; s < slices; s++) {
        cheese--;
        add(`cheddar-${placed}-${s}`, 0.018, <mesh geometry={G.cheese()} rotation={[0, s * 0.5, 0]} castShadow><meshPhysicalMaterial color="#f2a531" roughness={0.35} clearcoat={0.4} side={2} /></mesh>);
      }
    }
  }
  for (let s = 0; s < cheese; s++) add(`cheddar-x-${s}`, 0.018, <mesh geometry={G.cheese()} castShadow><meshPhysicalMaterial color="#f2a531" roughness={0.35} clearcoat={0.4} side={2} /></mesh>);

  for (let i = 0; i < q("bacon"); i++) add(`bacon-${i}`, 0.08, (
    <group rotation={[0, i * 1.2, 0]}>
      <mesh position={[0, 0.04, -0.2]} geometry={G.bacon()} castShadow><meshStandardMaterial map={textures.bacon()} roughness={0.55} side={2} /></mesh>
      <mesh position={[0, 0.045, 0.22]} rotation={[0, 0.15, 0]} geometry={G.bacon()} castShadow><meshStandardMaterial map={textures.bacon()} roughness={0.55} side={2} /></mesh>
    </group>
  ));
  for (let i = 0; i < q("rote-zwiebeln"); i++) add(`zwiebel-${i}`, 0.035, (
    <group rotation={[0, i, 0]}>
      {[[0.2, 0.1], [-0.35, -0.2], [0.1, -0.45], [-0.1, 0.45]].map(([x, z], j) => (
        <group key={j} position={[x!, 0.015, z!]}>
          <mesh geometry={G.ring(0.32, 0.018)} castShadow><meshStandardMaterial color="#9b4f8f" roughness={0.35} /></mesh>
          <mesh geometry={G.ring(0.22, 0.016)}><meshStandardMaterial color="#e9d3e6" roughness={0.35} /></mesh>
        </group>
      ))}
    </group>
  ));
  for (let i = 0; i < q("gewurzgurken"); i++) add(`gurke-${i}`, 0.04, (
    <group rotation={[0, i * 0.8, 0]}>
      {[[0.35, 0.2], [-0.4, 0.1], [0, -0.42], [0.05, 0.5]].map(([x, z], j) => (
        <mesh key={j} position={[x!, 0.02, z!]} geometry={G.disc(0.24, 0.035, 28)} castShadow><meshStandardMaterial color="#7c9a3a" roughness={0.4} /></mesh>
      ))}
    </group>
  ));
  if (q("spiegelei")) add("egg", 0.1, (
    <group>
      <mesh position={[0, 0.01, 0]} geometry={G.eggWhite()} scale={0.85} castShadow receiveShadow><meshStandardMaterial color="#fbfaf4" roughness={0.35} side={2} /></mesh>
      <mesh position={[0.1, 0.02, -0.05]} scale={[1, 0.5, 1]}><sphereGeometry args={[0.28, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f5a213" roughness={0.2} /></mesh>
    </group>
  ));
  for (const s of ["ketchup", "mayonnaise", "bbq-sosse"]) if (q(s)) add(`sauce-${s}`, 0.012, <mesh geometry={G.sauce()} scale={0.85} rotation={[0, s.length, 0]}><meshStandardMaterial color={SAUCE_COLOR[s]} roughness={0.3} /></mesh>);
  add("bun-top", 0.7, (
    <group>
      <mesh geometry={G.bunCut()} scale={0.97}><meshStandardMaterial color="#e2b47a" roughness={0.9} /></mesh>
      <mesh geometry={G.bunTop()} castShadow><meshPhysicalMaterial map={textures.bunTop()} color={whole ? "#c49466" : "#ffffff"} roughness={0.45} clearcoat={0.45} clearcoatRoughness={0.35} /></mesh>
      <Sesame />
    </group>
  ));

  let y = 0;
  return (
    <group>
      <mesh position={[0, -0.03, 0]} receiveShadow geometry={G.disc(1.6, 0.05, 72)}><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh>
      {pieces.map((p) => {
        const at = y;
        y += p.h;
        return (
          <group key={p.id} position={[0, at, 0]}>
            <Drop height={0.9}>{p.node}</Drop>
          </group>
        );
      })}
    </group>
  );
}

export function burgerHeight(layers: DishLayer[]) {
  const q = (k: string) => layers.find((l) => l.key === k)?.quantity ?? 0;
  return 0.31 + 0.7 + q("eisbergsalat") * 0.07 + q("tomatenscheiben") * 0.07 + (q("rindfleisch-patty") + q("crispy-chicken") + q("veggie-patty")) * 0.27 + q("bacon") * 0.08 + q("spiegelei") * 0.1;
}
