import { Pause, Play, RotateCcw, Waves } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { InteractiveVisualRendererProps } from '@/shared/interactive-visual/interactiveVisualRendererTypes';

type WaveParams = {
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
};

type PhysicsCanvasRuntime = {
  simulation: 'wave';
  params: WaveParams;
};

const DEFAULT_WAVE_PARAMS: WaveParams = {
  amplitude: 1,
  frequency: 1,
  phase: 0,
  speed: 0.7,
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function parsePhysicsCanvasRuntime(content: Record<string, unknown>): PhysicsCanvasRuntime | null {
  const runtime = toRecord(content.runtime);
  const simulation = typeof runtime.simulation === 'string' ? runtime.simulation.trim() : '';
  if (simulation && simulation !== 'wave') {
    return null;
  }

  const params = toRecord(runtime.params);
  return {
    simulation: 'wave',
    params: {
      amplitude: clampNumber(params.amplitude, DEFAULT_WAVE_PARAMS.amplitude, 0.2, 2.5),
      frequency: clampNumber(params.frequency, DEFAULT_WAVE_PARAMS.frequency, 0.5, 4),
      phase: clampNumber(params.phase, DEFAULT_WAVE_PARAMS.phase, 0, Math.PI * 2),
      speed: clampNumber(params.speed, DEFAULT_WAVE_PARAMS.speed, 0, 2),
    },
  };
}

function drawWaveFrame({
  canvas,
  params,
  elapsed,
}: {
  canvas: HTMLCanvasElement;
  params: WaveParams;
  elapsed: number;
}) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(bounds.width || 960));
  const height = Math.max(260, Math.floor(bounds.height || 420));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = { left: 52, right: 30, top: 34, bottom: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const centerY = padding.top + plotHeight / 2;
  const amplitudePx = Math.min(plotHeight * 0.42, params.amplitude * 54);
  const phase = params.phase + elapsed * params.speed;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#fffdf8');
  background.addColorStop(0.56, '#f5efe5');
  background.addColorStop(1, '#ecf4ef');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(103, 91, 75, 0.13)';
  context.lineWidth = 1;
  for (let index = 0; index <= 6; index += 1) {
    const x = padding.left + (plotWidth * index) / 6;
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, height - padding.bottom);
    context.stroke();
  }
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (plotHeight * index) / 4;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  context.strokeStyle = 'rgba(61, 52, 42, 0.5)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(padding.left, centerY);
  context.lineTo(width - padding.right, centerY);
  context.stroke();

  const drawCurve = (offset: number, color: string, lineWidth: number) => {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    for (let sample = 0; sample <= plotWidth; sample += 2) {
      const normalized = sample / plotWidth;
      const angle = normalized * Math.PI * 2 * params.frequency + phase + offset;
      const x = padding.left + sample;
      const y = centerY - Math.sin(angle) * amplitudePx;
      if (sample === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  };

  drawCurve(Math.PI / 2, 'rgba(194, 127, 70, 0.52)', 2);
  drawCurve(0, '#4f8f75', 4);

  const markerX = padding.left + plotWidth * 0.62;
  const markerAngle = 0.62 * Math.PI * 2 * params.frequency + phase;
  const markerY = centerY - Math.sin(markerAngle) * amplitudePx;

  context.strokeStyle = 'rgba(79, 143, 117, 0.28)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(markerX, centerY);
  context.lineTo(markerX, markerY);
  context.stroke();

  context.fillStyle = '#4f8f75';
  context.beginPath();
  context.arc(markerX, markerY, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fffdf8';
  context.beginPath();
  context.arc(markerX, markerY, 3, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#4d4337';
  context.font = '700 12px ui-sans-serif, system-ui, sans-serif';
  context.fillText('amplitude', 14, centerY - amplitudePx + 4);
  context.fillText('phase marker', Math.min(markerX + 12, width - 112), Math.max(padding.top + 18, markerY - 10));

  context.fillStyle = 'rgba(61, 52, 42, 0.68)';
  context.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  context.fillText('0', padding.left - 18, centerY + 4);
  context.fillText('time', width - padding.right - 28, height - 18);
}

function formatValue(value: number, suffix = '') {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${suffix}`;
}

export function PhysicsCanvasWaveRenderer({ content, title, description }: InteractiveVisualRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const runtime = useMemo(() => parsePhysicsCanvasRuntime(content), [content]);
  const initialParams = runtime?.params ?? DEFAULT_WAVE_PARAMS;
  const [params, setParams] = useState<WaveParams>(initialParams);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !runtime) {
      return undefined;
    }

    const draw = (timestamp: number) => {
      if (startedAtRef.current === null || !isPlaying) {
        startedAtRef.current = timestamp;
      }
      const elapsed = (timestamp - startedAtRef.current) / 1000;
      drawWaveFrame({ canvas, params, elapsed });
      animationRef.current = window.requestAnimationFrame(draw);
    };

    animationRef.current = window.requestAnimationFrame(draw);
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = null;
    };
  }, [isPlaying, params, runtime]);

  if (!runtime) {
    return (
      <div className="rounded-3xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
          Unsupported physics simulation
        </p>
        <h3 className="mt-2 text-lg font-black text-[var(--viewer-text)]">{title}</h3>
        <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">
          This renderer currently supports runtime.simulation = "wave".
        </p>
      </div>
    );
  }

  const updateParam = (key: keyof WaveParams, value: number) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#d9cdbd] bg-[rgba(255,252,247,0.96)] shadow-[0_14px_28px_rgba(90,70,50,0.08)]">
      <div className="border-b border-[#e9dece] px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#66846e]">
              <Waves size={16} />
              Physics canvas
            </p>
            <h3
              className="mt-1 text-[1.5rem] font-semibold tracking-[-0.03em] text-[#3d342a]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsPlaying((value) => !value)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7cab8] bg-[#fffaf2] px-4 text-sm font-bold text-[#4c6f5a] transition hover:bg-[#eef6ef]"
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
        {description ? <p className="mt-2 text-sm font-medium leading-6 text-[#7c6f64]">{description}</p> : null}
      </div>

      <div className="grid gap-0 bg-[#fffaf2] lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-[360px] p-3 md:p-4">
          <canvas
            ref={canvasRef}
            aria-label={`${title} wave simulation`}
            className="h-[360px] w-full rounded-[18px] border border-[#e1d5c5] bg-[#fffdf8]"
          />
        </div>

        <div className="border-t border-[#e9dece] bg-[#fbf6ee] p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7c6f64]">Controls</p>
            <button
              type="button"
              onClick={() => {
                startedAtRef.current = null;
                setParams(initialParams);
              }}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d7cab8] bg-white px-3 text-xs font-bold text-[#7c6f64] transition hover:bg-[#eef6ef]"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <WaveControl
              label="Amplitude"
              value={params.amplitude}
              min={0.2}
              max={2.5}
              step={0.1}
              display={formatValue(params.amplitude)}
              onChange={(value) => updateParam('amplitude', value)}
            />
            <WaveControl
              label="Frequency"
              value={params.frequency}
              min={0.5}
              max={4}
              step={0.1}
              display={formatValue(params.frequency, 'x')}
              onChange={(value) => updateParam('frequency', value)}
            />
            <WaveControl
              label="Phase"
              value={params.phase}
              min={0}
              max={Number((Math.PI * 2).toFixed(1))}
              step={0.1}
              display={`${params.phase.toFixed(1)} rad`}
              onChange={(value) => updateParam('phase', value)}
            />
            <WaveControl
              label="Speed"
              value={params.speed}
              min={0}
              max={2}
              step={0.1}
              display={formatValue(params.speed, 'x')}
              onChange={(value) => updateParam('speed', value)}
            />
          </div>

          <div className="mt-5 rounded-[18px] border border-[#e1d5c5] bg-white/80 p-3 text-sm font-medium leading-6 text-[#665a4e]">
            Higher amplitude makes peaks taller. Higher frequency packs more cycles into the same span. Phase shifts the
            curve without changing its shape.
          </div>
        </div>
      </div>
    </section>
  );
}

function WaveControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-bold text-[#4b4237]">
        <span>{label}</span>
        <span className="rounded-full bg-[#eef6ef] px-2.5 py-1 text-xs text-[#4f7c62]">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-2 w-full accent-[#5d9676]"
      />
    </label>
  );
}
