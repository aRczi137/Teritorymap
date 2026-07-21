/**
 * Frankenstein Event — shared types and constants
 */

/** Pozycja lewego górnego rogu bloku 2×2 na siatce (0-based) */
export interface GridPosition {
  col: number; // 0-based column index
  row: number; // 0-based row index
}

export interface GridConfig {
  cols: number; // 5–40
  rows: number; // 5–40
}

/** Poziomy graczy (I2–I10) */
export type PlayerLevel = 'I2' | 'I3' |'I4' |'I5' |'I6' | 'I7' | 'I8' |'I9' | 'I10';

export const PLAYER_LEVELS: readonly PlayerLevel[] = ['I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10'];

/** Kolor bloku gracza zależny od poziomu */
export const LEVEL_COLORS: Record<PlayerLevel, string> = {
  I2: '#64748b',  // slate — najniższy
  I3: '#64748b',  // slate — najniższy
  I4: '#22c55e',  // green
  I5: '#22c55e',  // green
  I6: '#3b82f6',  // blue
  I7: '#3b82f6',  // blue
  I8: '#a855f7',  // purple
  I9: '#a855f7',
  I10: '#ef4444', // red — najwyższy
};

export interface Player {
  id: string;       // UUID generowany przy dodaniu
  name: string;     // 1–20 znaków
  level: PlayerLevel; // poziom gracza
  color: string;    // CSS color z LEVEL_COLORS (oparty na lvl)
  iconUrl?: string; // opcjonalny URL awatara
}

export interface PlacedPlayer {
  playerId: string;
  position: GridPosition;
}

export type DragSourceType = 'panel' | 'grid' | 'franky';

export interface DragSource {
  type: DragSourceType;
  playerId?: string;       // undefined dla franky
  fromPosition?: GridPosition;
}

export type DragState = {
  source: DragSource;
  hoverPosition: GridPosition | null;
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface FirestoreLayoutDoc {
  gridConfig: { cols: number; rows: number };
  players: Array<{ id: string; name: string; level: PlayerLevel; color: string; iconUrl?: string }>;
  placedPlayers: Array<{ playerId: string; position: { col: number; row: number } }>;
  frankyPosition: { col: number; row: number };
  updatedAt: any; // Firestore Timestamp / serverTimestamp()
}

/** Predefiniowana paleta 12 kolorów przypisywanych cyklicznie */
export interface GhostSlot {
  position: GridPosition;
  level: PlayerLevel;
}

export interface HiveTemplate {
  id?: string;
  name: string;
  gridConfig: GridConfig;
  players: Player[];
  placedPlayers: PlacedPlayer[];
  frankyPosition: GridPosition;
  updatedAt?: any;
}

export const PLAYER_COLORS: readonly string[] = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#a855f7', // purple-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#64748b', // slate-500
] as const;
