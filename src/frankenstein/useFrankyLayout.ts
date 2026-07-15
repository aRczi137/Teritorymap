import { useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  Player,
  PlacedPlayer,
  GridPosition,
  GridConfig,
  SaveStatus,
  FirestoreLayoutDoc,
  PlayerLevel,
} from './types';
import { LEVEL_COLORS } from './types';
import { hasCollision, hasCollisionWithFranky, isOutOfBounds, isFrankyOutOfBounds, getDefaultFrankyPosition, FRANKY_BLOCK_SIZE } from './gridUtils';
import { db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface FrankyLayoutState {
  players: Player[];
  placedPlayers: PlacedPlayer[];
  frankyPosition: GridPosition;
  gridConfig: GridConfig;
  saveStatus: SaveStatus;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'ADD_PLAYER'; name: string; level: PlayerLevel }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'UPDATE_PLAYER'; playerId: string; name: string; level: PlayerLevel }
  | { type: 'PLACE_PLAYER'; playerId: string; position: GridPosition }
  | { type: 'MOVE_PLAYER'; playerId: string; newPosition: GridPosition }
  | { type: 'RETURN_TO_PANEL'; playerId: string }
  | { type: 'MOVE_FRANKY'; newPosition: GridPosition }
  | { type: 'RESIZE_GRID'; cols: number; rows: number }
  | { type: 'RESET_LAYOUT' }
  | { type: 'LOAD_LAYOUT'; layout: Omit<FirestoreLayoutDoc, 'updatedAt'> }
  | { type: 'SET_SAVE_STATUS'; status: SaveStatus };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const DEFAULT_COLS = 1000;
const DEFAULT_ROWS = 1000;

const initialState: FrankyLayoutState = {
  players: [],
  placedPlayers: [],
  frankyPosition: getDefaultFrankyPosition(DEFAULT_COLS, DEFAULT_ROWS),
  gridConfig: { cols: DEFAULT_COLS, rows: DEFAULT_ROWS },
  saveStatus: 'idle',
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function frankyLayoutReducer(
  state: FrankyLayoutState,
  action: Action
): FrankyLayoutState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: action.name,
        level: action.level,
        color: LEVEL_COLORS[action.level],
      };

      // Auto-place: find first free spot near Franky (spiral outward)
      const { cols, rows } = state.gridConfig;
      const frankyCenter = {
        col: state.frankyPosition.col + Math.floor(FRANKY_BLOCK_SIZE / 2),
        row: state.frankyPosition.row + Math.floor(FRANKY_BLOCK_SIZE / 2),
      };

      let placedPosition: GridPosition | null = null;
      const PLAYER_SIZE = 3; // PLAYER_BLOCK_SIZE

      // Spiral search around Franky center
      for (let radius = 3; radius < 50 && !placedPosition; radius++) {
        for (let dr = -radius; dr <= radius && !placedPosition; dr++) {
          for (let dc = -radius; dc <= radius && !placedPosition; dc++) {
            if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue; // only border of square
            const candidate: GridPosition = {
              col: frankyCenter.col + dc - Math.floor(PLAYER_SIZE / 2),
              row: frankyCenter.row + dr - Math.floor(PLAYER_SIZE / 2),
            };
            // Check bounds
            if (candidate.col < 0 || candidate.row < 0 ||
                candidate.col + PLAYER_SIZE > cols || candidate.row + PLAYER_SIZE > rows) continue;
            // Check collision with Franky (4×4)
            if (hasCollisionWithFranky(candidate, state.frankyPosition)) continue;
            // Check collision with other players
            let collides = false;
            for (const pp of state.placedPlayers) {
              if (hasCollision(candidate, pp.position)) { collides = true; break; }
            }
            if (!collides) {
              placedPosition = candidate;
            }
          }
        }
      }

      const newPlacedPlayers = placedPosition
        ? [...state.placedPlayers, { playerId: newPlayer.id, position: placedPosition }]
        : state.placedPlayers;

      return {
        ...state,
        players: [...state.players, newPlayer],
        placedPlayers: newPlacedPlayers,
      };
    }

    case 'REMOVE_PLAYER': {
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
        placedPlayers: state.placedPlayers.filter(
          (pp) => pp.playerId !== action.playerId
        ),
      };
    }

    case 'UPDATE_PLAYER': {
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId
            ? { ...p, name: action.name, level: action.level, color: LEVEL_COLORS[action.level] }
            : p
        ),
      };
    }

    case 'PLACE_PLAYER': {
      const { playerId, position } = action;
      const { cols, rows } = state.gridConfig;

      // Validate: out of bounds
      if (isOutOfBounds(position, cols, rows)) {
        return state;
      }

      // Validate: collision with Franky (player 2×2 vs Franky 4×4)
      if (hasCollisionWithFranky(position, state.frankyPosition)) {
        return state;
      }

      // Validate: collision with other placed players (excluding the same player if already placed)
      const otherPlaced = state.placedPlayers.filter(
        (pp) => pp.playerId !== playerId
      );
      const collidesWithPlayer = otherPlaced.some((pp) =>
        hasCollision(position, pp.position)
      );
      if (collidesWithPlayer) {
        return state;
      }

      // Remove previous placement (if any) and add new one
      const updatedPlacedPlayers = [
        ...state.placedPlayers.filter((pp) => pp.playerId !== playerId),
        { playerId, position },
      ];

      return { ...state, placedPlayers: updatedPlacedPlayers };
    }

    case 'MOVE_PLAYER': {
      const { playerId, newPosition } = action;
      const { cols, rows } = state.gridConfig;

      // Validate: out of bounds
      if (isOutOfBounds(newPosition, cols, rows)) {
        return state;
      }

      // Validate: collision with Franky (player 2×2 vs Franky 4×4)
      if (hasCollisionWithFranky(newPosition, state.frankyPosition)) {
        return state;
      }

      // Validate: collision with other placed players (current position freed first)
      const otherPlaced = state.placedPlayers.filter(
        (pp) => pp.playerId !== playerId
      );
      const collidesWithPlayer = otherPlaced.some((pp) =>
        hasCollision(newPosition, pp.position)
      );
      if (collidesWithPlayer) {
        return state;
      }

      const updatedPlacedPlayers = [
        ...otherPlaced,
        { playerId, position: newPosition },
      ];

      return { ...state, placedPlayers: updatedPlacedPlayers };
    }

    case 'RETURN_TO_PANEL': {
      return {
        ...state,
        placedPlayers: state.placedPlayers.filter(
          (pp) => pp.playerId !== action.playerId
        ),
      };
    }

    case 'MOVE_FRANKY': {
      const { newPosition } = action;
      const { cols, rows } = state.gridConfig;

      // Validate: out of bounds (Franky is 4×4)
      if (isFrankyOutOfBounds(newPosition, cols, rows)) {
        return state;
      }

      // Validate: collision with any placed player (Franky 4×4 vs player 2×2)
      const collidesWithPlayer = state.placedPlayers.some((pp) =>
        hasCollisionWithFranky(pp.position, newPosition)
      );
      if (collidesWithPlayer) {
        return state;
      }

      return { ...state, frankyPosition: newPosition };
    }

    case 'RESIZE_GRID': {
      const { cols, rows } = action;

      // Return players that are now out of bounds to panel
      const stillValid = state.placedPlayers.filter(
        (pp) => !isOutOfBounds(pp.position, cols, rows)
      );

      // Recompute Franky position — keep current if still in bounds, otherwise reset
      const frankyPosition = isFrankyOutOfBounds(state.frankyPosition, cols, rows)
        ? getDefaultFrankyPosition(cols, rows)
        : state.frankyPosition;

      return {
        ...state,
        gridConfig: { cols, rows },
        placedPlayers: stillValid,
        frankyPosition,
      };
    }

    case 'RESET_LAYOUT': {
      const { cols, rows } = state.gridConfig;
      return {
        ...state,
        placedPlayers: [],
        frankyPosition: getDefaultFrankyPosition(cols, rows),
      };
    }

    case 'LOAD_LAYOUT': {
      const { layout } = action;
      return {
        ...state,
        players: layout.players,
        placedPlayers: layout.placedPlayers,
        frankyPosition: layout.frankyPosition,
        // Always enforce the default grid size (100×100)
        gridConfig: { cols: DEFAULT_COLS, rows: DEFAULT_ROWS },
        saveStatus: 'idle',
      };
    }

    case 'SET_SAVE_STATUS': {
      return { ...state, saveStatus: action.status };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Public actions interface
// ---------------------------------------------------------------------------

export interface FrankyLayoutActions {
  addPlayer: (name: string, level: PlayerLevel) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, name: string, level: PlayerLevel) => void;
  placePlayer: (playerId: string, position: GridPosition) => void;
  movePlayer: (playerId: string, newPosition: GridPosition) => void;
  returnPlayerToPanel: (playerId: string) => void;
  moveFranky: (newPosition: GridPosition) => void;
  resizeGrid: (cols: number, rows: number) => void;
  resetLayout: () => void;
  loadLayout: (data: { players: Player[]; placedPlayers: PlacedPlayer[]; frankyPosition: GridPosition; gridConfig: GridConfig }) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFrankyLayout(userId: string): FrankyLayoutState & FrankyLayoutActions {
  const [state, dispatch] = useReducer(frankyLayoutReducer, initialState);

  const isInitializedRef = useRef(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // onSnapshot subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const layoutDocRef = doc(db, 'users', userId, 'hive_layout', 'main');

    const unsubscribe = onSnapshot(
      layoutDocRef,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        if (!snapshot.exists()) {
          isInitializedRef.current = true;
          return;
        }

        isInitializedRef.current = true;

        const data = snapshot.data() as FirestoreLayoutDoc;

        dispatch({
          type: 'LOAD_LAYOUT',
          layout: {
            gridConfig: data.gridConfig,
            players: data.players,
            placedPlayers: data.placedPlayers,
            frankyPosition: data.frankyPosition,
          },
        });
      },
      (_error) => {
        dispatch({ type: 'SET_SAVE_STATUS', status: 'error' });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // ---------------------------------------------------------------------------
  // Debounced save
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isInitializedRef.current) {
      return;
    }

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;

      dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });

      try {
        const layoutDocRef = doc(db, 'users', userId, 'hive_layout', 'main');

        const payload: FirestoreLayoutDoc = {
          gridConfig: state.gridConfig,
          players: state.players,
          placedPlayers: state.placedPlayers,
          frankyPosition: state.frankyPosition,
          updatedAt: serverTimestamp(),
        };

        await setDoc(layoutDocRef, payload);

        dispatch({ type: 'SET_SAVE_STATUS', status: 'saved' });
        setTimeout(() => {
          dispatch({ type: 'SET_SAVE_STATUS', status: 'idle' });
        }, 3000);
      } catch (_err) {
        dispatch({ type: 'SET_SAVE_STATUS', status: 'error' });
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    userId,
    state.players,
    state.placedPlayers,
    state.frankyPosition,
    state.gridConfig,
  ]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const addPlayer = useCallback((name: string, level: PlayerLevel) => {
    dispatch({ type: 'ADD_PLAYER', name, level });
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    dispatch({ type: 'REMOVE_PLAYER', playerId });
  }, []);

  const updatePlayer = useCallback((playerId: string, name: string, level: PlayerLevel) => {
    dispatch({ type: 'UPDATE_PLAYER', playerId, name, level });
  }, []);

  const placePlayer = useCallback((playerId: string, position: GridPosition) => {
    dispatch({ type: 'PLACE_PLAYER', playerId, position });
  }, []);

  const movePlayer = useCallback((playerId: string, newPosition: GridPosition) => {
    dispatch({ type: 'MOVE_PLAYER', playerId, newPosition });
  }, []);

  const returnPlayerToPanel = useCallback((playerId: string) => {
    dispatch({ type: 'RETURN_TO_PANEL', playerId });
  }, []);

  const moveFranky = useCallback((newPosition: GridPosition) => {
    dispatch({ type: 'MOVE_FRANKY', newPosition });
  }, []);

  const resizeGrid = useCallback((cols: number, rows: number) => {
    dispatch({ type: 'RESIZE_GRID', cols, rows });
  }, []);

  const resetLayout = useCallback(() => {
    dispatch({ type: 'RESET_LAYOUT' });
  }, []);

  const loadLayout = useCallback((data: { players: Player[]; placedPlayers: PlacedPlayer[]; frankyPosition: GridPosition; gridConfig: GridConfig }) => {
    dispatch({
      type: 'LOAD_LAYOUT',
      layout: {
        players: data.players,
        placedPlayers: data.placedPlayers,
        frankyPosition: data.frankyPosition,
        gridConfig: data.gridConfig,
      },
    });
  }, []);

  return {
    ...state,
    addPlayer,
    removePlayer,
    updatePlayer,
    placePlayer,
    movePlayer,
    returnPlayerToPanel,
    moveFranky,
    resizeGrid,
    resetLayout,
    loadLayout,
  };
}

// ---------------------------------------------------------------------------
// Exported reducer and initialState for use in tests and Firestore integration
// ---------------------------------------------------------------------------
export { frankyLayoutReducer, initialState };
