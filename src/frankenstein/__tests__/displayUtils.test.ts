import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { truncateName, getInitials, getContrastColor } from '../displayUtils';

// ---------------------------------------------------------------------------
// truncateName — unit tests
// ---------------------------------------------------------------------------
describe('truncateName', () => {
  it('returns a name of exactly 10 chars unchanged', () => {
    expect(truncateName('1234567890')).toBe('1234567890');
  });

  it('returns a name shorter than 10 chars unchanged', () => {
    expect(truncateName('Hello')).toBe('Hello');
  });

  it('truncates a name of 11 chars to 10 + ellipsis', () => {
    expect(truncateName('12345678901')).toBe('1234567890…');
  });

  it('truncates a long name', () => {
    expect(truncateName('Aleksandrowicz')).toBe('Aleksandro…');
  });

  it('returns empty string unchanged', () => {
    expect(truncateName('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// truncateName — property-based tests
// Feature: player-grid-placement, Property 18: Skracanie nazwy gracza
// ---------------------------------------------------------------------------
describe('truncateName — Property 18', () => {
  /**
   * **Validates: Requirements 6.2**
   *
   * For any string s:
   * - if s.length <= 10 → result === s
   * - if s.length > 10  → result === s.substring(0, 10) + "…"
   */
  it('P18: displayed name follows truncation rule for all strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = truncateName(s);
        if (s.length <= 10) {
          return result === s;
        } else {
          return result === s.substring(0, 10) + '…';
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// getInitials — unit tests
// ---------------------------------------------------------------------------
describe('getInitials', () => {
  it('returns first two chars for a single-word name', () => {
    expect(getInitials('Dragon')).toBe('Dr');
  });

  it('returns first letter of each word for multi-word name', () => {
    expect(getInitials('Jan Kowalski')).toBe('JK');
  });

  it('handles three-word names', () => {
    expect(getInitials('Anna Maria Nowak')).toBe('AMN');
  });

  it('handles a single character name', () => {
    expect(getInitials('X')).toBe('X');
  });

  it('handles exactly two characters in a single word', () => {
    expect(getInitials('AB')).toBe('AB');
  });

  it('trims leading/trailing spaces before splitting', () => {
    expect(getInitials('  Jan Kowalski  ')).toBe('JK');
  });
});

// ---------------------------------------------------------------------------
// getInitials — property-based tests
// Feature: player-grid-placement, Property 19: Inicjały przy braku ikony
// ---------------------------------------------------------------------------
describe('getInitials — Property 19', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * For any non-empty player name string:
   * - multi-word (≥2 words after trim): initials = first letter of each word
   * - single-word: initials = first 2 chars (or the whole word if shorter)
   */
  it('P19: initials follow the first-letter rule for multi-word names', () => {
    // Use strings that contain no whitespace to ensure each element in the
    // array maps directly to exactly one word when joined with " ".
    const nonSpaceWord = fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => !/\s/.test(s));

    fc.assert(
      fc.property(
        fc.array(nonSpaceWord, { minLength: 2, maxLength: 5 }),
        (words) => {
          const name = words.join(' ');
          const result = getInitials(name);
          const expectedInitials = words.map((w) => w.charAt(0)).join('');
          return result === expectedInitials;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P19: initials for single-word names are at most 2 chars', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (word) => {
        // Ensure no spaces so it counts as single-word
        const singleWord = word.replace(/\s+/g, 'a');
        const result = getInitials(singleWord);
        return result === singleWord.substring(0, 2);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// getContrastColor — unit tests
// ---------------------------------------------------------------------------
describe('getContrastColor', () => {
  it('returns #000000 for pure white', () => {
    expect(getContrastColor('#ffffff')).toBe('#000000');
  });

  it('returns #ffffff for pure black', () => {
    expect(getContrastColor('#000000')).toBe('#ffffff');
  });

  it('returns #000000 for a light color (yellow)', () => {
    expect(getContrastColor('#ffff00')).toBe('#000000');
  });

  it('returns #ffffff for a dark color (dark blue)', () => {
    expect(getContrastColor('#00008b')).toBe('#ffffff');
  });

  it('returns correct contrast for red-500 (#ef4444)', () => {
    // luminance = (0.299*239 + 0.587*68 + 0.114*68) / 255 ≈ 0.392 → dark bg → white text
    expect(getContrastColor('#ef4444')).toBe('#ffffff');
  });

  it('returns correct contrast for lime-500 (#84cc16)', () => {
    // luminance = (0.299*132 + 0.587*204 + 0.114*22) / 255 ≈ 0.607 → light bg → black text
    expect(getContrastColor('#84cc16')).toBe('#000000');
  });
});

// ---------------------------------------------------------------------------
// getContrastColor — property-based tests
// ---------------------------------------------------------------------------
describe('getContrastColor — properties', () => {
  /**
   * Result is always one of the two allowed values.
   */
  it('always returns either #ffffff or #000000', () => {
    const hexChar = fc.constantFrom(
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    );
    const hexColor = fc
      .array(hexChar, { minLength: 6, maxLength: 6 })
      .map((chars) => '#' + chars.join(''));

    fc.assert(
      fc.property(hexColor, (color) => {
        const result = getContrastColor(color);
        return result === '#ffffff' || result === '#000000';
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Luminance threshold: luminance > 0.5 → black text, else white text.
   */
  it('returns black text when luminance > 0.5, white otherwise', () => {
    // Use integer components to precisely control luminance
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (r, g, b) => {
          const toHex = (n: number) => n.toString(16).padStart(2, '0');
          const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const result = getContrastColor(color);
          if (luminance > 0.5) {
            return result === '#000000';
          } else {
            return result === '#ffffff';
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
