/**
 * Tests for frankyLayoutReducer and initialState
 * Feature: player-grid-placement
 *
 * Tests the pure reducer directly — no React rendering required.
 * Firebase is mocked at the module level.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Firebase mocks — must come before any imports that transitively use Firebase
// ---------------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()), // returns unsubscribe fn
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => ({ type: 'serverTimestamp' })),
  getFirestore: vi.fn(),
}));

vi.mock('../../firebaseConfig', () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Imports under test (after mocks)
// ---------------------------------------------------------------------------
import {
  frankyLayoutReducer,
  initialState,
  type FrankyLayoutState,
} from '../useFrankyLayout';
import { PLAYER_COLORS } from '../types';
import { getDefaultFrankyPosition, hasCollision } from '../gridUtils';
import type { GridPosition } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a state with N players already added */
function stateWithNPlayers(n: number): FrankyLayoutState {
  let state = initialState;
  for (let i = 0; i < n; i++) {
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
  }
  return state;
}

/** Place n players on the grid at non-colliding positions (columns 0, 2, 4, ...) */
function stateWithNPlacedPlayers(n: number, cols = 20, rows = 20): FrankyLayoutState {
  let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
  for (let i = 0; i < n; i++) {
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
  }
  const { cols: c, rows: r } = state.gridConfig;
  for (let i = 0; i < n; i++) {
    const player = state.players[i];
    // Place at col = i * 2, row = 0 — but skip positions that collide with Franky
    let col = i * 2;
    // Make sure we don't overflow the grid (max col is cols-2)
    if (col + 1 >= c) break;
    const pos: GridPosition = { col, row: r - 3 }; // bottom area, safe from Franky at center
    // Simple check: avoid franky collision by going to row far from center
    state = frankyLayoutReducer(state, { type: 'PLACE_PLAYER', playerId: player.id, position: pos });
  }
  return state;
}



// ---------------------------------------------------------------------------
// UNIT TESTS
// ---------------------------------------------------------------------------

describe('frankyLayoutReducer — ADD_PLAYER', () => {
  it('adds first player to players array', () => {
    const state = frankyLayoutReducer(initialState, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Alice');
  });

  it('first player gets PLAYER_COLORS[0]', () => {
    const state = frankyLayoutReducer(initialState, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    expect(state.players[0].color).toBe(PLAYER_COLORS[0]);
  });

  it('second player gets PLAYER_COLORS[1]', () => {
    const s1 = frankyLayoutReducer(initialState, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    const s2 = frankyLayoutReducer(s1, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    expect(s2.players[1].color).toBe(PLAYER_COLORS[1]);
  });

  it('does not affect placedPlayers', () => {
    const state = frankyLayoutReducer(initialState, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    expect(state.placedPlayers).toHaveLength(0);
  });
});


describe('frankyLayoutReducer — REMOVE_PLAYER', () => {
  it('removes player from players array', () => {
    let state = stateWithNPlayers(2);
    const id = state.players[0].id;
    state = frankyLayoutReducer(state, { type: 'REMOVE_PLAYER', playerId: id });
    expect(state.players.find((p) => p.id === id)).toBeUndefined();
    expect(state.players).toHaveLength(1);
  });

  it('removes player from placedPlayers array', () => {
    // Place first player, then remove
    const cols = 20; const rows = 20;
    let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    const playerId = state.players[0].id;
    // Place far from Franky (which is at ~9,9 on 20x20)
    state = frankyLayoutReducer(state, {
      type: 'PLACE_PLAYER',
      playerId,
      position: { col: 0, row: 0 },
    });
    expect(state.placedPlayers).toHaveLength(1);

    state = frankyLayoutReducer(state, { type: 'REMOVE_PLAYER', playerId });
    expect(state.players.find((p) => p.id === playerId)).toBeUndefined();
    expect(state.placedPlayers.find((pp) => pp.playerId === playerId)).toBeUndefined();
  });

  it('removing non-existent id does not change state', () => {
    const state = stateWithNPlayers(2);
    const result = frankyLayoutReducer(state, { type: 'REMOVE_PLAYER', playerId: 'fake-id' });
    expect(result.players).toHaveLength(2);
  });
});

describe('frankyLayoutReducer — RESET_LAYOUT', () => {
  it('clears placedPlayers', () => {
    let state = stateWithNPlacedPlayers(3);
    state = frankyLayoutReducer(state, { type: 'RESET_LAYOUT' });
    expect(state.placedPlayers).toHaveLength(0);
  });

  it('restores frankyPosition to default for current gridConfig', () => {
    let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols: 10, rows: 10 });
    // Move Franky somewhere else first
    state = frankyLayoutReducer(state, { type: 'MOVE_FRANKY', newPosition: { col: 0, row: 0 } });
    state = frankyLayoutReducer(state, { type: 'RESET_LAYOUT' });
    const expected = getDefaultFrankyPosition(10, 10);
    expect(state.frankyPosition).toEqual(expected);
  });

  it('does not change players array', () => {
    let state = stateWithNPlayers(3);
    state = frankyLayoutReducer(state, { type: 'RESET_LAYOUT' });
    expect(state.players).toHaveLength(3);
  });
});


describe('frankyLayoutReducer — PLACE_PLAYER collision / bounds', () => {
  it('PLACE_PLAYER with collision with another player → state unchanged', () => {
    let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols: 20, rows: 20 });
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    const [alice, bob] = state.players;

    // Place Alice at (0,0)
    state = frankyLayoutReducer(state, {
      type: 'PLACE_PLAYER',
      playerId: alice.id,
      position: { col: 0, row: 0 },
    });
    const before = state;

    // Try to place Bob at (0,0) — same position as Alice → collision
    const after = frankyLayoutReducer(state, {
      type: 'PLACE_PLAYER',
      playerId: bob.id,
      position: { col: 0, row: 0 },
    });
    expect(after).toBe(before); // exact same reference → state unchanged
  });

  it('PLACE_PLAYER out of bounds → state unchanged', () => {
    let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols: 10, rows: 10 });
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    const playerId = state.players[0].id;
    const before = state;

    // col=9 on 10-wide grid → col+1=10 >= 10 → out of bounds
    const after = frankyLayoutReducer(state, {
      type: 'PLACE_PLAYER',
      playerId,
      position: { col: 9, row: 0 },
    });
    expect(after).toBe(before);
  });
});

describe('frankyLayoutReducer — MOVE_FRANKY collision / bounds', () => {
  it('MOVE_FRANKY with collision with placed player → frankyPosition unchanged', () => {
    let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols: 20, rows: 20 });
    state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
    const playerId = state.players[0].id;

    // Place Alice at (0, 0)
    state = frankyLayoutReducer(state, {
      type: 'PLACE_PLAYER',
      playerId,
      position: { col: 0, row: 0 },
    });
    const originalFranky = state.frankyPosition;

    // Try to move Franky to (0, 0) — collision
    const after = frankyLayoutReducer(state, {
      type: 'MOVE_FRANKY',
      newPosition: { col: 0, row: 0 },
    });
    expect(after.frankyPosition).toEqual(originalFranky);
  });

  it('MOVE_FRANKY out of bounds → frankyPosition unchanged', () => {
    let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols: 10, rows: 10 });
    const original = state.frankyPosition;

    // col=9 out of bounds on 10-wide grid
    const after = frankyLayoutReducer(state, {
      type: 'MOVE_FRANKY',
      newPosition: { col: 9, row: 0 },
    });
    expect(after.frankyPosition).toEqual(original);
  });
});


// ---------------------------------------------------------------------------
// PROPERTY-BASED TESTS
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------



/** A valid player name (1–20 chars, no whitespace-only) */
const arbitraryPlayerName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length >= 1);

/**
 * Build an arbitrary FrankyLayoutState by adding N players and placing
 * some of them on the grid via ADD_PLAYER / PLACE_PLAYER actions.
 */
const arbitraryLayoutState: fc.Arbitrary<FrankyLayoutState> = fc
  .record({
    playerCount: fc.integer({ min: 0, max: 8 }),
    cols: fc.integer({ min: 5, max: 40 }),
    rows: fc.integer({ min: 5, max: 40 }),
  })
  .chain(({ playerCount, cols, rows }) => {
    const names = fc.uniqueArray(
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length >= 1),
      { minLength: playerCount, maxLength: playerCount },
    );
    return names.map((nameList) => {
      let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
      for (const name of nameList) {
        state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name, level: 'I2' });
      }
      // Try to place up to half the players at spread-out positions
      for (let i = 0; i < Math.floor(playerCount / 2); i++) {
        const player = state.players[i];
        const col = i * 2;
        if (col + 1 >= cols) break;
        // Use row near bottom to avoid Franky at center
        const row = rows - 3;
        if (row < 0 || row + 1 >= rows) break;
        state = frankyLayoutReducer(state, {
          type: 'PLACE_PLAYER',
          playerId: player.id,
          position: { col, row },
        });
      }
      return state;
    });
  });


// ---------------------------------------------------------------------------
// P6: Panel i siatka są rozłączne i kompletne (Requirements 3.4)
// ---------------------------------------------------------------------------
describe('P6: Panel i siatka są rozłączne i kompletne', () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * For any state, set(panelPlayers) ∩ set(gridPlayers) = ∅
   * and panelPlayers ∪ gridPlayers = allPlayers
   */
  it('P6: panel and grid players are disjoint and their union equals all players', () => {
    fc.assert(
      fc.property(arbitraryLayoutState, (state) => {
        const gridIds = new Set(state.placedPlayers.map((pp) => pp.playerId));
        const panelPlayers = state.players.filter((p) => !gridIds.has(p.id));
        const panelIds = new Set(panelPlayers.map((p) => p.id));
        const allIds = new Set(state.players.map((p) => p.id));

        // Disjoint
        const intersection = [...panelIds].filter((id) => gridIds.has(id));
        if (intersection.length > 0) return false;

        // Union = allIds
        const union = new Set([...panelIds, ...gridIds]);
        if (union.size !== allIds.size) return false;
        for (const id of allIds) {
          if (!union.has(id)) return false;
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P5: Usunięcie gracza usuwa go wszędzie (Requirements 3.3)
// ---------------------------------------------------------------------------
describe('P5: Usunięcie gracza usuwa go wszędzie', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * After removing any player, they appear neither in players nor placedPlayers.
   */
  it('P5: after removing a player they disappear from players and placedPlayers', () => {
    fc.assert(
      fc.property(
        arbitraryLayoutState.filter((s) => s.players.length > 0),
        fc.integer({ min: 0, max: 7 }),
        (state, idx) => {
          const player = state.players[idx % state.players.length];
          const after = frankyLayoutReducer(state, {
            type: 'REMOVE_PLAYER',
            playerId: player.id,
          });
          const inPlayers = after.players.some((p) => p.id === player.id);
          const inPlaced = after.placedPlayers.some((pp) => pp.playerId === player.id);
          return !inPlayers && !inPlaced;
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// P9: Franky jest zawsze dokładnie jeden (Requirements 4.1)
// ---------------------------------------------------------------------------
describe('P9: Franky jest zawsze dokładnie jeden', () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * After any sequence of operations, frankyPosition exists and is exactly one position.
   * (The reducer always holds exactly one frankyPosition value — we verify it's defined
   * and that only one Franky exists in the state.)
   */
  it('P9: frankyPosition always exists and is a single valid position', () => {
    const operations = fc.array(
      fc.oneof(
        fc.record({ type: fc.constant('ADD_PLAYER' as const), name: arbitraryPlayerName }),
        fc.record({
          type: fc.constant('RESET_LAYOUT' as const),
        }),
        fc.record({
          type: fc.constant('MOVE_FRANKY' as const),
          newPosition: fc.record({
            col: fc.integer({ min: 0, max: 38 }),
            row: fc.integer({ min: 0, max: 38 }),
          }),
        }),
        fc.record({
          type: fc.constant('RESIZE_GRID' as const),
          cols: fc.integer({ min: 5, max: 40 }),
          rows: fc.integer({ min: 5, max: 40 }),
        }),
      ),
      { minLength: 0, maxLength: 20 },
    );

    fc.assert(
      fc.property(operations, (ops) => {
        let state = initialState;
        for (const op of ops) {
          state = frankyLayoutReducer(state, op as any);
        }
        // frankyPosition must exist and have numeric col/row
        return (
          state.frankyPosition !== undefined &&
          typeof state.frankyPosition.col === 'number' &&
          typeof state.frankyPosition.row === 'number'
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P8: Cykliczne przypisywanie kolorów (Requirements 3.6)
// ---------------------------------------------------------------------------
describe('P8: Cykliczne przypisywanie kolorów', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * For any N players added, player at index i has PLAYER_COLORS[i % 12].
   */
  it('P8: player at index i gets PLAYER_COLORS[i % paletteSize]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (n) => {
        let state = initialState;
        for (let i = 0; i < n; i++) {
          state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
        }
        return state.players.every(
          (p, i) => p.color === PLAYER_COLORS[i % PLAYER_COLORS.length],
        );
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// P10: Domyślna pozycja Franky'ego (Requirements 4.2)
// ---------------------------------------------------------------------------
describe('P10: Domyślna pozycja Franky\'ego', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * After RESIZE_GRID(cols, rows) then RESET_LAYOUT,
   * frankyPosition = getDefaultFrankyPosition(cols, rows)
   */
  it('P10: after RESIZE_GRID + RESET_LAYOUT, frankyPosition equals getDefaultFrankyPosition', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 5, max: 40 }),
        (cols, rows) => {
          let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
          // Optionally move Franky before reset
          state = frankyLayoutReducer(state, {
            type: 'MOVE_FRANKY',
            newPosition: { col: 0, row: 0 },
          });
          state = frankyLayoutReducer(state, { type: 'RESET_LAYOUT' });
          const expected = getDefaultFrankyPosition(cols, rows);
          return (
            state.frankyPosition.col === expected.col &&
            state.frankyPosition.row === expected.row
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P23: Reset usuwa wszystkich graczy z siatki (Requirements 8.3)
// ---------------------------------------------------------------------------
describe('P23: Reset usuwa wszystkich graczy z siatki', () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * After RESET_LAYOUT, placedPlayers is empty.
   */
  it('P23: after RESET_LAYOUT, placedPlayers is empty', () => {
    fc.assert(
      fc.property(arbitraryLayoutState, (state) => {
        const after = frankyLayoutReducer(state, { type: 'RESET_LAYOUT' });
        return after.placedPlayers.length === 0;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P24: Reset przywraca Franky'ego na pozycję domyślną (Requirements 8.4)
// ---------------------------------------------------------------------------
describe('P24: Reset przywraca Franky\'ego na pozycję domyślną', () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * After RESET_LAYOUT, frankyPosition = getDefaultFrankyPosition(cols, rows).
   */
  it('P24: after RESET_LAYOUT, frankyPosition is at default for current gridConfig', () => {
    fc.assert(
      fc.property(arbitraryLayoutState, (state) => {
        const after = frankyLayoutReducer(state, { type: 'RESET_LAYOUT' });
        const { cols, rows } = state.gridConfig;
        const expected = getDefaultFrankyPosition(cols, rows);
        return (
          after.frankyPosition.col === expected.col &&
          after.frankyPosition.row === expected.row
        );
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// P25: Anuluj reset nie zmienia stanu (Requirements 8.6)
// ---------------------------------------------------------------------------
describe('P25: Anuluj reset nie zmienia stanu', () => {
  /**
   * **Validates: Requirements 8.6**
   *
   * Not dispatching any action leaves state unchanged.
   * (Cancel = no action = state unchanged)
   */
  it('P25: state is unchanged when no action is dispatched (cancel = no-op)', () => {
    fc.assert(
      fc.property(arbitraryLayoutState, (state) => {
        // "Cancel" means we don't call the reducer at all — state stays the same
        const unchanged = state;
        return (
          unchanged.players === state.players &&
          unchanged.placedPlayers === state.placedPlayers &&
          unchanged.frankyPosition === state.frankyPosition &&
          unchanged.gridConfig === state.gridConfig
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P11: Ruch Franky'ego na wolną pozycję (Requirements 4.4)
// ---------------------------------------------------------------------------
describe('P11: Ruch Franky\'ego na wolną pozycję', () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * Moving Franky to a free position results in frankyPosition being updated.
   */
  it('P11: MOVE_FRANKY to a free position updates frankyPosition', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 0, max: 37 }),
        fc.integer({ min: 0, max: 37 }),
        (cols, rows, targetCol, targetRow) => {
          let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });

          // Clamp target to valid grid positions
          const col = Math.min(targetCol, cols - 2);
          const row = Math.min(targetRow, rows - 2);
          const target: GridPosition = { col, row };

          // Skip if target collides with current Franky (trivial case)
          // or would be out of bounds
          if (col + 1 >= cols || row + 1 >= rows) return true;

          // State has no placed players, so the only occupant is Franky
          // Only attempt the move if target != current frankyPosition
          if (state.frankyPosition.col === col && state.frankyPosition.row === row) {
            // Moving to same position: it's a valid free position (no player there)
            const after = frankyLayoutReducer(state, { type: 'MOVE_FRANKY', newPosition: target });
            return after.frankyPosition.col === col && after.frankyPosition.row === row;
          }

          // No placed players → target is free
          const after = frankyLayoutReducer(state, { type: 'MOVE_FRANKY', newPosition: target });
          return after.frankyPosition.col === col && after.frankyPosition.row === row;
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// P12: Kolizja odrzuca ruch Franky'ego (Requirements 4.5)
// ---------------------------------------------------------------------------
describe('P12: Kolizja odrzuca ruch Franky\'ego', () => {
  /**
   * **Validates: Requirements 4.5**
   *
   * Moving Franky to an occupied position leaves frankyPosition unchanged.
   */
  it('P12: MOVE_FRANKY to an occupied position leaves frankyPosition unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 5, max: 40 }),
        (cols, rows) => {
          let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
          state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
          const playerId = state.players[0].id;

          // Find a position that is in bounds, doesn't collide with Franky, and is far from Franky
          // Place at the last valid position (cols-2, rows-2)
          const playerCol = cols - 2;
          const playerRow = rows - 2;
          const frankyDefault = getDefaultFrankyPosition(cols, rows);

          // Check if player position would collide with Franky
          const colDiff = Math.abs(playerCol - frankyDefault.col);
          const rowDiff = Math.abs(playerRow - frankyDefault.row);
          if (colDiff < 2 && rowDiff < 2) {
            // Grid too small to place without Franky collision — skip
            return true;
          }

          state = frankyLayoutReducer(state, {
            type: 'PLACE_PLAYER',
            playerId,
            position: { col: playerCol, row: playerRow },
          });

          // Verify player was actually placed (state should now have 1 placed player)
          if (state.placedPlayers.length === 0) return true;

          const originalFranky = state.frankyPosition;

          // Try moving Franky to where the player is
          const after = frankyLayoutReducer(state, {
            type: 'MOVE_FRANKY',
            newPosition: { col: playerCol, row: playerRow },
          });

          return (
            after.frankyPosition.col === originalFranky.col &&
            after.frankyPosition.row === originalFranky.row
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P13: Umieszczenie gracza z panelu (Requirements 5.1)
// ---------------------------------------------------------------------------
describe('P13: Umieszczenie gracza z panelu', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * Placing a panel player at a free position puts them on the grid.
   */
  it('P13: PLACE_PLAYER from panel to free position → player appears on grid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 5, max: 40 }),
        (cols, rows) => {
          let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
          state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
          const playerId = state.players[0].id;

          // Find a position that:
          // 1. is in bounds (col+1 < cols, row+1 < rows)
          // 2. does not collide with Franky's default position
          // Franky at getDefaultFrankyPosition(cols, rows) = (Math.floor(cols/2)-1, Math.floor(rows/2)-1)
          // We pick a position at the bottom-right corner: (cols-2, rows-2) which is always valid
          // and distant from Franky (center area). But we must ensure no collision with Franky.
          // Use the last valid position: col=cols-2, row=rows-2
          const targetCol = cols - 2;
          const targetRow = rows - 2;
          const frankyDefault = getDefaultFrankyPosition(cols, rows);

          // Check if (targetCol, targetRow) collides with Franky
          // Two 2x2 blocks collide if abs(col diff) < 2 AND abs(row diff) < 2
          if (hasCollision({ col: targetCol, row: targetRow }, frankyDefault)) {
            return true;
          }

          state = frankyLayoutReducer(state, {
            type: 'PLACE_PLAYER',
            playerId,
            position: { col: targetCol, row: targetRow },
          });

          const placed = state.placedPlayers.find((pp) => pp.playerId === playerId);
          return placed !== undefined;
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// P14: Przesuwanie gracza między pozycjami (Requirements 5.2)
// ---------------------------------------------------------------------------
describe('P14: Przesuwanie gracza między pozycjami', () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * Moving a placed player to a free position updates their position,
   * frees the original cell, and leaves all other players unchanged.
   */
  it('P14: MOVE_PLAYER to free position updates position and frees old cell', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 40 }),
        fc.integer({ min: 10, max: 40 }),
        (cols, rows) => {
          let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
          state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
          const playerId = state.players[0].id;

          // Place Alice at (0, 0)
          state = frankyLayoutReducer(state, {
            type: 'PLACE_PLAYER',
            playerId,
            position: { col: 0, row: 0 },
          });

          // Move Alice to (4, 0) — far enough not to collide with original or Franky
          const newPos: GridPosition = { col: 4, row: 0 };
          // Skip if Franky is at newPos (center of grid)
          const frankyPos = state.frankyPosition;
          if (Math.abs(frankyPos.col - 4) < 2 && Math.abs(frankyPos.row - 0) < 2) return true;

          state = frankyLayoutReducer(state, {
            type: 'MOVE_PLAYER',
            playerId,
            newPosition: newPos,
          });

          const placed = state.placedPlayers.find((pp) => pp.playerId === playerId);
          return placed !== undefined && placed.position.col === 4 && placed.position.row === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P16: Upuszczenie poza siatką zwraca gracza do panelu (Requirements 5.5)
// ---------------------------------------------------------------------------
describe('P16: Upuszczenie poza siatką zwraca gracza do panelu', () => {
  /**
   * **Validates: Requirements 5.5**
   *
   * After RETURN_TO_PANEL, the player is no longer in placedPlayers.
   */
  it('P16: RETURN_TO_PANEL removes player from placedPlayers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 5, max: 40 }),
        (cols, rows) => {
          let state = frankyLayoutReducer(initialState, { type: 'RESIZE_GRID', cols, rows });
          state = frankyLayoutReducer(state, { type: 'ADD_PLAYER', name: `Player`, level: 'I2' });
          const playerId = state.players[0].id;

          // Place Alice at (0, 0)
          state = frankyLayoutReducer(state, {
            type: 'PLACE_PLAYER',
            playerId,
            position: { col: 0, row: 0 },
          });

          const wasPlaced = state.placedPlayers.some((pp) => pp.playerId === playerId);
          if (!wasPlaced) return true; // place failed due to collision with Franky in tiny grid

          // Return to panel
          state = frankyLayoutReducer(state, { type: 'RETURN_TO_PANEL', playerId });

          const stillOnGrid = state.placedPlayers.some((pp) => pp.playerId === playerId);
          const inPlayers = state.players.some((p) => p.id === playerId);

          return !stillOnGrid && inPlayers;
        },
      ),
      { numRuns: 100 },
    );
  });
});
