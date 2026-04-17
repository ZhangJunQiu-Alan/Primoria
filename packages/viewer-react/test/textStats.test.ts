import { describe, expect, it } from 'vitest';
import { countMeaningfulChars, extractMeaningfulChars } from '@/shared/utils/textStats';

describe('countMeaningfulChars', () => {
  it('counts English letters and digits', () => {
    expect(countMeaningfulChars('Hello 123')).toBe(8);
  });

  it('counts CJK ideographs', () => {
    expect(countMeaningfulChars('你好，世界！')).toBe(4);
  });

  it('mixes English, CJK, and digits', () => {
    expect(countMeaningfulChars('Ch01 软件 dev')).toBe(9);
  });

  it('counts Unicode letters and numbers beyond ASCII and CJK', () => {
    expect(countMeaningfulChars('Résumé ١٢')).toBe(8);
  });

  it('ignores whitespace, punctuation, and line breaks', () => {
    expect(countMeaningfulChars('  — ,.\n\t  ')).toBe(0);
  });

  it('handles empty input', () => {
    expect(countMeaningfulChars('')).toBe(0);
  });
});

describe('extractMeaningfulChars', () => {
  it('keeps only Unicode letters and numbers', () => {
    expect(extractMeaningfulChars(' Résumé-2026，测试! ١٢ ')).toBe('Résumé2026测试١٢');
  });
});
