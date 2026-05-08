export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

export const DEFAULT_TEXT_COLOR = '#3d342a';

export function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

  if (/^#[\da-fA-F]{3}$/.test(prefixed)) {
    const [, r, g, b] = prefixed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[\da-fA-F]{6}$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }

  return null;
}

export function hexToRgb(value: string): RgbColor | null {
  const normalized = normalizeHexColor(value);

  if (!normalized) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(rgb: RgbColor) {
  const toHex = (channel: number) => clampColorChannel(channel).toString(16).padStart(2, '0');

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsv(rgb: RgbColor): HsvColor {
  const r = clampColorChannel(rgb.r) / 255;
  const g = clampColorChannel(rgb.g) / 255;
  const b = clampColorChannel(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToRgb(hsv: HsvColor): RgbColor {
  const hue = ((hsv.h % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(1, hsv.s));
  const value = Math.max(0, Math.min(1, hsv.v));
  const chroma = value * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: clampColorChannel((red + match) * 255),
    g: clampColorChannel((green + match) * 255),
    b: clampColorChannel((blue + match) * 255),
  };
}

export function hexToHsv(value: string) {
  const rgb = hexToRgb(value);
  return rgb ? rgbToHsv(rgb) : null;
}

export function hsvToHex(hsv: HsvColor) {
  return rgbToHex(hsvToRgb(hsv));
}
