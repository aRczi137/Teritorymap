import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getCells,
  hasCollision,
  isOutOfBounds,
  getDefaultFrankyPosition,
} from '../gridUtils';

// ---------------------------------------------------------------------------
// getCells — unit tests
// ---------------------------------------------------------------------------
describe('getCells', () => {
  it('returns exactly 4 cells for a 2×2 block', () => {
    const cells = getCells({ col: 0, row: 0 });
    expect(cells).toHaveLength(4);
  });

  it('returns the correct 4 cells for position (0, 0)', () => {
    expect(getCells({ col: 0, row: 0 })).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
  });

  it('returns the correct 4 cells for an arbitrary position (5, 3)', () => {
    expect(getCells({ col: 5, row: 3 })).toEqual([
      { col: 5, row: 3 },
      { col: 6, row: 3 },
      { col: 5, row: 4 },
      { col: 6, row: 4 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// hasCollision — unit tests
// ---------------------------------------------------------------------------
describe('hasCollision', () => {
  it('same position → collision', () => {
    expect(hasCollision({ col: 2, row: 2 }, { col: 2, row: 2 })).toBe(true);
  });

  it('overlapping positions (1 cell shared) → collision', () => {
    // Block A at (0,0): cells (0,0),(1,0),(0,1),(1,1)
    // Block B at (1,0): cells (1,0),(2,0),(1,1),(2,1) — shares (1,0) and (1,1)
    expect(hasCollision({ col: 0, row: 0 }, { col: 1, row: 0 })).toBe(true);
  });

  it('adjacent blocks (no shared cells) → no collision', () => {
    // Block A at (0,0): cells (0,0),(1,0),(0,1),(1,1)
    // Block B at (2,0): cells (2,0),(3,0),(2,1),(3,1) — no overlap
    expect(hasCollision({ col: 0, row: 0 }, { col: 2, row: 0 })).toBe(false);
  });

  it('blocks separated vertically → no collision', () => {
    // Block A at (0,0): rows 0-1
    // Block B at (0,2): rows 2-3 — no overlap
    expect(hasCollision({ col: 0, row: 0 }, { col: 0, row: 2 })).toBe(false);
  });

  it('blocks far apart → no collision', () => {
    expect(hasCollision({ col: 0, row: 0 }, { col: 10, row: 10 })).toBe(false);
  });

  it('diagonal offset by 1 in both axes → no collision', () => {
    // Block A at (0,0): cells (0,0),(1,0),(0,1),(1,1)
    // Block B at (2,2): cells (2,2),(3,2),(2,3),(3,3) — no overlap
    expect(hasCollision({ col: 0, row: 0 }, { col: 2, row: 2 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isOutOfBounds — unit tests
// ---------------------------------------------------------------------------
describe('isOutOfBounds', () => {
  it('block within bounds → not out of bounds', () => {
    // cols=10, rows=10: block at (0,0) uses cols 0-1, rows 0-1 → valid
    expect(isOutOfBounds({ col: 0, row: 0 }, 10, 10)).toBe(false);
  });

  it('block at max valid position → not out of bounds', () => {
    // cols=10, rows=10: block at (8,8) uses cols 8-9, rows 8-9 → valid (col+1=9 < 10)
    expect(isOutOfBounds({ col: 8, row: 8 }, 10, 10)).toBe(false);
  });

  it('block at last column → out of bounds (col+1 >= cols)', () => {
    // cols=10: block at col=9 needs col+1=10 >= cols → out of bounds
    expect(isOutOfBounds({ col: 9, row: 0 }, 10, 10)).toBe(true);
  });

  it('block at last row → out of bounds (row+1 >= rows)', () => {
    // rows=10: block at row=9 needs row+1=10 >= rows → out of bounds
    expect(isOutOfBounds({ col: 0, row: 9 }, 10, 10)).toBe(true);
  });

  it('negative column → out of bounds', () => {
    expect(isOutOfBounds({ col: -1, row: 0 }, 10, 10)).toBe(true);
  });

  it('negative row → out of bounds', () => {
    expect(isOutOfBounds({ col: 0, row: -1 }, 10, 10)).toBe(true);
  });

  it('block completely outside → out of bounds', () => {
    expect(isOutOfBounds({ col: 100, row: 100 }, 10, 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getDefaultFrankyPosition — unit tests
// ---------------------------------------------------------------------------
describe('getDefaultFrankyPosition', () => {
  it('returns correct center position for 20×20 grid', () => {
    // col = Math.floor(20/2) - 1 = 9, row = Math.floor(20/2) - 1 = 9
    expect(getDefaultFrankyPosition(20, 20)).toEqual({ col: 9, row: 9 });
  });

  it('returns correct center position for 10×10 grid', () => {
    // col = Math.floor(10/2) - 1 = 4, row = 4
    expect(getDefaultFrankyPosition(10, 10)).toEqual({ col: 4, row: 4 });
  });

  it('returns correct position for 5×5 grid (minimum size)', () => {
    // col = Math.floor(5/2) - 1 = 1, row = 1
    expect(getDefaultFrankyPosition(5, 5)).toEqual({ col: 1, row: 1 });
  });

  it('returns correct position for non-square grid 10×20', () => {
    // col = Math.floor(10/2) - 1 = 4, row = Math.floor(20/2) - 1 = 9
    expect(getDefaultFrankyPosition(10, 20)).toEqual({ col: 4, row: 9 });
  });

  it('returns correct position for odd dimensions 11×7', () => {
    // col = Math.floor(11/2) - 1 = 4, row = Math.floor(7/2) - 1 = 2
    expect(getDefaultFrankyPosition(11, 7)).toEqual({ col: 4, row: 2 });
  });
});

// ---------------------------------------------------------------------------
// getCells — property-based tests
// Feature: player-grid-placement, Property 17: Blok gracza zajmuje dokładnie 2×2 komórki
// ---------------------------------------------------------------------------
describe('getCells — Property 17', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For any position (col, row), getCells returns exactly 4 cells:
   * {(col, row), (col+1, row), (col, row+1), (col+1, row+1)}
   */
  it('P17: getCells returns exactly 4 cells for any position', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 38 }),
        fc.integer({ min: 0, max: 38 }),
        (col, row) => {
          const cells = getCells({ col, row });
          return cells.length === 4;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17: getCells returns the exact 4 expected cells for any position', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 38 }),
        fc.integer({ min: 0, max: 38 }),
        (col, row) => {
          const cells = getCells({ col, row });
          const expected = [
            { col, row },
            { col: col + 1, row },
            { col, row: row + 1 },
            { col: col + 1, row: row + 1 },
          ];
          return expected.every((exp, i) =>
            cells[i].col === exp.col && cells[i].row === exp.row,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
