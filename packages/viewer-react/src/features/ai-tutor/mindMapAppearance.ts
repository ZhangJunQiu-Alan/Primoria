import type {
  MindMapBranchColor,
  MindMapLayout,
  MindMapMarker,
  MindMapNodeFill,
  MindMapNodeStyle,
  MindMapTheme,
  MindMapThemePreset,
} from '@/shared/api/viewer/types';

type MindMapThemePalette = {
  canvas: string;
  panel: string;
  edge: string;
  text: string;
  mutedText: string;
  grid: string;
  connection: string;
  rootFill: string;
  rootBorder: string;
  branchFills: [string, string, string];
  branchBorders: [string, string, string];
  labelFill: string;
  labelBorder: string;
};

export const MIND_MAP_THEME_PALETTES: Record<MindMapThemePreset, MindMapThemePalette> = {
  sage: {
    canvas: 'linear-gradient(180deg,#fbf7ef 0%,#f3efe4 100%)',
    panel: 'rgba(255, 251, 244, 0.92)',
    edge: '#dbcfc0',
    text: '#2f2822',
    mutedText: '#6d645a',
    grid: 'rgba(128, 113, 91, 0.08)',
    connection: '#7a9e7e',
    rootFill: 'linear-gradient(135deg,#f0e0bf 0%,#f7edd8 100%)',
    rootBorder: '#d5b98c',
    branchFills: ['#f5faf2', '#f8f2e8', '#f3f1fb'],
    branchBorders: ['#b8cdae', '#e0c9a5', '#cbc3e3'],
    labelFill: '#edf6eb',
    labelBorder: '#bfd4b7',
  },
  amber: {
    canvas: 'linear-gradient(180deg,#fff8ee 0%,#f7ecdd 100%)',
    panel: 'rgba(255, 250, 242, 0.94)',
    edge: '#e2cfbf',
    text: '#34281d',
    mutedText: '#756456',
    grid: 'rgba(157, 117, 71, 0.08)',
    connection: '#cf8b45',
    rootFill: 'linear-gradient(135deg,#ffd39c 0%,#f8ebd1 100%)',
    rootBorder: '#d7a468',
    branchFills: ['#fff4e4', '#fff8f0', '#f6efe8'],
    branchBorders: ['#efc18f', '#f1d2ad', '#dcc8b1'],
    labelFill: '#fff0d8',
    labelBorder: '#efc18f',
  },
  stone: {
    canvas: 'linear-gradient(180deg,#f7f6f3 0%,#ece9e3 100%)',
    panel: 'rgba(248, 247, 244, 0.95)',
    edge: '#d5d2cb',
    text: '#262626',
    mutedText: '#67635c',
    grid: 'rgba(91, 91, 91, 0.07)',
    connection: '#6f7d8d',
    rootFill: 'linear-gradient(135deg,#dde4ec 0%,#f3f5f7 100%)',
    rootBorder: '#aab7c7',
    branchFills: ['#f5f5f2', '#edf2f4', '#f7efe8'],
    branchBorders: ['#d2cec5', '#bfd0d9', '#d8c7b8'],
    labelFill: '#eef2f6',
    labelBorder: '#c7d4df',
  },
};

export const MIND_MAP_MARKERS: MindMapMarker[] = [
  'priority-high',
  'priority-medium',
  'status-active',
  'status-done',
  'star',
];

export const MIND_MAP_FILL_OPTIONS: MindMapNodeFill[] = ['auto', 'sage', 'amber', 'stone', 'slate'];
export const MIND_MAP_BRANCH_COLOR_OPTIONS: MindMapBranchColor[] = ['auto', 'sage', 'amber', 'stone', 'rose', 'slate'];

const MARKER_SET = new Set<string>(MIND_MAP_MARKERS);
const THEME_PRESET_SET = new Set<MindMapThemePreset>(['sage', 'amber', 'stone']);
const FILL_SET = new Set<MindMapNodeFill>(MIND_MAP_FILL_OPTIONS);
const BRANCH_SET = new Set<MindMapBranchColor>(MIND_MAP_BRANCH_COLOR_OPTIONS);
const SHAPE_SET = new Set<MindMapNodeStyle['shape']>(['capsule', 'rounded', 'underline']);

export function createDefaultMindMapTheme(): MindMapTheme {
  return { preset: 'sage' };
}

export function createDefaultMindMapLayout(): MindMapLayout {
  return {
    mode: 'balanced',
    connectionStyle: 'curve',
  };
}

export function createDefaultMindMapNodeStyle(): MindMapNodeStyle {
  return {
    shape: 'rounded',
    fill: 'auto',
    emphasis: 'normal',
    branchColor: 'auto',
  };
}

export function normalizeMindMapTheme(value: unknown): MindMapTheme {
  const preset = value && typeof value === 'object' ? (value as { preset?: unknown }).preset : null;
  return {
    preset: typeof preset === 'string' && THEME_PRESET_SET.has(preset as MindMapThemePreset)
      ? (preset as MindMapThemePreset)
      : 'sage',
  };
}

export function normalizeMindMapLayout(value: unknown): MindMapLayout {
  const mode = value && typeof value === 'object' ? (value as { mode?: unknown }).mode : null;
  const connectionStyle =
    value && typeof value === 'object' ? (value as { connectionStyle?: unknown }).connectionStyle : null;

  return {
    mode: mode === 'balanced' ? 'balanced' : 'balanced',
    connectionStyle: connectionStyle === 'curve' ? 'curve' : 'curve',
  };
}

export function normalizeMindMapMarkers(value: unknown): MindMapMarker[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((marker): marker is MindMapMarker => typeof marker === 'string' && MARKER_SET.has(marker)))];
}

export function normalizeMindMapNodeStyle(value: unknown): MindMapNodeStyle {
  const record = value && typeof value === 'object' ? (value as Partial<MindMapNodeStyle>) : {};

  return {
    shape: typeof record.shape === 'string' && SHAPE_SET.has(record.shape) ? record.shape : 'rounded',
    fill: typeof record.fill === 'string' && FILL_SET.has(record.fill) ? record.fill : 'auto',
    emphasis: record.emphasis === 'strong' ? 'strong' : 'normal',
    branchColor: typeof record.branchColor === 'string' && BRANCH_SET.has(record.branchColor)
      ? record.branchColor
      : 'auto',
  };
}

export function resolveMindMapThemePalette(theme: MindMapTheme) {
  return MIND_MAP_THEME_PALETTES[theme.preset] ?? MIND_MAP_THEME_PALETTES.sage;
}
