import { useMemo, useRef, useState } from 'react';
import {
  DEFAULT_TEXT_COLOR,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hsvToRgb,
  normalizeHexColor,
  rgbToHex,
} from '@/shared/color/colorUtils';

interface TextColorControlProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

const QUICK_SWATCHES = [
  '#3d342a',
  '#7a9e7e',
  '#c4956a',
  '#d95f5f',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#7c3aed',
  '#ec4899',
  '#111827',
] as const;

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function parseRgbChannel(value: string) {
  if (!/^\d{1,3}$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return parsed >= 0 && parsed <= 255 ? parsed : null;
}

function createDraftState(color: string) {
  const rgb = hexToRgb(color) ?? hexToRgb(DEFAULT_TEXT_COLOR)!;

  return {
    sourceColor: color,
    hex: color.toUpperCase(),
    rgb: {
      r: String(rgb.r),
      g: String(rgb.g),
      b: String(rgb.b),
    },
  };
}

export function TextColorControl({ value, onChange }: TextColorControlProps) {
  const resolvedColor = normalizeHexColor(value ?? '') ?? DEFAULT_TEXT_COLOR;
  const resolvedHsv = useMemo(
    () => hexToHsv(resolvedColor) ?? { h: 28, s: 0.32, v: 0.24 },
    [resolvedColor],
  );
  const [draft, setDraft] = useState(() => createDraftState(resolvedColor));
  const saturationRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);

  const activeDraft = draft.sourceColor === resolvedColor ? draft : createDraftState(resolvedColor);
  const hexInput = activeDraft.hex;
  const rgbInput = activeDraft.rgb;

  function commitHex(nextValue: string) {
    setDraft({
      sourceColor: resolvedColor,
      hex: nextValue,
      rgb: activeDraft.rgb,
    });
    const normalized = normalizeHexColor(nextValue);
    if (normalized) {
      onChange(normalized);
    }
  }

  function resetHexDraft() {
    setDraft(createDraftState(resolvedColor));
  }

  function commitRgb(nextValue: typeof rgbInput) {
    setDraft({
      sourceColor: resolvedColor,
      hex: activeDraft.hex,
      rgb: nextValue,
    });
    const red = parseRgbChannel(nextValue.r);
    const green = parseRgbChannel(nextValue.g);
    const blue = parseRgbChannel(nextValue.b);

    if (red === null || green === null || blue === null) {
      return;
    }

    onChange(rgbToHex({ r: red, g: green, b: blue }));
  }

  function resetRgbDraft() {
    setDraft(createDraftState(resolvedColor));
  }

  function updateFromSaturationPoint(clientX: number, clientY: number) {
    const bounds = saturationRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const saturation = clampUnit((clientX - bounds.left) / bounds.width);
    const valueLevel = 1 - clampUnit((clientY - bounds.top) / bounds.height);

    onChange(
      hsvToHex({
        h: resolvedHsv.h,
        s: saturation,
        v: valueLevel,
      }),
    );
  }

  function updateFromHuePoint(clientX: number) {
    const bounds = hueRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const ratio = clampUnit((clientX - bounds.left) / bounds.width);
    onChange(
      hsvToHex({
        h: ratio * 360,
        s: resolvedHsv.s,
        v: resolvedHsv.v,
      }),
    );
  }

  function beginDrag(
    event: React.PointerEvent<HTMLDivElement>,
    update: (clientX: number, clientY: number) => void,
  ) {
    event.preventDefault();
    event.stopPropagation();

    update(event.clientX, event.clientY);

    const handleMove = (nextEvent: PointerEvent) => {
      update(nextEvent.clientX, nextEvent.clientY);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }

  const saturationX = `${resolvedHsv.s * 100}%`;
  const saturationY = `${(1 - resolvedHsv.v) * 100}%`;
  const hueX = `${(resolvedHsv.h / 360) * 100}%`;
  const hueColor = rgbToHex(hsvToRgb({ h: resolvedHsv.h, s: 1, v: 1 }));

  return (
    <div className="space-y-3 rounded-[1.1rem] border border-[rgba(141,124,105,0.16)] bg-[rgba(255,255,255,0.52)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]">
      <div className="flex items-center justify-between gap-3">
        <label className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-[0.95rem] border border-[rgba(141,124,105,0.2)] shadow-[0_7px_18px_rgba(90,70,50,0.08)]">
          <span className="absolute inset-0" style={{ backgroundColor: resolvedColor }} />
          <input
            type="color"
            aria-label="Pick text colour"
            value={resolvedColor}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="rounded-full border border-[rgba(141,124,105,0.18)] px-2.5 py-1 text-[0.72rem] font-semibold text-muted-foreground transition-colors hover:bg-accent"
        >
          Default
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Palette
          </label>
          <span className="text-xs font-mono text-muted-foreground">
            {resolvedColor.toUpperCase()}
          </span>
        </div>

        <div
          ref={saturationRef}
          onPointerDown={(event) => beginDrag(event, updateFromSaturationPoint)}
          className="relative h-28 cursor-crosshair overflow-hidden rounded-[1rem] border border-[rgba(141,124,105,0.18)]"
          style={{ backgroundColor: hueColor }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff_0%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,#000000_100%)]" />
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(61,52,42,0.35),0_3px_10px_rgba(0,0,0,0.18)]"
            style={{ left: saturationX, top: saturationY }}
          />
        </div>

        <div
          ref={hueRef}
          onPointerDown={(event) =>
            beginDrag(event, (clientX, _clientY) => {
              updateFromHuePoint(clientX);
            })
          }
          className="relative h-5 cursor-ew-resize overflow-hidden rounded-full border border-[rgba(141,124,105,0.18)] bg-[linear-gradient(90deg,#ff4d4d_0%,#ff9f1c_16%,#ffd60a_32%,#2ec27e_48%,#00b4d8_64%,#4361ee_80%,#b5179e_100%)]"
        >
          <span
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(61,52,42,0.28),0_3px_12px_rgba(0,0,0,0.18)]"
            style={{ left: hueX, backgroundColor: hueColor }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick swatches
        </label>
        <div className="grid grid-cols-6 gap-2">
          {QUICK_SWATCHES.map((swatch) => {
            const isActive = swatch === resolvedColor;
            return (
              <button
                key={swatch}
                type="button"
                aria-label={`Use ${swatch} for text`}
                onClick={() => onChange(swatch)}
                className="h-8 rounded-[0.85rem] border transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: swatch,
                  borderColor: isActive ? 'rgba(61,52,42,0.42)' : 'rgba(141,124,105,0.18)',
                  boxShadow: isActive
                    ? '0 0 0 2px rgba(255,255,255,0.75) inset, 0 0 0 1px rgba(61,52,42,0.18)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.35)',
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hex
          </label>
          <input
            type="text"
            inputMode="text"
            spellCheck={false}
            value={hexInput}
            placeholder="#3D342A"
            onChange={(event) => commitHex(event.target.value)}
            onBlur={resetHexDraft}
            className="w-full rounded-md border bg-background px-3 py-1.5 font-mono text-sm outline-none ring-ring focus:ring-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            RGB
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['r', 'g', 'b'] as const).map((channel) => (
              <input
                key={channel}
                type="text"
                inputMode="numeric"
                spellCheck={false}
                value={rgbInput[channel]}
                placeholder={channel.toUpperCase()}
                onChange={(event) =>
                  commitRgb({
                    ...rgbInput,
                    [channel]: event.target.value.replace(/[^\d]/g, '').slice(0, 3),
                  })
                }
                onBlur={resetRgbDraft}
                className="w-full min-w-0 rounded-md border bg-background px-2 py-1.5 text-center font-mono text-sm outline-none ring-ring focus:ring-2"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
