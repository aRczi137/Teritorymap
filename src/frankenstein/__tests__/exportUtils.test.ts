import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildExportFilename } from '../exportUtils';

// ---------------------------------------------------------------------------
// buildExportFilename — unit tests
// ---------------------------------------------------------------------------
describe('buildExportFilename', () => {
  it('returns the correct filename for a known date', () => {
    // 2024-01-05 09:05 local time
    const date = new Date(2024, 0, 5, 9, 5); // month is 0-based
    expect(buildExportFilename(date)).toBe('franky_layout_2024-01-05_09-05.png');
  });

  it('zero-pads single-digit month and day', () => {
    const date = new Date(2024, 2, 3, 8, 7); // March 3rd, 08:07
    expect(buildExportFilename(date)).toBe('franky_layout_2024-03-03_08-07.png');
  });

  it('handles end-of-year date', () => {
    const date = new Date(2023, 11, 31, 23, 59); // Dec 31st, 23:59
    expect(buildExportFilename(date)).toBe('franky_layout_2023-12-31_23-59.png');
  });

  it('handles midnight (00:00)', () => {
    const date = new Date(2024, 5, 15, 0, 0); // June 15th, 00:00
    expect(buildExportFilename(date)).toBe('franky_layout_2024-06-15_00-00.png');
  });

  it('zero-pads minutes', () => {
    const date = new Date(2024, 0, 1, 12, 5); // Jan 1st, 12:05
    expect(buildExportFilename(date)).toBe('franky_layout_2024-01-01_12-05.png');
  });
});

// ---------------------------------------------------------------------------
// buildExportFilename — Property 26: Format nazwy eksportowanego pliku
// Feature: player-grid-placement
// ---------------------------------------------------------------------------
describe('buildExportFilename — Property 26', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * For any date d, the exported filename SHALL match the pattern:
   * franky_layout_YYYY-MM-DD_HH-MM.png
   * where YYYY is 4-digit year, MM/DD/HH/MM are 2-digit zero-padded values.
   */
  it('P26: filename matches the required pattern for any date', () => {
    // Constrain to years 1000-9000 in UTC to avoid 5-digit years due to
    // timezone offsets pushing dates near year boundaries over 9999 or below 1000.
    const safeDate = fc.date({
      min: new Date('1000-06-01T00:00:00.000Z'),
      max: new Date('9000-06-01T00:00:00.000Z'),
    });
    fc.assert(
      fc.property(safeDate, (d) => {
        const filename = buildExportFilename(d);
        return /^franky_layout_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.png$/.test(filename);
      }),
      { numRuns: 200 },
    );
  });

  it('P26: filename components correctly reflect the date', () => {
    const safeDate = fc.date({
      min: new Date('1000-06-01T00:00:00.000Z'),
      max: new Date('9000-06-01T00:00:00.000Z'),
    });
    fc.assert(
      fc.property(safeDate, (d) => {
        const filename = buildExportFilename(d);
        const pad = (n: number) => String(n).padStart(2, '0');

        const year = String(d.getFullYear()).padStart(4, '0');
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hour = pad(d.getHours());
        const min = pad(d.getMinutes());

        const expected = `franky_layout_${year}-${month}-${day}_${hour}-${min}.png`;
        return filename === expected;
      }),
      { numRuns: 200 },
    );
  });
});
