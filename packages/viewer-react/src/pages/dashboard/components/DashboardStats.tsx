import type { LucideIcon } from 'lucide-react';
import { buildLinePoints } from '@/pages/dashboard/dashboardLib';
import type { ChartSeries } from '@/pages/dashboard/dashboardTypes';

export function TrendChart({
  labels,
  series,
  height = 220,
  formatLabel,
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  formatLabel?: (value: number) => string;
}) {
  const width = 640;
  const padding = 24;
  const valueList = series.flatMap((item) => item.values);
  const safeMaxValue = Math.max(...valueList, 1);
  const gridValues = Array.from({ length: 4 }, (_, index) =>
    Math.round((safeMaxValue * (4 - index)) / 4),
  );

  return (
    <div className="studio-chart">
      <div className="studio-chart__canvas" style={{ minHeight: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {gridValues.map((value, index) => {
            const y = padding + ((height - padding * 2) / (gridValues.length - 1)) * index;
            return (
              <g key={`${value}-${index}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  className="studio-chart__grid-line"
                />
                <text x={0} y={y + 4} className="studio-chart__axis-label">
                  {formatLabel ? formatLabel(value) : value}
                </text>
              </g>
            );
          })}

          {series.map((line) => {
            const points = buildLinePoints(line.values, width, height, padding);
            const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
            const areaPoints = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

            return (
              <g key={line.name}>
                {line.fillColor ? (
                  <polygon
                    points={areaPoints}
                    fill={line.fillColor}
                    stroke="none"
                    className="studio-chart__area"
                  />
                ) : null}
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="studio-chart__labels" aria-hidden="true">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  tone = 'mist',
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'mist' | 'sage' | 'amber' | 'lavender' | 'sky';
  detail?: string;
}) {
  return (
    <article className={`studio-metric-card studio-metric-card--${tone}`}>
      <span className="studio-metric-card__icon">
        <Icon size={19} />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}
