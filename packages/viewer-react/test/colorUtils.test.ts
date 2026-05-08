import { describe, expect, it } from 'vitest';
import {
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHexColor,
  rgbToHex,
} from '@/shared/color/colorUtils';

describe('normalizeHexColor', () => {
  it('normalizes three-digit and six-digit hex values', () => {
    expect(normalizeHexColor('#AbC')).toBe('#aabbcc');
    expect(normalizeHexColor('7A9E7E')).toBe('#7a9e7e');
  });

  it('rejects invalid hex values', () => {
    expect(normalizeHexColor('#12')).toBeNull();
    expect(normalizeHexColor('xyzxyz')).toBeNull();
  });
});

describe('rgb and hsv helpers', () => {
  it('converts rgb values into hex', () => {
    expect(rgbToHex({ r: 122, g: 158, b: 126 })).toBe('#7a9e7e');
  });

  it('round-trips between hex and rgb', () => {
    expect(hexToRgb('#7a9e7e')).toEqual({ r: 122, g: 158, b: 126 });
  });

  it('round-trips between hex and hsv', () => {
    const hsv = hexToHsv('#c4956a');

    expect(hsv).not.toBeNull();
    expect(hsvToHex(hsv!)).toBe('#c4956a');
  });
});
