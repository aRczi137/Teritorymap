import type { Player } from './types';

/**
 * Validates a player name against the existing player list.
 *
 * Rules:
 * - Name is trimmed before validation
 * - Empty name (length 0 after trim) → error
 * - Name longer than 20 characters (after trim) → error
 * - Duplicate name (case-insensitive) → "Gracz o tej nazwie już istnieje"
 *
 * @returns Error message string, or null if valid
 */
export function validatePlayerName(
  name: string,
  existingPlayers: Player[]
): string | null {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return 'Nazwa gracza nie może być pusta';
  }

  if (trimmed.length > 20) {
    return 'Nazwa gracza nie może przekraczać 20 znaków';
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const duplicate = existingPlayers.some(
    (player) => player.name.toLowerCase() === lowerTrimmed
  );

  if (duplicate) {
    return 'Gracz o tej nazwie już istnieje';
  }

  return null;
}

/**
 * Validates grid dimensions.
 *
 * Rules:
 * - Both cols and rows must be in the range 5–40 (inclusive)
 *
 * @returns Error message string, or null if valid
 */
export function validateGridDimensions(
  cols: number,
  rows: number
): string | null {
  if (cols < 5 || cols > 40) {
    return `Liczba kolumn musi być w zakresie 5–40 (podano: ${cols})`;
  }

  if (rows < 5 || rows > 40) {
    return `Liczba wierszy musi być w zakresie 5–40 (podano: ${rows})`;
  }

  return null;
}
