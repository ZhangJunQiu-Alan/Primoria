"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  AlgorithmVisualizationArtifact,
  AlgorithmStep,
  AlgorithmHighlightRole,
} from "@/lib/agent-os";
import { LO_CANVAS, LO_INK, LO_MUTED, SERIES } from "./style-tokens";

// ── Color palette ─────────────────────────────────────────────────────────────

type RoleStyle = { fill: string; stroke: string; opacity?: number };

const ROLE_STYLES: Record<string, RoleStyle> = {
  comparing:  SERIES.amber,
  swapping:   SERIES.rose,
  pivot:      SERIES.lavender,
  sorted:     SERIES.pine,
  current:    SERIES.amber,
  visited:    SERIES.pine,
  queued:     SERIES.lavender,
  stacked:    SERIES.rose,
  path:       SERIES.amber,
  dependency: SERIES.lavender,
  result:     SERIES.pine,
  muted:      { fill: LO_CANVAS, stroke: "#eadfce", opacity: 0.4 },
};
const DEFAULT_STYLE: RoleStyle = { fill: LO_CANVAS, stroke: "#d5c9b8" };
const C_TEXT = LO_INK;
const C_MUTED = LO_MUTED;
const FONT = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, monospace";

function rs(role?: AlgorithmHighlightRole | null): RoleStyle {
  return (role ? ROLE_STYLES[role] : null) ?? DEFAULT_STYLE;
}

// ── Array view ────────────────────────────────────────────────────────────────

function ArrayView({ step }: { step: AlgorithmStep }) {
  const arr = step.array;
  if (!arr) return null;
  const { values, highlights = [], pointers = [], sortedIndices = [] } = arr;
  const nums = values.map(v => (typeof v === "number" ? v : parseFloat(String(v)) || 0));
  const maxVal = Math.max(...nums, 1);
  const hlMap = new Map(highlights.map(h => [h.index, h.role] as const));
  const sortedSet = new Set(sortedIndices);
  const ptrMap = new Map(pointers.map(p => [p.index, p.label]));

  const barW = 42;
  const barGap = 4;
  const padX = 8;
  const maxBarH = 100;
  const svgH = 130;
  const svgW = padX * 2 + values.length * (barW + barGap) - barGap;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH + 20}`}
      style={{ width: "100%", maxWidth: svgW, display: "block" }}
    >
      {values.map((val, i) => {
        const role = sortedSet.has(i) ? ("sorted" as AlgorithmHighlightRole) : hlMap.get(i);
        const { fill, stroke, opacity } = rs(role);
        const h = Math.max((nums[i]! / maxVal) * maxBarH, 16);
        const x = padX + i * (barW + barGap);
        const y = svgH - h;
        return (
          <g key={i} opacity={opacity ?? 1}>
            <rect x={x} y={y} width={barW} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <text
              x={x + barW / 2} y={y + h / 2 + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={13} fontWeight={600} fill={C_TEXT} fontFamily={FONT}
            >
              {val}
            </text>
            {ptrMap.has(i) && (
              <text
                x={x + barW / 2} y={svgH + 14}
                textAnchor="middle" fontSize={10} fill={C_MUTED} fontFamily={FONT}
              >
                {ptrMap.get(i)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Tree view ─────────────────────────────────────────────────────────────────

interface RawTreeNode {
  id: string;
  value: string | number;
  parentId?: string | null;
  left?: string | null;
  right?: string | null;
}

function reconstructTreeLinks(nodes: RawTreeNode[]): RawTreeNode[] {
  if (nodes.length === 0) return [];
  const numericValues = nodes.map(n => Number(n.value));
  const isAllNumeric = numericValues.every(val => !isNaN(val));

  if (isAllNumeric) {
    const cloned: RawTreeNode[] = nodes.map(n => ({
      ...n,
      parentId: null,
      left: null,
      right: null,
    }));
    const nodeMap = new Map(cloned.map(n => [n.id, n]));

    function insertBST(rootId: string, nodeId: string) {
      const rootNode = nodeMap.get(rootId)!;
      const node = nodeMap.get(nodeId)!;
      const rootVal = Number(rootNode.value);
      const nodeVal = Number(node.value);

      if (nodeVal < rootVal) {
        if (!rootNode.left) {
          rootNode.left = nodeId;
          node.parentId = rootId;
        } else {
          insertBST(rootNode.left, nodeId);
        }
      } else {
        if (!rootNode.right) {
          rootNode.right = nodeId;
          node.parentId = rootId;
        } else {
          insertBST(rootNode.right, nodeId);
        }
      }
    }

    const rootId = cloned[0].id;
    for (let i = 1; i < cloned.length; i++) {
      insertBST(rootId, cloned[i].id);
    }
    return cloned;
  } else {
    const cloned: RawTreeNode[] = nodes.map(n => ({
      ...n,
      parentId: null,
      left: null,
      right: null,
    }));
    for (let i = 0; i < cloned.length; i++) {
      const leftIdx = 2 * i + 1;
      const rightIdx = 2 * i + 2;
      if (leftIdx < cloned.length) {
        cloned[i].left = cloned[leftIdx].id;
        cloned[leftIdx].parentId = cloned[i].id;
      }
      if (rightIdx < cloned.length) {
        cloned[i].right = cloned[rightIdx].id;
        cloned[rightIdx].parentId = cloned[i].id;
      }
    }
    return cloned;
  }
}

function TreeView({ step }: { step: AlgorithmStep }) {
  const tree = step.tree;
  if (!tree || tree.nodes.length === 0) return null;
  const { nodes, highlights = [] } = tree;

  const hasLinks = nodes.some(n => n.parentId != null || n.left != null || n.right != null);
  const processedNodes = hasLinks ? nodes : reconstructTreeLinks(nodes);

  const hlMap = new Map(highlights.map(h => [h.id, h.role] as const));
  const nodeMap = new Map(processedNodes.map(n => [n.id, n]));
  const root = processedNodes.find(n => !n.parentId);
  if (!root) return null;

  // BFS depths
  const depths = new Map<string, number>();
  const bfsQ: { id: string; d: number }[] = [{ id: root.id, d: 0 }];
  let maxDepth = 0;
  while (bfsQ.length > 0) {
    const { id, d } = bfsQ.shift()!;
    depths.set(id, d);
    if (d > maxDepth) maxDepth = d;
    const n = nodeMap.get(id);
    if (n?.left) bfsQ.push({ id: n.left, d: d + 1 });
    if (n?.right) bfsQ.push({ id: n.right, d: d + 1 });
  }

  // In-order traversal for x positions
  let xCounter = 0;
  const xSlots = new Map<string, number>();
  function inOrder(id: string | null | undefined): void {
    if (!id) return;
    const n = nodeMap.get(id);
    if (!n) return;
    inOrder(n.left);
    xSlots.set(id, xCounter++);
    inOrder(n.right);
  }
  inOrder(root.id);

  const total = xCounter || 1;
  const R = 20;
  const cellW = 54;
  const cellH = 68;
  const padX = 28;
  const padY = 28;
  const svgW = padX * 2 + (total - 1) * cellW;
  const svgH = padY * 2 + maxDepth * cellH;

  function cx(id: string) { return padX + (xSlots.get(id) ?? 0) * cellW; }
  function cy(id: string) { return padY + (depths.get(id) ?? 0) * cellH; }

  return (
    <svg
      viewBox={`0 0 ${Math.max(svgW, 100)} ${Math.max(svgH, 80)}`}
      style={{ width: "100%", display: "block" }}
    >
      {processedNodes.map(n =>
        n.parentId ? (
          <line
            key={`e-${n.id}`}
            x1={cx(n.parentId)} y1={cy(n.parentId) + R}
            x2={cx(n.id)} y2={cy(n.id) - R}
            stroke="#d5c9b8" strokeWidth={1.5}
          />
        ) : null
      )}
      {processedNodes.map(n => {
        const { fill, stroke, opacity } = rs(hlMap.get(n.id));
        return (
          <g key={n.id} opacity={opacity ?? 1}>
            <circle cx={cx(n.id)} cy={cy(n.id)} r={R} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <text
              x={cx(n.id)} y={cy(n.id) + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={12} fontWeight={600} fill={C_TEXT} fontFamily={FONT}
            >
              {n.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Graph view ────────────────────────────────────────────────────────────────

function GraphView({ step }: { step: AlgorithmStep }) {
  const graph = step.graph;
  if (!graph) return null;
  const { nodes, edges, highlights = [], queue = [], stack = [] } = graph;
  const hlNodeMap = new Map(
    highlights.filter(h => h.nodeId).map(h => [h.nodeId!, h.role] as const)
  );
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const svgW = 300;
  const svgH = 200;
  const R = 20;
  const pad = 24;

  function nx(n: { x: number }) { return pad + n.x * (svgW - pad * 2); }
  function ny(n: { y: number }) { return pad + n.y * (svgH - pad * 2); }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ flex: "1 1 auto", minWidth: 0, maxHeight: 220, display: "block" }}
      >
        {edges.map((e, i) => {
          const a = nodeMap.get(e.from);
          const b = nodeMap.get(e.to);
          if (!a || !b) return null;
          const ax = nx(a), ay = ny(a), bx = nx(b), by = ny(b);
          const dx = bx - ax, dy = by - ay;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len, uy = dy / len;
          const ex = bx - ux * R, ey = by - uy * R;
          return (
            <g key={i}>
              <line x1={ax} y1={ay} x2={ex} y2={ey} stroke="#d5c9b8" strokeWidth={1.5} />
              {e.directed && (
                <polygon
                  points={`${ex},${ey} ${ex - 8 * ux + 5 * (-uy)},${ey - 8 * uy + 5 * ux} ${ex - 8 * ux - 5 * (-uy)},${ey - 8 * uy - 5 * ux}`}
                  fill="#d5c9b8"
                />
              )}
              {e.weight != null && (
                <text
                  x={(ax + bx) / 2} y={(ay + by) / 2 - 5}
                  textAnchor="middle" fontSize={10} fill={C_MUTED} fontFamily={FONT}
                >
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map(n => {
          const { fill, stroke, opacity } = rs(hlNodeMap.get(n.id));
          return (
            <g key={n.id} opacity={opacity ?? 1}>
              <circle cx={nx(n)} cy={ny(n)} r={R} fill={fill} stroke={stroke} strokeWidth={1.5} />
              <text
                x={nx(n)} y={ny(n) + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={12} fontWeight={600} fill={C_TEXT} fontFamily={FONT}
              >
                {n.label}
              </text>
              {n.value != null && (
                <text
                  x={nx(n)} y={ny(n) + R + 13}
                  textAnchor="middle" fontSize={10} fill={C_MUTED} fontFamily={FONT}
                >
                  {n.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {(queue.length > 0 || stack.length > 0) && (
        <div style={{ fontSize: 11, color: C_TEXT, fontFamily: FONT, minWidth: 72, flexShrink: 0 }}>
          {queue.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: C_MUTED, marginBottom: 3, fontSize: 10 }}>QUEUE</div>
              {queue.map((id, i) => (
                <div key={i} style={{ padding: "2px 7px", marginBottom: 2, borderRadius: 4,
                  background: SERIES.lavender.fill, border: `1px solid ${SERIES.lavender.stroke}`, fontSize: 11 }}>
                  {id}
                </div>
              ))}
            </div>
          )}
          {stack.length > 0 && (
            <div style={{ marginTop: queue.length > 0 ? 8 : 0 }}>
              <div style={{ fontWeight: 600, color: C_MUTED, marginBottom: 3, fontSize: 10 }}>STACK</div>
              {[...stack].reverse().map((id, i) => (
                <div key={i} style={{ padding: "2px 7px", marginBottom: 2, borderRadius: 4,
                  background: SERIES.rose.fill, border: `1px solid ${SERIES.rose.stroke}`, fontSize: 11 }}>
                  {id}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Table view ────────────────────────────────────────────────────────────────

function TableView({ step }: { step: AlgorithmStep }) {
  const tbl = step.table;
  if (!tbl) return null;
  const { data, rowLabels, colLabels, highlights = [], formula } = tbl;
  const hlMap = new Map(highlights.map(h => [`${h.row},${h.col}`, h.role] as const));
  const hasRowLabels = !!rowLabels?.length;
  const hasColLabels = !!colLabels?.length;

  const cellSt = (r: number, c: number): CSSProperties => {
    const role = hlMap.get(`${r},${c}`);
    const { fill, stroke, opacity } = rs(role);
    return {
      background: fill,
      border: `1.5px solid ${stroke}`,
      opacity: opacity ?? 1,
      padding: "3px 8px",
      textAlign: "center",
      fontSize: 12,
      fontWeight: role ? 600 : 400,
      color: C_TEXT,
      minWidth: 32,
      borderRadius: 4,
    };
  };
  const hdrSt: CSSProperties = {
    padding: "2px 8px",
    textAlign: "center",
    fontSize: 11,
    color: C_MUTED,
    fontWeight: 600,
    minWidth: 32,
  };

  return (
    <div style={{ overflowX: "auto", fontFamily: FONT }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 3 }}>
        {hasColLabels && (
          <thead>
            <tr>
              {hasRowLabels && <th style={{ ...hdrSt, minWidth: 36 }} />}
              {colLabels!.map((l, i) => <th key={i} style={hdrSt}>{l}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {data.map((row, r) => (
            <tr key={r}>
              {hasRowLabels && (
                <td style={{ ...hdrSt, textAlign: "right" }}>{rowLabels![r] ?? ""}</td>
              )}
              {row.map((cell, c) => (
                <td key={c} style={cellSt(r, c)}>{cell ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {formula && (
        <div style={{ marginTop: 7, fontSize: 11, color: C_MUTED, fontStyle: "italic" }}>
          {formula}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const BTN: CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #d5c9b8",
  background: "#fbf7ee",
  color: C_TEXT,
  cursor: "pointer",
  fontFamily: FONT,
  lineHeight: "1.5",
};

export function AlgorithmVisualizer({ artifact, variant = "tool" }: { artifact: AlgorithmVisualizationArtifact; variant?: "tool" | "course" }) {
  const { steps, title } = artifact;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const step = steps[idx] ?? steps[0]!;

  const goNext = useCallback(() => {
    setIdx(prev => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const goPrev = useCallback(() => setIdx(prev => Math.max(prev - 1, 0)), []);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setIdx(prev => {
          if (prev >= steps.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1000 / speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, speed, steps.length]);

  const body = (
    <div
      className={variant === "course" ? "course-visual-canvas algorithm-visualizer-canvas" : "visualizer"}
      style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}
    >
          {/* Visualization area */}
          <div style={{ minHeight: 120 }}>
            {step.kind === "array" && <ArrayView step={step} />}
            {step.kind === "tree"  && <TreeView  step={step} />}
            {step.kind === "graph" && <GraphView step={step} />}
            {step.kind === "table" && <TableView step={step} />}
          </div>

          {/* Step description */}
          <div style={{ fontSize: 13, color: C_TEXT, fontFamily: FONT }}>
            {step.description}
            {step.annotation && (
              <div style={{ marginTop: 2, fontSize: 12, color: C_MUTED, fontStyle: "italic" }}>
                {step.annotation}
              </div>
            )}
          </div>

          {/* Variables */}
          {!!step.variables?.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {step.variables.map((v, i) => (
                <span key={i} style={{ padding: "2px 8px", background: "#f7f3ea",
                  border: "0.5px solid #d5c9b8", borderRadius: 6, fontSize: 11,
                  color: C_TEXT, fontFamily: MONO }}>
                  <span style={{ color: C_MUTED }}>{v.name}</span>: {String(v.value)}
                </span>
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button onClick={goPrev} disabled={idx === 0}
              style={{ ...BTN, opacity: idx === 0 ? 0.4 : 1 }}>◀</button>
            <button
              onClick={() => setPlaying(p => !p)}
              style={{ ...BTN, minWidth: 72,
                background: playing ? SERIES.amber.fill : LO_CANVAS,
                borderColor: playing ? SERIES.amber.stroke : "#d5c9b8" }}
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </button>
            <button onClick={goNext} disabled={idx >= steps.length - 1}
              style={{ ...BTN, opacity: idx >= steps.length - 1 ? 0.4 : 1 }}>▶</button>
            <span style={{ fontSize: 11, color: C_MUTED, marginLeft: 4, fontFamily: FONT }}>
              {idx + 1} / {steps.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <span style={{ fontSize: 10, color: C_MUTED, fontFamily: FONT }}>Speed</span>
              <input type="range" min={0.5} max={4} step={0.5} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: 60, accentColor: SERIES.pine.stroke }} />
              <span style={{ fontSize: 10, color: C_MUTED, fontFamily: FONT }}>{speed}×</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: "#efe8dc", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, background: SERIES.amber.stroke,
              transition: "width 0.15s ease",
              width: `${((idx + 1) / steps.length) * 100}%`,
            }} />
          </div>
    </div>
  );

  if (variant === "course") return body;

  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{title}</span>
        </div>
        {body}
      </div>
    </div>
  );
}
