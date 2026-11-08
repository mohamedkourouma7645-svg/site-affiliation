"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { DishLayer } from "./Dish3D";

const Dish3D = dynamic(() => import("./Dish3D"), { ssr: false, loading: () => <div className="dish-loading" aria-hidden="true" /> });

function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
let support: boolean | null = null;
const getSupport = () => (support ??= webglSupported());

/** Chooses 3D when the device supports WebGL, otherwise the provided 2D fallback. */
export function DishViewer({ kind, layers, scale, fallback }: { kind: "pizza" | "burger"; layers: DishLayer[]; scale: number; fallback: React.ReactNode }) {
  const ok = useSyncExternalStore(() => () => {}, getSupport, () => false);
  const forced2d = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ansicht") === "2d";
  if (!ok || forced2d) return <>{fallback}</>;
  return (
    <div className="dish-3d" data-testid="dish-3d" role="img" aria-label={kind === "pizza" ? "3D-Ansicht deiner Pizza" : "3D-Ansicht deines Burgers"}>
      <Dish3D kind={kind} layers={layers} scale={scale} />
    </div>
  );
}
