"use client";

import { Drop, G, textures, useRandomPoints } from "./parts";
import type { DishLayer } from "./Dish3D";

const SAUCE: Record<string, string> = { tomatensosse: "#b8321b", "bbq-sosse": "#5e2410", "creme-fraiche": "#f2ead8" };
/** pieces per portion, radius factor */
const PER: Record<string, number> = { mozzarella: 9, cheddar: 8, parmesan: 18, salami: 7, "pepperoni-wurst": 9, schinken: 6, hahnchen: 9, thunfisch: 9, champignons: 8, zwiebeln: 8, oliven: 10, paprika: 8, tomaten: 6, mais: 26, ananas: 9, chili: 9, rucola: 10 };

function Toppings({ k, n, R, y }: { k: string; n: number; R: number; y: number }) {
  const pts = useRandomPoints(k, n, R * 0.74);
  return (
    <>
      {pts.map((p, i) => (
        <Drop key={i} delay={p.delay}>
          <group position={[p.x, y, p.z]} rotation={[0, p.rot, 0]} scale={p.s}>
            <Piece k={k} />
          </group>
        </Drop>
      ))}
    </>
  );
}

function Piece({ k }: { k: string }) {
  switch (k) {
    case "mozzarella": return <mesh geometry={G.blob()} castShadow><meshStandardMaterial color="#fbf3dc" roughness={0.45} /></mesh>;
    case "cheddar": return <mesh geometry={G.blob()} castShadow><meshStandardMaterial color="#f0a330" roughness={0.45} /></mesh>;
    case "parmesan": return <mesh geometry={G.box(0.05, 0.008, 0.03)}><meshStandardMaterial color="#f4e9c1" roughness={0.8} /></mesh>;
    case "salami": return <mesh geometry={G.disc(0.115, 0.018, 32)} castShadow><meshStandardMaterial map={textures.salami()} roughness={0.55} /></mesh>;
    case "pepperoni-wurst": return <mesh geometry={G.disc(0.075, 0.016, 28)} castShadow><meshStandardMaterial map={textures.salami()} roughness={0.5} /></mesh>;
    case "schinken": return <mesh geometry={G.box(0.17, 0.012, 0.11)} castShadow><meshStandardMaterial map={textures.ham()} roughness={0.6} /></mesh>;
    case "hahnchen": return <mesh geometry={G.chunk()} castShadow><meshStandardMaterial color="#e2b97f" roughness={0.75} /></mesh>;
    case "thunfisch": return <mesh geometry={G.chunk()} scale={[0.8, 0.6, 0.8]} castShadow><meshStandardMaterial color="#c4a07f" roughness={0.85} /></mesh>;
    case "champignons": return <mesh geometry={G.mushroom()} castShadow><meshStandardMaterial color="#e6dac7" roughness={0.7} /></mesh>;
    case "zwiebeln": return <mesh geometry={G.ring(0.075, 0.008)} castShadow><meshStandardMaterial color="#b98ab8" roughness={0.4} /></mesh>;
    case "oliven": return <mesh geometry={G.ring(0.032, 0.016)} castShadow><meshStandardMaterial color="#1c1a17" roughness={0.25} /></mesh>;
    case "paprika": return <mesh geometry={G.ring(0.09, 0.016, Math.PI * 0.8)} castShadow><meshStandardMaterial color="#2f8a3a" roughness={0.35} /></mesh>;
    case "tomaten":
      return (
        <group>
          <mesh geometry={G.disc(0.1, 0.02, 28)} castShadow><meshStandardMaterial color="#d23a22" roughness={0.35} /></mesh>
          <mesh geometry={G.disc(0.07, 0.022, 28)}><meshStandardMaterial color="#ef7658" roughness={0.3} /></mesh>
        </group>
      );
    case "mais": return <mesh geometry={G.corn()}><meshStandardMaterial color="#f3c331" roughness={0.4} /></mesh>;
    case "ananas": return <mesh geometry={G.box(0.08, 0.028, 0.06)} castShadow><meshStandardMaterial color="#f4d35a" roughness={0.45} /></mesh>;
    case "chili": return <mesh geometry={G.ring(0.05, 0.01, Math.PI * 0.7)}><meshStandardMaterial color="#c4161c" roughness={0.35} /></mesh>;
    case "rucola": return <mesh geometry={G.leaf()} castShadow><meshStandardMaterial color="#4f8c34" roughness={0.6} side={2} /></mesh>;
    default: return <mesh geometry={G.chunk()}><meshStandardMaterial color="#8a7a62" /></mesh>;
  }
}

const BASE_KEYS = new Set(["klassischer-teig", "vollkornteig", ...Object.keys(SAUCE)]);
const CHEESE = new Set(["mozzarella", "cheddar", "parmesan"]);

export function Pizza3D({ layers, scale }: { layers: DishLayer[]; scale: number }) {
  const R = 1 * scale;
  const has = (k: string) => layers.some((l) => l.key === k);
  const sauce = Object.keys(SAUCE).find(has);
  const cheese = layers.filter((l) => CHEESE.has(l.key));
  const tops = layers.filter((l) => !BASE_KEYS.has(l.key) && !CHEESE.has(l.key)).sort((a, b) => (a.key === "rucola" ? 1 : 0) - (b.key === "rucola" ? 1 : 0));
  const crust = textures.crust(has("vollkornteig"));
  return (
    <group>
      {/* plate */}
      <mesh position={[0, -0.04, 0]} receiveShadow geometry={G.disc(1.45, 0.05, 72)}><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh>
      {/* dough + raised rim (cornicione) */}
      <mesh position={[0, 0.0, 0]} receiveShadow castShadow geometry={G.disc(R, 0.05, 72)}><meshStandardMaterial map={crust} roughness={0.8} /></mesh>
      <mesh position={[0, 0.035, 0]} castShadow geometry={G.ring(R * 0.97, 0.055 * Math.max(0.8, scale))}><meshStandardMaterial map={crust} roughness={0.75} /></mesh>
      {sauce && (
        <Drop key={sauce} height={0.25}>
          <mesh position={[0, 0.03, 0]} receiveShadow geometry={G.disc(R * 0.88, 0.012, 72)}><meshStandardMaterial map={textures.sauce(SAUCE[sauce]!)} roughness={0.45} /></mesh>
        </Drop>
      )}
      {cheese.map((c) => <Toppings key={c.key} k={c.key} n={Math.round(c.quantity * (PER[c.key] ?? 8) * scale)} R={R} y={0.045} />)}
      {tops.map((t, i) => <Toppings key={t.key} k={t.key} n={Math.round(t.quantity * (PER[t.key] ?? 7) * scale)} R={R} y={0.06 + i * 0.004} />)}
    </group>
  );
}
