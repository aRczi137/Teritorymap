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
  placePlayer: (playerId: string, position: GridPosition) => void;
  movePlayer: (playerId: string, newPosition: GridPosition) => void;
  returnPlayerToPanel: (playerId: string) => void;
  moveFranky: (newPosition: GridPosition) => void;
  resizeGrid: (cols: number, rows: number) => void;
  resetLayout: () => void;
  loadLayout: (data: { players: Player[]; placedPlayers: PlacedPlayer[]; frankyPosition: GridPosition; gridConfig: GridConfig }) => void;
}

// ---------------------------------------------------------------------------
// Firestore document reference
// ---------------------------------------------------------------------------

const LAYOUT_DOC_PATH = { collection: 'frankenstein_layouts', id: 'main' } as const;
const LOCAL_STORAGE_KEY = 'frankenstein_layout_v1';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFrankyLayout(): FrankyLayoutState & FrankyLayoutActions {
  // Try to load initial state from localStorage
  const savedInitial = (() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.players && data.frankyPosition) {
        return {
          ...initialState,
          players: data.players,
          placedPlayers: data.placedPlayers || [],
          frankyPosition: data.frankyPosition,
          gridConfig: { cols: DEFAULT_COLS, rows: DEFAULT_ROWS },
        } as FrankyLayoutState;
      }
    } catch { /* ignore */ }
    return null;
  })();

  const [state, dispatch] = useReducer(frankyLayoutReducer, savedInitial || initialState);

  // Ref to track whether the initial snapshot has been processed.
  // Used to distinguish "first load" from "subsequent remote updates".
  const isFirstSnapshotRef = useRef(true);

  // Debounce timer ref for Firestore save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to track whether the current state change was triggered by an
  // onSnapshot remote update (to avoid saving back what we just received).
  const skipNextSaveRef = useRef(false);

  // ---------------------------------------------------------------------------
  // onSnapshot subscription — mount / unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const layoutDocRef = doc(db, LAYOUT_DOC_PATH.collection, LAYOUT_DOC_PATH.id);

    const unsubscribe = onSnapshot(
      layoutDocRef,
      (snapshot) => {
        // Skip updates that originate from local writes (pending writes).
        // metadata.hasPendingWrites === true  → local (optimistic) write, ignore.
        // metadata.hasPendingWrites === false → confirmed server value, apply.
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        if (!snapshot.exists()) {
          // Req 7.4 — no document in Firestore → show empty grid with default Franky
          if (isFirstSnapshotRef.current) {
            isFirstSnapshotRef.current = false;
            // Already at initial state, nothing to do.
          }
          return;
        }

        isFirstSnapshotRef.current = false;

        const data = snapshot.data() as FirestoreLayoutDoc;

        // Req 7.5 — apply remote layout update; tell save debounce to skip this cycle
        skipNextSaveRef.current = true;
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
        // Req 7.7 — read error → SET_SAVE_STATUS 'error', show empty grid with default Franky
        dispatch({ type: 'SET_SAVE_STATUS', status: 'error' });
      }
    );

    return () => {
      unsubscribe();
    };
  }, []); // run only on mount

  // ---------------------------------------------------------------------------
  // Debounced save — triggered whenever layout-relevant state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Skip the very first render (state === initialState) and skip saves
    // that were triggered by a remote onSnapshot to avoid write-loops.
    if (isFirstSnapshotRef.current) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    // Clear any pending save timer (debounce reset — Req 7.1)
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }

    // Schedule save after 1000 ms of inactivity
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;

      // Req 7.1 / design: dispatch 'saving' before the setDoc call
      dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });

      try {
        const layoutDocRef = doc(db, LAYOUT_DOC_PATH.collection, LAYOUT_DOC_PATH.id);

        const payload: FirestoreLayoutDoc = {
          gridConfig: state.gridConfig,
          players: state.players,
          placedPlayers: state.placedPlayers,
          frankyPosition: state.frankyPosition,
          updatedAt: serverTimestamp(),
        };

        await setDoc(layoutDocRef, payload);

        // Req 7.2 — successful save → 'saved', then after 3 s → 'idle'
        dispatch({ type: 'SET_SAVE_STATUS', status: 'saved' });
        setTimeout(() => {
          dispatch({ type: 'SET_SAVE_STATUS', status: 'idle' });
        }, 3000);
      } catch (_err) {
        // Req 7.6 — write error → 'error', layout unchanged
        dispatch({ type: 'SET_SAVE_STATUS', status: 'error' });
      }
    }, 1000);

    // Cleanup: cancel pending save if the component unmounts mid-debounce
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    state.players,
    state.placedPlayers,
    state.frankyPosition,
    state.gridConfig,
  ]);

  // ---------------------------------------------------------------------------
  // localStorage auto-save — save on every relevant state change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const data = {
        players: state.players,
        placedPlayers: state.placedPlayers,
        frankyPosition: state.frankyPosition,
        gridConfig: state.gridConfig,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota exceeded or private mode — ignore */ }
  }, [state.players, state.placedPlayers, state.frankyPosition, state.gridConfig]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const addPlayer = useCallback((name: string, level: PlayerLevel) => {
    dispatch({ type: 'ADD_PLAYER', name, level });
  }, []);

  const removePlayer = useCallback((playerId: string) => {
    dispatch({ type: 'REMOVE_PLAYER', playerId });
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
