"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphVisualizationArtifact, GraphNode, GraphEdge } from "@/lib/agent-os";

// ── Simulation types ──────────────────────────────────────────────────────────

type SimNode = GraphNode & { x: number; y: number; vx: number; vy: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const SVG_W = 600;
const BASE_R = 22;
const K = 75;                      // ideal edge length
const REPULSION = K * K * 1.1;
const ATTRACTION = 0.0011;
const FILLS   = ["#fff2de", "#e8f3ea", "#efe7d7", "#fbeaf0"];
const STROKES = ["#c8881a", "#4a7a5a", "#7c6ad0", "#b56474"];
const C_BG    = "#fbf7ee";
const C_EDGE  = "#d5c9b8";
const C_TEXT  = "#3a352d";
const C_MUTED = "#6b6357";
const FONT    = "ui-sans-serif, system-ui, sans-serif";

// ── Force simulation ──────────────────────────────────────────────────────────

type Bounds = { x: number; y: number; w: number; h: number };

function runForceStep(nodes: SimNode[], edges: GraphEdge[], nodeMap: Map<string, SimNode>, temp: number, bounds: Bounds): void {
  for (const n of nodes) { n.vx = 0; n.vy = 0; }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!, b = nodes[j]!;
      const dx = b.x - a.x || 0.1, dy = b.y - a.y || 0.1;
      const dist2 = Math.max(1, dx * dx + dy * dy);
      const dist  = Math.sqrt(dist2);
      const f = REPULSION / dist2;
      a.vx -= f * dx / dist; a.vy -= f * dy / dist;
      b.vx += f * dx / dist; b.vy += f * dy / dist;
    }
  }

  for (const e of edges) {
    const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
    if (!a || !b || a === b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = ATTRACTION * dist * dist;
    a.vx += f * dx / dist; a.vy += f * dy / dist;
    b.vx -= f * dx / dist; b.vy -= f * dy / dist;
  }

  const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.0007;
    n.vy += (cy - n.y) * 0.0007;
    const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy) || 1;
    const cap = Math.min(spd, temp);
    n.x = Math.min(Math.max(bounds.x, n.x + n.vx / spd * cap), bounds.x + bounds.w);
    n.y = Math.min(Math.max(bounds.y, n.y + n.vy / spd * cap), bounds.y + bounds.h);
  }
}

// ── Layout algorithms ─────────────────────────────────────────────────────────

function applyTreeLayout(nodes: SimNode[], edges: GraphEdge[], nodeMap: Map<string, SimNode>, directed: boolean, bounds: Bounds): void {
  const incoming = new Set(edges.map(e => e.target));
  let roots = nodes.filter(n => !incoming.has(n.id));
  if (roots.length === 0 && nodes.length > 0) roots = [nodes[0]!];

  const depths = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
    if (!directed) {
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.target)!.push(e.source);
    }
  }
  const q: { id: string; d: number }[] = roots.map(r => ({ id: r.id, d: 0 }));
  while (q.length > 0) {
    const { id, d } = q.shift()!;
    if (depths.has(id)) continue;
    depths.set(id, d);
    for (const c of adj.get(id) ?? []) if (!depths.has(c)) q.push({ id: c, d: d + 1 });
  }
  for (const n of nodes) if (!depths.has(n.id)) depths.set(n.id, 0);

  const maxD = Math.max(0, ...depths.values());
  const levels = new Map<number, string[]>();
  for (const [id, d] of depths) {
    if (!levels.has(d)) levels.set(d, []);
    levels.get(d)!.push(id);
  }
  for (const [d, ids] of levels) {
    ids.forEach((id, i) => {
      const n = nodeMap.get(id);
      if (!n) return;
      n.x = bounds.x + bounds.w * (i + 1) / (ids.length + 1);
      n.y = bounds.y + bounds.h * (d + 0.5) / (maxD + 1);
    });
  }
}

function applyCircleLayout(nodes: SimNode[], bounds: Bounds): void {
  const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2;
  const R = Math.min(bounds.w, bounds.h) * 0.4;
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    n.x = cx + R * Math.cos(a);
    n.y = cy + R * Math.sin(a);
  });
}

function applyGridLayout(nodes: SimNode[], bounds: Bounds): void {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  nodes.forEach((n, i) => {
    n.x = bounds.x + bounds.w * ((i % cols) + 1) / (cols + 1);
    n.y = bounds.y + bounds.h * (Math.floor(i / cols) + 1) / (rows + 1);
  });
}

function computeLayout(gnodes: GraphNode[], edges: GraphEdge[], layout: string, directed: boolean, svgH: number): SimNode[] {
  const PAD = 55;
  const bounds: Bounds = { x: PAD, y: PAD, w: SVG_W - PAD * 2, h: svgH - PAD * 2 };
  const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2;
  const R0 = Math.min(bounds.w, bounds.h) * 0.38;

  const nodes: SimNode[] = gnodes.map((n, i) => {
    const a = (i / Math.max(1, gnodes.length)) * 2 * Math.PI;
    return { ...n, x: cx + R0 * Math.cos(a), y: cy + R0 * Math.sin(a), vx: 0, vy: 0 };
  });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  if (layout === "tree")        applyTreeLayout(nodes, edges, nodeMap, directed, bounds);
  else if (layout === "circle") applyCircleLayout(nodes, bounds);
  else if (layout === "grid")   applyGridLayout(nodes, bounds);
  else {
    let temp = K * 0.9;
    for (let i = 0; i < 280; i++) { runForceStep(nodes, edges, nodeMap, temp, bounds); temp *= 0.973; }
  }
  return nodes;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nr(node: SimNode) { return BASE_R * (node.size ?? 1); }

function edgeEndpoints(src: SimNode, dst: SimNode, isDir: boolean) {
  const dx = dst.x - src.x, dy = dst.y - src.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / d, uy = dy / d;
  const gap = isDir ? 7 : 0;
  return { x1: src.x + ux * nr(src), y1: src.y + uy * nr(src), x2: dst.x - ux * (nr(dst) + gap), y2: dst.y - uy * (nr(dst) + gap) };
}

function groupIdx(group: string | undefined, groups: string[]) {
  return group ? groups.indexOf(group) : -1;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphVisualizer({ artifact }: { artifact: GraphVisualizationArtifact }) {
  const directed = artifact.directed ?? false;
  const layout   = artifact.layout ?? "force";
  const svgH     = Math.max(300, Math.min(520, 260 + Math.ceil(artifact.nodes.length / 4) * 24));

  const [nodes, setNodes] = useState<SimNode[]>(() =>
    computeLayout(artifact.nodes, artifact.edges, layout, directed, svgH),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [tx, setTx]   = useState({ x: 0, y: 0, s: 1 });
  const txRef         = useRef(tx);
  useEffect(() => {
    txRef.current = tx;
  }, [tx]);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef        = useRef<SVGSVGElement>(null);
  const dragRef       = useRef<{ id: string; startPx: number; startPy: number; origX: number; origY: number } | null>(null);
  const panRef        = useRef<{ startPx: number; startPy: number; origTx: number; origTy: number } | null>(null);

  const groups = useMemo(() => [...new Set(artifact.nodes.map(n => n.group).filter((g): g is string => !!g))], [artifact.nodes]);

  const connectedEdges = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(artifact.edges.filter(e => e.source === selected || e.target === selected).map(e => `${e.source}->${e.target}`));
  }, [selected, artifact.edges]);

  const connectedNodes = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>();
    for (const e of artifact.edges) {
      if (e.source === selected) s.add(e.target);
      if (e.target === selected) s.add(e.source);
    }
    return s;
  }, [selected, artifact.edges]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // ── SVG coordinate helpers ──────────────────────────────────────────────────

  function screenToGraph(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const svgX = (clientX - rect.left) / rect.width * SVG_W;
    const svgY = (clientY - rect.top) / rect.height * svgH;
    const { x, y, s } = txRef.current;
    return { x: (svgX - x) / s, y: (svgY - y) / s };
  }

  // ── Pointer events ──────────────────────────────────────────────────────────

  function handleNodePointerDown(e: React.PointerEvent<SVGGElement>, nodeId: string) {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    const n = nodeMap.get(nodeId);
    if (!n) return;
    dragRef.current = { id: nodeId, startPx: e.clientX, startPy: e.clientY, origX: n.x, origY: n.y };
    setIsDragging(true);
  }

  function handleSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    svgRef.current?.setPointerCapture(e.pointerId);
    panRef.current = { startPx: e.clientX, startPy: e.clientY, origTx: tx.x, origTy: tx.y };
  }

  function handleSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current) {
      const { id, startPx, startPy, origX, origY } = dragRef.current;
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const dSvgX = (e.clientX - startPx) / rect.width * SVG_W;
      const dSvgY = (e.clientY - startPy) / rect.height * svgH;
      const { s } = txRef.current;
      const newX = origX + dSvgX / s, newY = origY + dSvgY / s;
      setNodes(prev => prev.map(n => n.id === id ? { ...n, x: newX, y: newY } : n));
    } else if (panRef.current) {
      const { startPx, startPy, origTx, origTy } = panRef.current;
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const dSvgX = (e.clientX - startPx) / rect.width * SVG_W;
      const dSvgY = (e.clientY - startPy) / rect.height * svgH;
      setTx(prev => ({ ...prev, x: origTx + dSvgX, y: origTy + dSvgY }));
    }
  }

  function handleSvgPointerUp() {
    dragRef.current = null;
    panRef.current  = null;
    setIsDragging(false);
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width * SVG_W;
    const cy = (e.clientY - rect.top) / rect.height * svgH;
    const factor = e.deltaY > 0 ? 0.87 : 1.15;
    const { x, y, s } = txRef.current;
    const ns = Math.min(Math.max(0.15, s * factor), 6);
    setTx({ x: cx - (cx - x) * (ns / s), y: cy - (cy - y) * (ns / s), s: ns });
  }

  function handleNodeClick(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    setSelected(prev => (prev === nodeId ? null : nodeId));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const ARROW_COLORS: Record<string, string> = {
    default: C_EDGE, amber: "#c8881a", sage: "#4a7a5a", lavender: "#7c6ad0",
  };


  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{artifact.title}</span>
        </div>
        <div className="visualizer" style={{ padding: "12px 16px" }}>
          <strong style={{ display: "block", marginBottom: 4, color: C_TEXT, fontSize: 14 }}>
            {artifact.title}
          </strong>
          <p style={{ margin: "0 0 10px", color: C_MUTED, fontSize: 13, lineHeight: 1.4 }}>
            {artifact.description}
          </p>

          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #eadfce" }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${svgH}`}
              width="100%"
              style={{ display: "block", background: C_BG, cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerLeave={handleSvgPointerUp}
              onWheel={handleWheel}
              onClick={() => setSelected(null)}
            >
              <defs>
                {Object.entries(ARROW_COLORS).map(([name, color]) => (
                  <marker key={name} id={`arrow-${name}`} viewBox="0 0 10 8" refX="9" refY="4"
                    markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,0 L10,4 L0,8 Z" fill={color} />
                  </marker>
                ))}
              </defs>

              <g transform={`translate(${tx.x},${tx.y}) scale(${tx.s})`}>
                {/* Edges */}
                {artifact.edges.map((edge, i) => {
                  const src = nodeMap.get(edge.source), dst = nodeMap.get(edge.target);
                  if (!src || !dst) return null;
                  const isDir = edge.directed ?? directed;
                  const edgeKey = `${edge.source}->${edge.target}`;
                  const isSelected = connectedEdges.has(edgeKey);
                  const isOut = isSelected && edge.source === selected;
                  const isIn  = isSelected && edge.target === selected;
                  const color = isOut ? "#7c6ad0" : isIn ? "#4a7a5a" : isSelected ? "#c8881a" : C_EDGE;
                  const markerName = isOut ? "lavender" : isIn ? "sage" : isSelected ? "amber" : "default";
                  const { x1, y1, x2, y2 } = edgeEndpoints(src, dst, isDir);
                  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={color} strokeWidth={isSelected ? 2 : 1.5}
                        markerEnd={isDir ? `url(#arrow-${markerName})` : undefined}
                      />
                      {(edge.label || edge.weight != null) && (
                        <text x={midX} y={midY - 5} textAnchor="middle"
                          fontSize={9} fill={C_MUTED} fontFamily={FONT}
                          style={{ pointerEvents: "none" }}>
                          {edge.label ?? edge.weight}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                  const gi = groupIdx(node.group, groups);
                  const isSelected = node.id === selected;
                  const isConn = connectedNodes.has(node.id);
                  const baseFill   = node.color ?? (gi >= 0 ? FILLS[gi % 4]!   : C_BG);
                  const baseStroke = node.color ? "#7a6a5a" : (gi >= 0 ? STROKES[gi % 4]! : "#d5c9b8");
                  const fill   = isSelected ? "#fff2de" : baseFill;
                  const stroke = isSelected ? "#c8881a" : isConn ? STROKES[gi >= 0 ? gi % 4 : 0]! : baseStroke;
                  const sw     = isSelected ? 2.5 : isConn ? 2 : 1.5;
                  const R      = nr(node);
                  const label  = node.label ?? node.id;
                  const shortLabel = label.length > 12 ? label.slice(0, 11) + "…" : label;
                  return (
                    <g key={node.id}
                      onPointerDown={e => handleNodePointerDown(e, node.id)}
                      onClick={e => handleNodeClick(e, node.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {isSelected && (
                        <circle cx={node.x} cy={node.y} r={R + 5}
                          fill="none" stroke="#c8881a" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                      )}
                      <circle cx={node.x} cy={node.y} r={R}
                        fill={fill} stroke={stroke} strokeWidth={sw} />
                      <text x={node.x} y={node.y + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={Math.max(8, Math.min(12, R * 0.52))}
                        fontWeight={600} fill={C_TEXT} fontFamily={FONT}
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {shortLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Selected node info */}
          {selected && (() => {
            const n = nodeMap.get(selected);
            if (!n) return null;
            const deg = artifact.edges.filter(e => e.source === selected || e.target === selected).length;
            return (
              <div style={{ marginTop: 8, padding: "5px 10px", borderRadius: 8, background: "#fff2de",
                border: "1px solid #c8881a", fontSize: 12, color: C_TEXT, display: "flex", gap: 12, alignItems: "center" }}>
                <strong>{n.label ?? n.id}</strong>
                {n.group && <span style={{ color: C_MUTED }}>group: {n.group}</span>}
                <span style={{ color: C_MUTED, marginLeft: "auto" }}>{deg} edge{deg !== 1 ? "s" : ""}</span>
              </div>
            );
          })()}

          {/* Group legend */}
          {groups.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {groups.map((g, i) => (
                <span key={g} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C_TEXT }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%", display: "inline-block",
                    background: FILLS[i % 4], border: `1.5px solid ${STROKES[i % 4]}`,
                  }} />
                  {g}
                </span>
              ))}
            </div>
          )}

          <p style={{ margin: "8px 0 0", fontSize: 10, color: C_MUTED, fontFamily: FONT }}>
            Click node to highlight connections · Drag to reposition · Scroll to zoom
          </p>
        </div>
      </div>
    </div>
  );
}
