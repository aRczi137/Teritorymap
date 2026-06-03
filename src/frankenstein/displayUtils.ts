/**
 * Display utility functions for the Frankenstein Event feature.
 */

/**
 * Truncates a player name to 10 characters, appending "…" if longer.
 * Names of 10 characters or fewer are returned as-is.
 */
export function truncateName(name: string): string {
  if (name.length <= 10) {
    return name;
  }
  return name.substring(0, 10) + '…';
}

/**
 * Derives initials from a player name.
 * - Multi-word names: first letter of each word (e.g. "Jan Kowalski" → "JK").
 * - Single-word names: first two characters (e.g. "Dragon" → "Dr").
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w.charAt(0)).join('');
  }
  return name.substring(0, 2);
}

/**
 * Returns a contrasting text color ('#ffffff' or '#000000') for a given
 * hex background color, using the perceived luminance algorithm.
 *
 * Luminance formula: (0.299R + 0.587G + 0.114B) / 255
 * Returns '#000000' for light backgrounds, '#ffffff' for dark backgrounds.
 */
export function getContrastColor(hexColor: string): '#ffffff' | '#000000' {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
