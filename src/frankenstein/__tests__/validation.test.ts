import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePlayerName, validateGridDimensions } from '../validation';
import type { Player } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePlayer(name: string): Player {
  return { id: crypto.randomUUID(), name, level: 'I2', color: '#64748b' };
}

// ---------------------------------------------------------------------------
// validatePlayerName — unit tests
// ---------------------------------------------------------------------------
describe('validatePlayerName', () => {
  it('empty name → returns error (not null)', () => {
    expect(validatePlayerName('', [])).not.toBeNull();
  });

  it('whitespace-only name → returns error', () => {
    expect(validatePlayerName('   ', [])).not.toBeNull();
  });

  it('name of length 1 → accepted (returns null)', () => {
    expect(validatePlayerName('A', [])).toBeNull();
  });

  it('name of length 20 → accepted (returns null)', () => {
    expect(validatePlayerName('A'.repeat(20), [])).toBeNull();
  });

  it('name of length 21 → rejected', () => {
    expect(validatePlayerName('A'.repeat(21), [])).not.toBeNull();
  });

  it('name of length 21 with leading space → rejected (trimmed to 20, accepted)', () => {
    // " " + "A"*20 → trim → 20 chars → accepted
    expect(validatePlayerName(' ' + 'A'.repeat(20), [])).toBeNull();
  });

  it('duplicate name (exact match) → rejected with duplicate message', () => {
    const players = [makePlayer('Jan')];
    const result = validatePlayerName('Jan', players);
    expect(result).toBe('Gracz o tej nazwie już istnieje');
  });

  it('duplicate name (case-insensitive uppercase) → rejected', () => {
    const players = [makePlayer('jan')];
    const result = validatePlayerName('JAN', players);
    expect(result).toBe('Gracz o tej nazwie już istnieje');
  });

  it('duplicate name (case-insensitive mixed) → rejected', () => {
    const players = [makePlayer('Dragon')];
    const result = validatePlayerName('dRaGoN', players);
    expect(result).toBe('Gracz o tej nazwie już istnieje');
  });

  it('unique name in non-empty list → accepted', () => {
    const players = [makePlayer('Jan'), makePlayer('Ewa')];
    expect(validatePlayerName('Marek', players)).toBeNull();
  });

  it('name that trims to match existing → rejected', () => {
    const players = [makePlayer('Jan')];
    // '  Jan  ' trimmed = 'Jan' which matches
    expect(validatePlayerName('  Jan  ', players)).toBe('Gracz o tej nazwie już istnieje');
  });
});

// ---------------------------------------------------------------------------
// validateGridDimensions — unit tests
// ---------------------------------------------------------------------------
describe('validateGridDimensions', () => {
  it('valid dimensions (10, 10) → returns null', () => {
    expect(validateGridDimensions(10, 10)).toBeNull();
  });

  it('minimum valid dimensions (5, 5) → returns null', () => {
    expect(validateGridDimensions(5, 5)).toBeNull();
  });

  it('maximum valid dimensions (40, 40) → returns null', () => {
    expect(validateGridDimensions(40, 40)).toBeNull();
  });

  it('cols below range (4) → rejected', () => {
    expect(validateGridDimensions(4, 10)).not.toBeNull();
  });

  it('cols above range (41) → rejected', () => {
    expect(validateGridDimensions(41, 10)).not.toBeNull();
  });

  it('rows below range (4) → rejected', () => {
    expect(validateGridDimensions(10, 4)).not.toBeNull();
  });

  it('rows above range (41) → rejected', () => {
    expect(validateGridDimensions(10, 41)).not.toBeNull();
  });

  it('both out of range → rejected', () => {
    expect(validateGridDimensions(0, 0)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validatePlayerName — Property 3: Walidacja nazwy gracza
// Feature: player-grid-placement
// ---------------------------------------------------------------------------
describe('validatePlayerName — Property 3', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * For any string s:
   * - If s.trim().length >= 1 AND s.trim().length <= 20 → result === null (valid)
   * - Otherwise → result !== null (error)
   */
  it('P3: validation succeeds iff trimmed length is between 1 and 20', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = validatePlayerName(s, []);
        const trimmed = s.trim();
        const valid = trimmed.length >= 1 && trimmed.length <= 20;
        if (valid) {
          return result === null;
        } else {
          return result !== null;
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// validatePlayerName — Property 7: Zakaz duplikatów (case-insensitive)
// Feature: player-grid-placement
// ---------------------------------------------------------------------------
describe('validatePlayerName — Property 7', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * For any valid player name s (1-20 chars after trim), if a player with that
   * name already exists (case-insensitive), the validation SHALL be rejected
   * with the duplicate message.
   */
  it('P7: duplicate names (case-insensitive) are always rejected', () => {
    const validName = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length >= 1 && s.trim().length <= 20);

    fc.assert(
      fc.property(validName, (name) => {
        const trimmedName = name.trim();
        const existingPlayer = makePlayer(trimmedName);

        // Try adding a variant with different casing
        const upperVariant = trimmedName.toUpperCase();
        const lowerVariant = trimmedName.toLowerCase();

        const resultUpper = validatePlayerName(upperVariant, [existingPlayer]);
        const resultLower = validatePlayerName(lowerVariant, [existingPlayer]);

        // Both should be rejected with the duplicate message
        return (
          resultUpper === 'Gracz o tej nazwie już istnieje' &&
          resultLower === 'Gracz o tej nazwie już istnieje'
        );
      }),
      { numRuns: 100 },
    );
  });

  it('P7: adding name with same content but different case always rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length >= 1),
        (existingName) => {
          const trimmed = existingName.trim();
          if (trimmed.length > 20) return true; // skip oversized after trim
          const players = [makePlayer(trimmed)];
          const result = validatePlayerName(trimmed, players);
          return result === 'Gracz o tej nazwie już istnieje';
        },
      ),
      { numRuns: 100 },
    );
  });
});
