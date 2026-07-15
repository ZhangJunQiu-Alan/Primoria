"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useInteractiveT } from "./i18n";
import { computeLensImage, type LensImagingConfig } from "@/lib/interactive/components/lens-imaging";
import { WIDGET_COLORS } from "./palette";

// Config-driven lens-imaging widget. Sliders, drag, and LLM patches all write
// the same config object via onChange — that shared state is the point of the
// declarative path.

const W = 720;
const H = 340;
const CX = W / 2;
const CY = H / 2 + 10;
const WORLD = 68; // half-width, cm
const SC = (W / 2 - 30) / WORLD; // px per cm
const VSC = SC * 2.2; // vertical exaggeration for readability

const COLORS = {
  ink: WIDGET_COLORS.ink,
  muted: WIDGET_COLORS.muted,
  line: WIDGET_COLORS.line,
  accent: WIDGET_COLORS.accent,
  accentSoft: WIDGET_COLORS.accentSoft,
  ray1: WIDGET_COLORS.series1,
  ray2: WIDGET_COLORS.series2,
  ray3: WIDGET_COLORS.series3,
  warn: WIDGET_COLORS.warn,
  surface: WIDGET_COLORS.surface,
  surfaceSoft: WIDGET_COLORS.surfaceSoft,
  chipBg: WIDGET_COLORS.chipBg,
};

function X(cm: number) {
  return CX + cm * SC;
}
function Y(cm: number) {
  return CY - cm * VSC;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function fmt(n: number) {
  return String(Math.round(n * 10) / 10);
}
function extendTo(x1: number, y1: number, x2: number, y2: number, xEnd: number) {
  if (Math.abs(x2 - x1) < 0.001) return { x: x2, y: y2 };
  const k = (y2 - y1) / (x2 - x1);
  return { x: xEnd, y: y2 + k * (xEnd - x2) };
}

function Ray({ x1, y1, x2, y2, color, width = 2, dashed = false }: {
  x1: number; y1: number; x2: number; y2: number; color: string; width?: number; dashed?: boolean;
}) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={width} strokeLinecap="round"
      strokeDasharray={dashed ? "5 5" : undefined} opacity={dashed ? 0.75 : 1}
    />
  );
}

function ArrowMarker({ xCm, hCm, color, label, dashed = false }: {
  xCm: number; hCm: number; color: string; label: string; dashed?: boolean;
}) {
  const x = X(xCm);
  const tipY = Y(hCm);
  const dir = hCm >= 0 ? -1 : 1;
  return (
    <g opacity={dashed ? 0.85 : 1}>
      <line x1={x} y1={CY} x2={x} y2={tipY} stroke={color} strokeWidth={3.4} strokeLinecap="round"
        strokeDasharray={dashed ? "6 4" : undefined} />
      <path
        d={`M ${x - 6} ${tipY - dir * 9} L ${x} ${tipY} L ${x + 6} ${tipY - dir * 9}`}
        fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"
      />
      <text x={x} y={tipY - dir * 16 + (dir < 0 ? 0 : 10)} textAnchor="middle" fontSize={12} fill={color} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

const roStyle: CSSProperties = {
  fontSize: 12,
  padding: "3px 10px",
  borderRadius: 999,
  background: WIDGET_COLORS.chipBg,
  border: `1px solid ${COLORS.line}`,
  color: COLORS.muted,
  fontVariantNumeric: "tabular-nums",
};

const ctlLabelStyle: CSSProperties = { minWidth: 66, fontSize: 12.5, color: COLORS.muted };

export function LensImagingWidget({ config, onChange }: {
  config: LensImagingConfig;
  onChange: (next: LensImagingConfig) => void;
}) {
  const t = useInteractiveT().widgets;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);
  const image = computeLensImage(config);
  const { focalLength: f, objectDistance: u, objectHeight: h } = config;
  const fSigned = config.lensType === "convex" ? f : -f;
  const ox = X(-u);
  const oy = Y(h);

  function setField<K extends keyof LensImagingConfig>(key: K, value: LensImagingConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  function onDragMove(event: ReactPointerEvent<SVGGElement>) {
    if (!draggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (W / rect.width);
    const cm = (CX - px) / SC;
    setField("objectDistance", Math.round(clamp(cm, 2, 60) * 10) / 10);
  }

  const rays: React.ReactNode[] = [];
  if (config.showRays && !image.none) {
    const hi = h * image.m;
    if (image.real) {
      const ix = X(image.v);
      const iy = Y(hi);
      const ext1 = extendTo(CX, oy, ix, iy, W - 16);
      const ext2 = extendTo(ox, oy, ix, iy, W - 16);
      rays.push(
        <g key="real">
          <Ray x1={ox} y1={oy} x2={CX} y2={oy} color={COLORS.ray1} />
          <Ray x1={CX} y1={oy} x2={ix} y2={iy} color={COLORS.ray1} />
          <Ray x1={ix} y1={iy} x2={ext1.x} y2={ext1.y} color={COLORS.ray1} width={1.4} />
          <Ray x1={ox} y1={oy} x2={ix} y2={iy} color={COLORS.ray2} />
          <Ray x1={ix} y1={iy} x2={ext2.x} y2={ext2.y} color={COLORS.ray2} width={1.4} />
          <Ray x1={ox} y1={oy} x2={CX} y2={iy} color={COLORS.ray3} />
          <Ray x1={CX} y1={iy} x2={ix} y2={iy} color={COLORS.ray3} />
          <Ray x1={ix} y1={iy} x2={W - 16} y2={iy} color={COLORS.ray3} width={1.4} />
        </g>,
      );
    } else {
      const ix = X(image.v);
      const iy = Y(hi);
      const r1 = extendTo(X(fSigned), CY, CX, oy, W - 16);
      const r2 = extendTo(ox, oy, CX, CY, W - 16);
      rays.push(
        <g key="virtual">
          <Ray x1={ox} y1={oy} x2={CX} y2={oy} color={COLORS.ray1} />
          <Ray x1={CX} y1={oy} x2={r1.x} y2={r1.y} color={COLORS.ray1} />
          <Ray x1={CX} y1={oy} x2={ix} y2={iy} color={COLORS.ray1} width={1.6} dashed />
          <Ray x1={ox} y1={oy} x2={CX} y2={CY} color={COLORS.ray2} />
          <Ray x1={CX} y1={CY} x2={r2.x} y2={r2.y} color={COLORS.ray2} />
          <Ray x1={CX} y1={CY} x2={ix} y2={iy} color={COLORS.ray2} width={1.6} dashed />
        </g>,
      );
    }
  }

  const focusMarks = [
    { cm: -f, label: "F" },
    { cm: f, label: "F′" },
    { cm: -2 * f, label: "2F" },
    { cm: 2 * f, label: "2F′" },
  ].filter((mark) => {
    const x = X(mark.cm);
    return x > 20 && x < W - 20;
  });

  let imageNode: React.ReactNode = null;
  if (!image.none) {
    const hi = h * image.m;
    const clampedV = clamp(image.v, -WORLD + 4, WORLD - 4);
    const far = Math.abs(image.v) > WORLD - 4;
    imageNode = (
      <ArrowMarker
        xCm={clampedV}
        hCm={hi}
        color={image.real ? COLORS.accent : COLORS.ray3}
        label={far ? t.distantImage : t.image}
        dashed={!image.real}
      />
    );
  }

  const sizeLabel = image.none ? "" : Math.abs(image.m) > 1.02 ? t.enlarged : Math.abs(image.m) < 0.98 ? t.reduced : t.sameSize;

  return (
    <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden", background: COLORS.surface }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
        padding: "10px 14px", borderBottom: `1px solid ${COLORS.line}`, background: COLORS.surfaceSoft,
      }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.lensTitle}</span>
        <span style={{ fontFamily: "ui-monospace, SF Mono, Menlo, monospace", fontSize: 11, color: COLORS.muted }}>
          physics.lens-imaging
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t.lensAria}
        style={{ display: "block", width: "100%", height: "auto", touchAction: "none" }}
      >
        <line x1={14} y1={CY} x2={W - 14} y2={CY} stroke={COLORS.muted} strokeWidth={1} />
        {focusMarks.map((mark) => (
          <g key={mark.label}>
            <line x1={X(mark.cm)} y1={CY - 5} x2={X(mark.cm)} y2={CY + 5} stroke={COLORS.muted} strokeWidth={1.6} />
            <text x={X(mark.cm)} y={CY + 20} textAnchor="middle" fontSize={11} fill={COLORS.muted}>{mark.label}</text>
          </g>
        ))}

        {config.lensType === "convex" ? (
          <ellipse cx={CX} cy={CY} rx={9} ry={108} fill={COLORS.accentSoft} stroke={COLORS.accent} strokeWidth={2} />
        ) : (
          <path
            d={`M ${CX - 11} ${CY - 108} Q ${CX} ${CY - 60} ${CX - 3.5} ${CY} Q ${CX} ${CY + 60} ${CX - 11} ${CY + 108} L ${CX + 11} ${CY + 108} Q ${CX} ${CY + 60} ${CX + 3.5} ${CY} Q ${CX} ${CY - 60} ${CX + 11} ${CY - 108} Z`}
            fill={COLORS.accentSoft} stroke={COLORS.accent} strokeWidth={2}
          />
        )}

        {rays}

        {image.none ? (
          <text x={CX} y={CY - 130} textAnchor="middle" fontSize={13} fill={COLORS.warn} fontWeight={600}>
            {t.noImageAtFocus}
          </text>
        ) : (
          imageNode
        )}

        <g
          style={{ cursor: "ew-resize" }}
          onPointerDown={(event) => {
            draggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          onPointerMove={onDragMove}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
        >
          <rect x={ox - 16} y={Math.min(oy, CY)} width={32} height={Math.abs(CY - oy)} fill="transparent" />
          <ArrowMarker xCm={-u} hCm={h} color={COLORS.ray1} label={t.object} />
        </g>
      </svg>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11.5, color: COLORS.muted, padding: "0 14px" }}>
        <span>{t.rayLegend}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px 4px" }}>
        <span style={roStyle}>{t.objectDistance} u = <b style={{ color: COLORS.ink }}>{fmt(u)} cm</b></span>
        <span style={roStyle}>{t.focalLength} f = <b style={{ color: COLORS.ink }}>{fmt(f)} cm</b></span>
        {image.none ? (
          <span style={{ ...roStyle, borderColor: COLORS.warn, color: COLORS.warn }}>{t.noImageAtFocus}</span>
        ) : (
          <>
            <span style={roStyle}>{t.imageDistance} v = <b style={{ color: COLORS.ink }}>{fmt(Math.abs(image.v))} cm</b></span>
            <span style={roStyle}>{t.magnification} |m| = <b style={{ color: COLORS.ink }}>{fmt(Math.abs(image.m))}</b></span>
            <span style={{
              ...roStyle,
              borderColor: image.real ? COLORS.accent : COLORS.ray3,
              color: image.real ? COLORS.accent : COLORS.ray3,
            }}>
              {image.real ? t.realInverted : t.virtualUpright} · {sizeLabel}
            </span>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 20px", padding: "12px 16px 16px" }}>
        {([
          ["focalLength", `${t.focalLength} f`, 4, 30, 0.5],
          ["objectDistance", `${t.objectDistance} u`, 2, 60, 0.5],
          ["objectHeight", `${t.objectHeight} h`, 3, 16, 1],
        ] as const).map(([key, label, min, max, step]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={ctlLabelStyle}>{label}</span>
            <input
              type="range" min={min} max={max} step={step} value={config[key]}
              onChange={(event) => setField(key, Number(event.target.value))}
              style={{ flex: 1, accentColor: COLORS.accent, minWidth: 0 }}
            />
            <output style={{ minWidth: 52, textAlign: "right", fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {fmt(config[key])} cm
            </output>
          </label>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={ctlLabelStyle}>{t.lensType}</span>
          <span style={{ display: "flex", border: `1px solid ${COLORS.line}`, borderRadius: 7, overflow: "hidden" }}>
            {([["convex", t.convexLens], ["concave", t.concaveLens]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setField("lensType", value)}
                style={{
                  font: "inherit", fontSize: 12, border: "none", padding: "4px 14px", cursor: "pointer",
                  background: config.lensType === value ? COLORS.accent : COLORS.surface,
                  color: config.lensType === value ? COLORS.surface : COLORS.muted,
                  fontWeight: config.lensType === value ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: COLORS.muted, padding: "0 16px 12px" }}>
        {t.lensInteractionTip}
      </div>
    </div>
  );
}
