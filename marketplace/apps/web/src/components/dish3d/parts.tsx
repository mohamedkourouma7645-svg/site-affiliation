"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { textures } from "./textures";

export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Animates its children dropping onto the surface when they first appear (no floating at rest). */
export function Drop({ children, height = 0.6, delay = 0 }: { children: ReactNode; height?: number; delay?: number }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (reduced) { g.position.y = 0; g.scale.setScalar(1); return; }
    if (start.current === null) start.current = clock.elapsedTime + delay;
    const t = Math.min(1, Math.max(0, (clock.elapsedTime - start.current) / 0.45));
    const c = 1.70158;
    const ease = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); // easeOutBack
    g.position.y = (1 - ease) * height;
    g.visible = clock.elapsedTime >= start.current;
  });
  return <group ref={ref} position={[0, height, 0]}>{children}</group>;
}

function displace(geo: THREE.BufferGeometry, fn: (v: THREE.Vector3) => void) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    fn(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function noise(x: number, y: number, z: number) {
  return Math.sin(x * 7.1 + y * 3.3) * Math.cos(z * 6.7 - x * 2.1) * 0.5 + Math.sin(z * 13.3 + x * 11.7) * 0.25;
}

/* ---------------- geometry factory (memoised per key) ---------------- */
const geoCache = new Map<string, THREE.BufferGeometry>();
export function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

export const G = {
  disc: (r: number, h: number, seg = 48) => geo(`disc-${r}-${h}-${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg)),
  blob: () => geo("blob", () => displace(new THREE.SphereGeometry(0.12, 20, 12), (v) => { v.y *= 0.2; v.multiplyScalar(1 + noise(v.x * 9, v.y, v.z * 9) * 0.18); })),
  mushroom: () => geo("mushroom", () => {
    const s = new THREE.Shape();
    s.moveTo(-0.09, 0); s.absarc(0, 0, 0.09, Math.PI, 0, true); s.lineTo(0.03, 0); s.lineTo(0.03, -0.07); s.lineTo(-0.03, -0.07); s.lineTo(-0.03, 0); s.lineTo(-0.09, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2); g.translate(0, 0, 0.02);
    return g;
  }),
  leaf: () => geo("leaf", () => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.11);
    for (let i = 0; i <= 8; i++) { const t = i / 8; const y = -0.11 + t * 0.22; const w = Math.sin(t * Math.PI) * (0.045 + (i % 2) * 0.02); s.lineTo(w, y); }
    for (let i = 8; i >= 0; i--) { const t = i / 8; const y = -0.11 + t * 0.22; const w = Math.sin(t * Math.PI) * (0.045 + ((i + 1) % 2) * 0.02); s.lineTo(-w, y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return displace(g, (v) => { v.y += Math.abs(v.x) * 0.25; });
  }),
  ring: (r: number, tube: number, arc = Math.PI * 2) => geo(`ring-${r}-${tube}-${arc}`, () => { const g = new THREE.TorusGeometry(r, tube, 10, 32, arc); g.rotateX(Math.PI / 2); return g; }),
  chunk: () => geo("chunk", () => displace(new THREE.DodecahedronGeometry(0.055, 1), (v) => { v.y *= 0.45; v.multiplyScalar(1 + noise(v.x * 20, v.y * 20, v.z * 20) * 0.15); })),
  box: (x: number, y: number, z: number) => geo(`box-${x}-${y}-${z}`, () => new THREE.BoxGeometry(x, y, z, 2, 1, 2)),
  corn: () => geo("corn", () => { const g = new THREE.SphereGeometry(0.022, 10, 8); g.scale(1, 0.7, 0.85); return g; }),
  crustRim: (R: number) => geo(`crustRim-${R}`, () => {
    const g = new THREE.TorusGeometry(R * 0.96, 0.065, 24, 160);
    g.rotateX(Math.PI / 2);
    return displace(g, (v) => {
      const a = Math.atan2(v.z, v.x);
      const puff = 1 + Math.sin(a * 7) * 0.05 + Math.sin(a * 17 + 1) * 0.04 + noise(v.x * 6, v.y * 6, v.z * 6) * 0.04;
      const r = Math.hypot(v.x, v.z), c = R * 0.96;
      const dx = (r - c) * puff, dy = v.y * puff * 1.1;
      v.x = Math.cos(a) * (c + dx); v.z = Math.sin(a) * (c + dx); v.y = Math.max(dy, -0.04);
    });
  }),
  // burger
  bunBottom: () => geo("bunBottom", () => new THREE.LatheGeometry([0, 0.95, 1.04, 1.08, 1.06, 1.0, 0].map((x, i) => new THREE.Vector2(x, [0, 0, 0.05, 0.14, 0.24, 0.3, 0.31][i]!)), 64)),
  bunTop: () => geo("bunTop", () => { const g = new THREE.SphereGeometry(1.1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.62, 1); return g; }),
  bunCut: () => geo("bunCut", () => { const g = new THREE.CircleGeometry(1.1, 64); g.rotateX(Math.PI / 2); return g; }),
  patty: (r: number, h: number, rough: number) => geo(`patty-${r}-${h}-${rough}`, () => displace(new THREE.CylinderGeometry(r, r * 0.98, h, 64, 6), (v) => {
    const k = 1 + noise(v.x * 3, v.y * 2, v.z * 3) * rough;
    v.x *= k; v.z *= k;
    if (Math.abs(v.y) > h / 2 - 0.001) v.y += noise(v.x * 9, 0, v.z * 9) * rough * 0.4 * Math.sign(v.y);
  })),
  cheese: () => geo("cheese", () => {
    const g = new THREE.PlaneGeometry(1.95, 1.95, 30, 30);
    g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 4);
    return displace(g, (v) => { const d = Math.hypot(v.x, v.z); if (d > 0.92) v.y -= Math.pow(d - 0.92, 1.4) * 0.55; });
  }),
  lettuce: () => geo("lettuce", () => {
    const g = new THREE.CircleGeometry(1.18, 120, 0, Math.PI * 2);
    g.rotateX(-Math.PI / 2);
    return displace(g, (v) => { const d = Math.hypot(v.x, v.z); const a = Math.atan2(v.z, v.x); v.y += Math.sin(a * 14) * 0.05 * Math.pow(d / 1.18, 2) + Math.sin(a * 37) * 0.015 * (d / 1.18); });
  }),
  sauce: () => geo("sauce", () => {
    const g = new THREE.CircleGeometry(1, 90);
    g.rotateX(-Math.PI / 2);
    return displace(g, (v) => { const d = Math.hypot(v.x, v.z); if (d > 0.5) { const a = Math.atan2(v.z, v.x); const k = 0.9 + Math.sin(a * 9) * 0.08 + Math.sin(a * 23) * 0.04; v.x *= k; v.z *= k; } });
  }),
  bacon: () => geo("bacon", () => { const g = new THREE.PlaneGeometry(2.0, 0.32, 60, 2); g.rotateX(-Math.PI / 2); return displace(g, (v) => { v.y += Math.sin(v.x * 7) * 0.045; }); }),
  eggWhite: () => geo("eggWhite", () => { const g = new THREE.CircleGeometry(0.95, 80); g.rotateX(-Math.PI / 2); return displace(g, (v) => { const a = Math.atan2(v.z, v.x); const d = Math.hypot(v.x, v.z); if (d > 0.4) { const k = 1 + Math.sin(a * 5) * 0.08 + Math.sin(a * 3 + 1) * 0.06; v.x *= k; v.z *= k; } }); }),
};

export const M = {
  std: (color: string, roughness = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => ({ color, roughness, metalness: 0, ...extra }),
};

export function useRandomPoints(key: string, n: number, radius: number) {
  return useMemo(() => {
    const r = seeded(key);
    return Array.from({ length: n }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * radius;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, rot: r() * Math.PI * 2, s: 0.85 + r() * 0.3, delay: r() * 0.25 };
    });
  }, [key, n, radius]);
}

export { textures, THREE };
