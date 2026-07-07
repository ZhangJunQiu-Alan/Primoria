"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import type { MoleculeArtifact } from "@/lib/agent-os";

type Repr = "ball_stick" | "stick" | "sphere";

const CPK: Record<string, string> = {
  H: "#FFFFFF", He: "#D9FFFF", Li: "#CC80FF", Be: "#C2FF00",
  B: "#FFB5B5", C: "#404040", N: "#3050F8", O: "#FF0D0D",
  F: "#90E050", Ne: "#B3E3F5", Na: "#AB5CF2", Mg: "#8AFF00",
  Al: "#BFA6A6", Si: "#F0C8A0", P: "#FF8000", S: "#FFFF30",
  Cl: "#1FF01F", K: "#8F40D4", Ca: "#3DFF00",
  Fe: "#E06633", Cu: "#C88033", Zn: "#7D80B0", Br: "#A62929", I: "#940094",
};
const COV: Record<string, number> = {
  H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Si: 1.11,
  P: 1.07, S: 1.05, Cl: 1.02, Br: 1.20, I: 1.39,
};
const VDW: Record<string, number> = {
  H: 1.20, C: 1.70, N: 1.55, O: 1.52, F: 1.47, Si: 2.10,
  P: 1.80, S: 1.80, Cl: 1.75, Br: 1.85, I: 1.98,
};

function atomColor(el: string) { return CPK[el] ?? "#FF69B4"; }
function covR(el: string) { return COV[el] ?? 0.80; }
function vdwR(el: string) { return VDW[el] ?? 1.70; }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF];
}
function lighten(hex: string, d: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + d)},${Math.min(255, g + d)},${Math.min(255, b + d)})`;
}
function darken(hex: string, d: number) { return lighten(hex, -d); }
function brightness(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function centerAtoms(atoms: MoleculeArtifact["atoms"]) {
  if (!atoms.length) return { atoms: [] as MoleculeArtifact["atoms"], scale0: 100 };
  const cx = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
  const cy = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
  const cz = atoms.reduce((s, a) => s + a.z, 0) / atoms.length;
  const centered = atoms.map(a => ({ ...a, x: a.x - cx, y: a.y - cy, z: a.z - cz }));
  const maxDist = Math.max(...centered.map(a => Math.hypot(a.x, a.y, a.z)), 1);
  return { atoms: centered, scale0: 80 / maxDist };
}

export function MoleculeRenderer({ artifact }: { artifact: MoleculeArtifact }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rxRef = useRef(0.35);
  const ryRef = useRef(0.4);
  const zoomRef = useRef(1.0);
  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const [repr, setRepr] = useState<Repr>(() => artifact.representation ?? "ball_stick");
  const [prevRepresentation, setPrevRepresentation] = useState(artifact.representation);
  if (artifact.representation !== prevRepresentation) {
    setPrevRepresentation(artifact.representation);
    setRepr(artifact.representation ?? "ball_stick");
  }

  const centeredData = useMemo(() => centerAtoms(artifact.atoms), [artifact.atoms]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1523";
    ctx.fillRect(0, 0, W, H);

    const { atoms: centered, scale0 } = centeredData;
    const scale = scale0 * zoomRef.current;
    const rx = rxRef.current, ry = ryRef.current;
    const rep = repr;

    function project(x: number, y: number, z: number) {
      const y1 = y * Math.cos(rx) - z * Math.sin(rx);
      const z1 = y * Math.sin(rx) + z * Math.cos(rx);
      const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
      const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      return { sx: cx + scale * x2, sy: cy - scale * y1, sz: z2 };
    }

    const proj = centered.map(a => ({ ...a, ...project(a.x, a.y, a.z) }));
    const byId = new Map(proj.map(a => [a.id, a]));

    // Bonds (drawn before atoms so atoms appear on top)
    if (rep !== "sphere") {
      for (const bond of artifact.bonds) {
        const a = byId.get(bond.atomA), b = byId.get(bond.atomB);
        if (!a || !b) continue;
        const order = bond.order ?? 1;
        const dx = b.sx - a.sx, dy = b.sy - a.sy;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) continue;
        const px = -dy / len, py = dx / len;
        const lw = Math.max(1.5, scale * 0.07);
        const off = lw * 0.85;

        let t0 = 0, t1 = 1;
        if (rep === "ball_stick") {
          t0 = Math.min((covR(a.element) * scale * 0.52) / len, 0.45);
          t1 = 1 - Math.min((covR(b.element) * scale * 0.52) / len, 0.45);
        }

        ctx.strokeStyle = "#7a7a8a";
        ctx.lineWidth = lw;
        ctx.lineCap = "round";

        const offsets =
          order === 3 ? [-off * 1.4, 0, off * 1.4] :
          order === 2 ? [-off * 0.7, off * 0.7] :
          [0];

        for (const o of offsets) {
          ctx.beginPath();
          ctx.moveTo(a.sx + dx * t0 + px * o, a.sy + dy * t0 + py * o);
          ctx.lineTo(a.sx + dx * t1 + px * o, a.sy + dy * t1 + py * o);
          ctx.stroke();
        }
      }
    }

    // Atoms — depth-sorted back to front
    const sorted = [...proj].sort((a, b) => a.sz - b.sz);
    for (const atom of sorted) {
      const color = atomColor(atom.element);
      const r =
        rep === "sphere" ? vdwR(atom.element) * scale * 0.36 :
        rep === "ball_stick" ? covR(atom.element) * scale * 0.56 :
        Math.max(2, scale * 0.07);
      if (r < 0.5) continue;

      const grad = ctx.createRadialGradient(
        atom.sx - r * 0.3, atom.sy - r * 0.3, r * 0.04,
        atom.sx, atom.sy, r,
      );
      grad.addColorStop(0, lighten(color, 90));
      grad.addColorStop(0.32, color);
      grad.addColorStop(1, darken(color, 70));

      ctx.beginPath();
      ctx.arc(atom.sx, atom.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Labels: skip H in ball_stick (too small), show all in sphere
      const showLabel = rep === "sphere" ? r > 10 : (atom.element !== "H" && r > 7);
      if (showLabel) {
        const fs = Math.max(8, Math.min(13, r * 0.62));
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = brightness(color) > 140 ? "#111" : "#fff";
        ctx.fillText(atom.element, atom.sx, atom.sy);
      }
    }
  }

  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => { drawRef.current(); }, [artifact, repr]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = { px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    ryRef.current += (e.clientX - dragRef.current.px) * 0.01;
    rxRef.current = Math.max(-1.5, Math.min(1.5, rxRef.current + (e.clientY - dragRef.current.py) * 0.01));
    dragRef.current = { px: e.clientX, py: e.clientY };
    drawRef.current();
  }
  function onPointerUp() { dragRef.current = null; }
  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    zoomRef.current = Math.max(0.3, Math.min(5, zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9)));
    drawRef.current();
  }
  function reset() {
    rxRef.current = 0.35;
    ryRef.current = 0.4;
    zoomRef.current = 1;
    drawRef.current();
  }
  function switchRepr(r: Repr) {
    setRepr(r);
    drawRef.current();
  }

  const counts = artifact.atoms.reduce<Record<string, number>>((acc, a) => {
    acc[a.element] = (acc[a.element] ?? 0) + 1;
    return acc;
  }, {});
  const formula = Object.entries(counts)
    .sort(([a], [b]) => (a === "C" ? -2 : a === "H" ? -1 : 0) - (b === "C" ? -2 : b === "H" ? -1 : 0))
    .map(([el, n]) => el + (n > 1 ? n : ""))
    .join("");

  return (
    <div className="message-row tool">
      <div className="tool-card" style={{ overflow: "hidden" }}>
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{artifact.title}</span>
        </div>
        <div style={{ padding: "6px 12px 2px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: "#c8881a", fontWeight: 600 }}>
            {formula}
          </span>
          <span style={{ fontSize: 12, color: "#888", flex: 1 }}>{artifact.description}</span>
          <button
            onClick={reset}
            style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#2a2a3a", color: "#ccc", border: "1px solid #444", cursor: "pointer" }}
          >
            Reset
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={560}
          height={380}
          style={{ display: "block", width: "100%", cursor: "grab", touchAction: "none", userSelect: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        />
        <div style={{ padding: "6px 12px 8px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {(["ball_stick", "stick", "sphere"] as Repr[]).map(r => (
            <button
              key={r}
              onClick={() => switchRepr(r)}
              style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                background: repr === r ? "#c8881a" : "#2a2a3a",
                color: repr === r ? "#fff" : "#aaa",
                border: `1px solid ${repr === r ? "#c8881a" : "#444"}`,
              }}
            >
              {r === "ball_stick" ? "Ball & Stick" : r === "stick" ? "Stick" : "Space-Fill"}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {Object.keys(counts).map(el => (
            <span key={el} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#ccc" }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%", background: atomColor(el),
                display: "inline-block", border: "1px solid rgba(255,255,255,0.2)",
              }} />
              {el}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
