"use client";

import { memo } from "react";

/**
 * 2D fallback renderer for the pizza configurator (SVG). It is driven by the
 * same layer data the 3D renderer (Phase 5, React Three Fiber + GLB models)
 * will use, so the configurator logic does not change when 3D is added.
 */
export interface PreviewLayer { key: string; quantity: number; groupOrder: number }

function rng(seed: string) {
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

const C = 150; // centre

function points(key: string, n: number, radius: number) {
  const r = rng(key);
  return Array.from({ length: n }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    return { x: C + Math.cos(a) * d, y: C + Math.sin(a) * d, rot: r() * 360, s: 0.85 + r() * 0.3 };
  });
}

function Piece({ k, x, y, rot, s }: { k: string; x: number; y: number; rot: number; s: number }) {
  const t = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})`;
  switch (k) {
    case "salami":
      return <g transform={t}><circle r="11" fill="url(#salami)" /><circle cx="-3" cy="-2" r="1.6" fill="#f4d3c4" /><circle cx="4" cy="3" r="1.3" fill="#f4d3c4" /><circle cx="2" cy="-5" r="1.1" fill="#f4d3c4" /></g>;
    case "pepperoni-wurst":
      return <g transform={t}><circle r="7.5" fill="#a5281a" /><circle r="7.5" fill="none" stroke="#7a1b10" strokeWidth="1.2" /><circle cx="-2" cy="1" r="1" fill="#e9b2a1" /></g>;
    case "schinken":
      return <path transform={t} d="M-10,-6 Q0,-11 10,-5 Q12,4 4,8 Q-6,10 -11,3 Z" fill="#e8a3a0" stroke="#d48683" strokeWidth="1" />;
    case "hahnchen":
      return <path transform={t} d="M-8,-5 Q-2,-9 7,-6 Q10,0 6,6 Q-3,8 -9,3 Z" fill="#e6c08a" stroke="#c99a5f" strokeWidth="1" />;
    case "thunfisch":
      return <path transform={t} d="M-7,-3 Q-1,-7 6,-4 Q8,2 2,5 Q-6,6 -8,1 Z" fill="#c9a98a" stroke="#a8876a" strokeWidth="0.8" />;
    case "champignons":
      return <g transform={t}><path d="M-9,1 Q-9,-9 0,-9 Q9,-9 9,1 Z" fill="#e3d6c3" stroke="#a89884" strokeWidth="1" /><rect x="-2.5" y="0" width="5" height="7" rx="2" fill="#efe5d6" stroke="#a89884" strokeWidth="1" /></g>;
    case "zwiebeln":
      return <ellipse transform={t} rx="9" ry="6" fill="none" stroke="#b07bb0" strokeWidth="2" opacity="0.9" />;
    case "oliven":
      return <g transform={t}><circle r="5" fill="#1f1d1a" /><circle r="2" fill="#5b4f3c" /></g>;
    case "paprika":
      return <path transform={t} d="M-10,0 Q0,-7 10,0" fill="none" stroke="#2f8a3a" strokeWidth="3.4" strokeLinecap="round" />;
    case "tomaten":
      return <g transform={t}><circle r="9" fill="#d8402a" /><circle r="6" fill="#ef7a5e" /><circle cx="-2" cy="1" r="1" fill="#f7d48a" /><circle cx="2" cy="-2" r="1" fill="#f7d48a" /></g>;
    case "mais":
      return <circle transform={t} r="2.6" fill="#f2c230" stroke="#d29f12" strokeWidth="0.6" />;
    case "ananas":
      return <path transform={t} d="M-6,-5 L6,-5 L8,5 L-8,5 Z" fill="#f5d55a" stroke="#d9b63a" strokeWidth="1" />;
    case "chili":
      return <path transform={t} d="M-6,0 Q0,-3 6,0 Q0,2 -6,0 Z" fill="#c4161c" />;
    case "rucola":
      return <path transform={t} d="M0,-10 Q7,-4 3,0 Q8,3 2,7 Q0,10 -2,7 Q-8,3 -3,0 Q-7,-4 0,-10 Z" fill="#4f8c34" stroke="#3a6e25" strokeWidth="0.8" />;
    case "mozzarella":
      return <path transform={t} d="M-12,-4 Q-6,-12 4,-9 Q13,-6 11,3 Q7,11 -3,10 Q-13,7 -12,-4 Z" fill="#fbf4df" opacity="0.95" />;
    case "cheddar":
      return <path transform={t} d="M-10,-4 Q-4,-10 5,-8 Q11,-3 9,4 Q4,10 -4,8 Q-11,4 -10,-4 Z" fill="#f2a93b" opacity="0.92" />;
    case "parmesan":
      return <path transform={t} d="M-5,-2 L4,-4 L6,2 L-3,4 Z" fill="#f6ecc6" stroke="#dccf9f" strokeWidth="0.6" />;
    default:
      return <circle transform={t} r="5" fill="#8a7a62" />;
  }
}

const PER_UNIT: Record<string, number> = { mais: 26, oliven: 10, chili: 10, parmesan: 18, mozzarella: 11, cheddar: 9, rucola: 9 };

export const PizzaPreview = memo(function PizzaPreview({ layers, scale }: { layers: PreviewLayer[]; scale: number }) {
  const R = 128 * Math.max(0.6, Math.min(1, scale));
  const has = (k: string) => layers.some((l) => l.key === k && l.quantity > 0);
  const dough = has("vollkornteig") ? "url(#dough-wholegrain)" : "url(#dough)";
  const sauce = has("bbq-sosse") ? "#6e2a13" : has("creme-fraiche") ? "#f1e7d2" : has("tomatensosse") ? "url(#tomato)" : null;
  const toppings = layers.filter((l) => !["klassischer-teig", "vollkornteig", "tomatensosse", "bbq-sosse", "creme-fraiche"].includes(l.key)).sort((a, b) => a.groupOrder - b.groupOrder || (a.key === "rucola" ? 1 : 0) - (b.key === "rucola" ? 1 : 0));

  return (
    <svg viewBox="0 0 300 300" role="img" aria-label="Vorschau deiner Pizza" className="pizza-svg">
      <defs>
        <radialGradient id="dough" cx="45%" cy="40%" r="65%"><stop offset="0%" stopColor="#f3d09a" /><stop offset="80%" stopColor="#dca463" /><stop offset="100%" stopColor="#a8682e" /></radialGradient>
        <radialGradient id="dough-wholegrain" cx="45%" cy="40%" r="65%"><stop offset="0%" stopColor="#c99a68" /><stop offset="80%" stopColor="#a6743f" /><stop offset="100%" stopColor="#6e4520" /></radialGradient>
        <radialGradient id="tomato" cx="50%" cy="45%" r="60%"><stop offset="0%" stopColor="#d94a2b" /><stop offset="100%" stopColor="#a8301a" /></radialGradient>
        <radialGradient id="salami" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#d24b3b" /><stop offset="100%" stopColor="#962418" /></radialGradient>
        <radialGradient id="plate" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#ece6dc" /></radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="piece-shadow"><feDropShadow dx="0.6" dy="1.2" stdDeviation="0.8" floodOpacity="0.35" /></filter>
      </defs>
      <ellipse cx={C} cy={C + 10} rx="146" ry="140" fill="#000" opacity="0.12" filter="url(#soft)" />
      <circle cx={C} cy={C} r="146" fill="url(#plate)" />
      <circle cx={C} cy={C + 4} r={R + 2} fill="#000" opacity="0.18" filter="url(#soft)" />
      <circle cx={C} cy={C} r={R} fill={dough} className="layer" />
      {sauce && <circle cx={C} cy={C} r={R * 0.86} fill={sauce} className="layer" />}
      <g filter="url(#piece-shadow)">
        {toppings.map((l) =>
          points(l.key, Math.round(l.quantity * (PER_UNIT[l.key] ?? 7) * (R / 128)), R * 0.76).map((p, i) => (
            <g key={`${l.key}-${i}`} className="piece">
              <Piece k={l.key} {...p} />
            </g>
          )),
        )}
      </g>
    </svg>
  );
});
