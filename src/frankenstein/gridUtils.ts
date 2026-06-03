import type { GridPosition } from './types';

/** Block size for players (3×3) */
export const PLAYER_BLOCK_SIZE = 3;
/** Block size for Franky (4×4) */
export const FRANKY_BLOCK_SIZE = 4;

/**
 * Zwraca komórki zajmowane przez blok o podanym rozmiarze startujący od (col, row).
 */
export function getBlockCells(pos: GridPosition, size: number): GridPosition[] {
  const cells: GridPosition[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push({ col: pos.col + c, row: pos.row + r });
    }
  }
  return cells;
}

/**
 * Zwraca 4 komórki zajmowane przez blok 2×2 startujący od (col, row).
 * (Zachowane dla kompatybilności)
 */
export function getCells(pos: GridPosition): GridPosition[] {
  return getBlockCells(pos, PLAYER_BLOCK_SIZE);
}

/**
 * Sprawdza czy dwa bloki się nakładają (mają wspólną komórkę).
 */
export function hasCollisionSized(a: GridPosition, aSize: number, b: GridPosition, bSize: number): boolean {
  // AABB overlap check — faster than enumerating cells
  return (
    a.col < b.col + bSize &&
    a.col + aSize > b.col &&
    a.row < b.row + bSize &&
    a.row + aSize > b.row
  );
}

/**
 * Sprawdza czy dwa bloki 2×2 na pozycjach a i b nakładają się.
 */
export function hasCollision(a: GridPosition, b: GridPosition): boolean {
  return hasCollisionSized(a, PLAYER_BLOCK_SIZE, b, PLAYER_BLOCK_SIZE);
}

/**
 * Sprawdza czy blok 2×2 koliduje z Franky (4×4).
 */
export function hasCollisionWithFranky(playerPos: GridPosition, frankyPos: GridPosition): boolean {
  return hasCollisionSized(playerPos, PLAYER_BLOCK_SIZE, frankyPos, FRANKY_BLOCK_SIZE);
}

/**
 * Sprawdza czy blok o danym rozmiarze wykracza poza siatkę.
 */
export function isOutOfBoundsSized(pos: GridPosition, size: number, cols: number, rows: number): boolean {
  return (
    pos.col < 0 ||
    pos.row < 0 ||
    pos.col + size > cols ||
    pos.row + size > rows
  );
}

/**
 * Sprawdza czy blok 2×2 startujący od pos wykracza poza siatkę o wymiarach cols×rows.
 */
export function isOutOfBounds(pos: GridPosition, cols: number, rows: number): boolean {
  return isOutOfBoundsSized(pos, PLAYER_BLOCK_SIZE, cols, rows);
}

/**
 * Sprawdza czy Franky (4×4) wykracza poza siatkę.
 */
export function isFrankyOutOfBounds(pos: GridPosition, cols: number, rows: number): boolean {
  return isOutOfBoundsSized(pos, FRANKY_BLOCK_SIZE, cols, rows);
}

/**
 * Oblicza domyślną pozycję Franky'ego (4×4) dla siatki o wymiarach cols×rows.
 * Blok 4×4 jest centralnie zlokalizowany.
 */
export function getDefaultFrankyPosition(cols: number, rows: number): GridPosition {
  return {
    col: Math.floor(cols / 2) - 2,
    row: Math.floor(rows / 2) - 2,
  };
}
