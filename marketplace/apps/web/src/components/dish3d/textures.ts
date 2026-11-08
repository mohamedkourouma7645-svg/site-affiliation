import * as THREE from "three";

/** Small procedural canvas textures (no downloads): baked browning, salami fat, etc. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, THREE.Texture>();

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, r: () => number) => void, repeat = 1) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, rng(key.length * 7919 + key.charCodeAt(0)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat > 1) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, 1);
  }
  cache.set(key, tex);
  return tex;
}

function speckle(ctx: CanvasRenderingContext2D, r: () => number, n: number, colors: string[], min: number, max: number, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)]!;
    const rad = min + r() * (max - min);
    ctx.beginPath();
    ctx.ellipse(r() * ctx.canvas.width, r() * ctx.canvas.height, rad, rad * (0.6 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export const textures = {
  crust: (whole: boolean) =>
    make(`crust-${whole}`, 512, (ctx, r) => {
      ctx.fillStyle = whole ? "#b98552" : "#e2b06e";
      ctx.fillRect(0, 0, 512, 512);
      speckle(ctx, r, 900, whole ? ["#9b6a3c", "#c9965f", "#7d5230"] : ["#d79a55", "#eec48a", "#c88442"], 2, 10, 0.5);
      speckle(ctx, r, 60, ["#6b3d1a", "#5a3214", "#3d220e"], 4, 16, 0.55); // charred leopard spots
    }),
  sauce: (color: string) =>
    make(`sauce-${color}`, 256, (ctx, r) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, r, 260, ["rgba(0,0,0,0.25)", "rgba(255,255,255,0.18)"], 2, 9, 0.6);
      speckle(ctx, r, 70, ["#2f6b2a"], 1, 2.5, 0.8); // oregano
    }),
  salami: () =>
    make("salami", 256, (ctx, r) => {
      const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
      g.addColorStop(0, "#c8372b");
      g.addColorStop(0.92, "#9b2219");
      g.addColorStop(1, "#5e130d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, r, 70, ["#f3d2c2", "#ecc0ad"], 3, 9, 0.95);
      speckle(ctx, r, 120, ["#2a1410"], 0.8, 1.6, 0.6); // pepper
    }),
  ham: () =>
    make("ham", 128, (ctx, r) => {
      ctx.fillStyle = "#eba7a3";
      ctx.fillRect(0, 0, 128, 128);
      speckle(ctx, r, 60, ["#f6c9c4", "#d98d89"], 3, 10, 0.5);
    }),
  patty: () =>
    make("patty", 256, (ctx, r) => {
      ctx.fillStyle = "#4a2a1a";
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, r, 1600, ["#3a2013", "#5e3520", "#2f190e", "#6b3d24"], 1, 3.5, 0.6);
    }, 5),
  bunTop: () =>
    make("bun", 512, (ctx, r) => {
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#9a4f16");
      g.addColorStop(0.55, "#c9772b");
      g.addColorStop(1, "#e8b06a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      speckle(ctx, r, 400, ["rgba(255,255,255,0.08)", "rgba(0,0,0,0.08)"], 3, 14, 1);
    }),
  bacon: () =>
    make("bacon", 256, (ctx) => {
      for (let y = 0; y < 256; y += 32) {
        ctx.fillStyle = "#9c2a1e";
        ctx.fillRect(0, y, 256, 20);
        ctx.fillStyle = "#f0c4a6";
        ctx.fillRect(0, y + 20, 256, 12);
      }
    }),
  crispy: () =>
    make("crispy", 256, (ctx, r) => {
      ctx.fillStyle = "#d2913c";
      ctx.fillRect(0, 0, 256, 256);
      speckle(ctx, r, 900, ["#b26d22", "#e8b462", "#8f531b"], 1, 6, 0.8);
    }, 5),
};
