import { describe, expect, it } from 'vitest';
import {
  cleanDocxExtractedText,
  cleanPdfExtractedPages,
  filterPdfMarginNoise,
  reconstructPdfPageLines,
  type PdfTextItem,
} from '@/features/ai-tutor/documentExtraction';

describe('reconstructPdfPageLines', () => {
  it('groups items into lines by y position and sorts each line by x position', () => {
    const items: PdfTextItem[] = [
      { str: 'Header', dir: 'ltr', transform: [1, 0, 0, 1, 64, 120], width: 12, height: 10, fontName: 'mock', hasEOL: false },
      { str: 'Semester', dir: 'ltr', transform: [1, 0, 0, 1, 10, 120], width: 24, height: 10, fontName: 'mock', hasEOL: false },
      { str: 'Force', dir: 'ltr', transform: [1, 0, 0, 1, 58, 90], width: 18, height: 10, fontName: 'mock', hasEOL: false },
      { str: 'Motion', dir: 'ltr', transform: [1, 0, 0, 1, 12, 89], width: 24, height: 10, fontName: 'mock', hasEOL: false },
    ];

    expect(reconstructPdfPageLines(items)).toEqual(['Semester Header', 'Motion Force']);
  });
});

describe('cleanDocxExtractedText', () => {
  it('removes whitespace, punctuation, and symbols while keeping letters and numbers', () => {
    expect(cleanDocxExtractedText(' Motion & Force, Week 2!\n速度 / 加速度。Résumé ١٢ ')).toBe(
      'MotionForceWeek2速度加速度Résumé١٢',
    );
  });

  it('rejects extracted text that stays below the minimum usable length after cleaning', () => {
    expect(() => cleanDocxExtractedText('abc 123')).toThrow('无法从该资料中提取可用文本。');
  });
});

describe('filterPdfMarginNoise', () => {
  it('removes repeated headers, repeated footers, and standalone page numbers while keeping unique first-page lines', () => {
    const pages = [
      [
        'Semester Physics Review',
        'School Name',
        'Confidential',
        'Motion & Force',
        'Speed, acceleration, and net force.',
        'District Footer',
        'Page 1 of 3',
      ],
      [
        'School Name',
        'Confidential',
        'Energy & Work',
        'Power, kinetic energy, and momentum.',
        'District Footer',
        'Page 2 of 3',
      ],
      [
        'School Name',
        'Confidential',
        'Waves & Sound',
        'Frequency, wavelength, and amplitude.',
        'District Footer',
        'Page 3 of 3',
      ],
    ];

    expect(filterPdfMarginNoise(pages)).toEqual([
      ['Semester Physics Review', 'Motion & Force', 'Speed, acceleration, and net force.'],
      ['Energy & Work', 'Power, kinetic energy, and momentum.'],
      ['Waves & Sound', 'Frequency, wavelength, and amplitude.'],
    ]);
  });
});

describe('cleanPdfExtractedPages', () => {
  it('removes body spaces, punctuation, and symbols after filtering page chrome', () => {
    const pages = [
      [
        'Semester Physics Review',
        'School Name',
        'Confidential',
        'Motion & Force',
        'Speed, acceleration, and net force.',
        'District Footer',
        'Page 1 of 3',
      ],
      [
        'School Name',
        'Confidential',
        'Energy & Work',
        'Power, kinetic energy, and momentum.',
        'District Footer',
        'Page 2 of 3',
      ],
      [
        'School Name',
        'Confidential',
        'Waves & Sound',
        'Frequency, wavelength, and amplitude.',
        'District Footer',
        'Page 3 of 3',
      ],
    ];

    expect(cleanPdfExtractedPages(pages)).toBe(
      'SemesterPhysicsReviewMotionForceSpeedaccelerationandnetforceEnergyWorkPowerkineticenergyandmomentumWavesSoundFrequencywavelengthandamplitude',
    );
  });

  it('rejects PDFs that contain only page-number noise after filtering', () => {
    expect(() => cleanPdfExtractedPages([['Page 1 of 2'], ['Page 2 of 2']])).toThrow('无法从该资料中提取可用文本。');
  });
});
