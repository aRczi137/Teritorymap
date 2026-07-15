import React, { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import type {
  Player,
  PlacedPlayer,
  GridPosition,
  DragSource,
  DragState,
} from './types';
import { hasCollision, hasCollisionWithFranky, isOutOfBounds, PLAYER_BLOCK_SIZE, FRANKY_BLOCK_SIZE } from './gridUtils';
import PlayerBlock from './PlayerBlock';
import FrankyBlock from './FrankyBlock';

interface GridCanvasProps {
  cols: number;
  rows: number;
  placedPlayers: PlacedPlayer[];
  players: Player[];
  frankyPosition: GridPosition;
  dragState: DragState | null;
  onDrop: (position: GridPosition, source: DragSource) => void;
  onDragOver: (position: GridPosition | null) => void;
  exportRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  /** Called in real-time as Franky is dragged across cells */
  onFrankyMove: (newPosition: GridPosition) => void;
  /** Called in real-time as a player block is dragged across cells */
  onPlayerMove: (playerId: string, newPosition: GridPosition) => void;
}

/** Base cell size in pixels at zoom=1 */
const CELL_SIZE = 40;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;

// Grid line color
const GRID_LINE_COLOR = '#2a2a3a';
const GRID_BG_COLOR = '#111118';

function computeDropPosition(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  zoom: number,
  pan: { x: number; y: number },
  cols: number,
  rows: number,
): GridPosition | null {
  const x = (clientX - viewportRect.left - pan.x) / zoom;
  const y = (clientY - viewportRect.top - pan.y) / zoom;
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  const pos: GridPosition = { col, row };
  if (isOutOfBounds(pos, cols, rows)) return null;
  return pos;
}

function computeHighlight(
  hoverPos: GridPosition,
  placedPlayers: PlacedPlayer[],
  frankyPosition: GridPosition,
  dragState: DragState | null,
): 'green' | 'red' {
  const isDraggingFranky = dragState?.source.type === 'franky';

  // Check collision with Franky (unless Franky itself is being dragged)
  if (!isDraggingFranky) {
    if (hasCollisionWithFranky(hoverPos, frankyPosition)) return 'red';
  }

  // Check collision with each placed player (excluding the one being dragged)
  const draggingPlayerId = dragState?.source.playerId;
  const draggingFromGrid =
    dragState?.source.type === 'grid' ? dragState.source.fromPosition : undefined;

  for (const pp of placedPlayers) {
    if (
      pp.playerId === draggingPlayerId &&
      draggingFromGrid &&
      pp.position.col === draggingFromGrid.col &&
      pp.position.row === draggingFromGrid.row
    ) continue;
    if (hasCollision(hoverPos, pp.position)) return 'red';
  }
  return 'green';
}

const GridCanvas: React.FC<GridCanvasProps> = ({
  cols,
  rows,
  placedPlayers,
  players,
  frankyPosition,
  dragState,
  onDrop,
  onDragOver,
  exportRef,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onFrankyMove,
  onPlayerMove,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Forward exportRef to the overlay div (contains blocks for export)
  const setOverlayRef = useCallback(
    (node: HTMLDivElement | null) => {
      overlayRef.current = node;
      if (exportRef) {
        (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [exportRef],
  );

  // ── Draw grid on canvas ────────────────────────────────────────────────────
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = viewport.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Resize canvas if needed
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = GRID_BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Apply pan and zoom
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const gridW = cols * CELL_SIZE;
    const gridH = rows * CELL_SIZE;

    // Only draw lines that are visible in the viewport
    const visibleLeft = -pan.x / zoom;
    const visibleTop = -pan.y / zoom;
    const visibleRight = visibleLeft + w / zoom;
    const visibleBottom = visibleTop + h / zoom;

    const startCol = Math.max(0, Math.floor(visibleLeft / CELL_SIZE));
    const endCol = Math.min(cols, Math.ceil(visibleRight / CELL_SIZE));
    const startRow = Math.max(0, Math.floor(visibleTop / CELL_SIZE));
    const endRow = Math.min(rows, Math.ceil(visibleBottom / CELL_SIZE));

    // Draw highlight cells (if dragging)
    const hoverPos = dragState?.hoverPosition ?? null;
    if (hoverPos) {
      const isDraggingFranky = dragState?.source.type === 'franky';
      const draggedSize = isDraggingFranky ? FRANKY_BLOCK_SIZE : PLAYER_BLOCK_SIZE;
      const hColor = computeHighlight(hoverPos, placedPlayers, frankyPosition, dragState);
      ctx.fillStyle = hColor === 'green' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';
      const hx = hoverPos.col * CELL_SIZE;
      const hy = hoverPos.row * CELL_SIZE;
      ctx.fillRect(hx, hy, CELL_SIZE * draggedSize, CELL_SIZE * draggedSize);
    }

    // Draw grid lines
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1 / zoom; // Keep lines 1px regardless of zoom

    ctx.beginPath();

    // Vertical lines
    for (let c = startCol; c <= endCol; c++) {
      const x = c * CELL_SIZE;
      ctx.moveTo(x, Math.max(0, startRow * CELL_SIZE));
      ctx.lineTo(x, Math.min(gridH, endRow * CELL_SIZE));
    }

    // Horizontal lines
    for (let r = startRow; r <= endRow; r++) {
      const y = r * CELL_SIZE;
      ctx.moveTo(Math.max(0, startCol * CELL_SIZE), y);
      ctx.lineTo(Math.min(gridW, endCol * CELL_SIZE), y);
    }

    ctx.stroke();
    ctx.restore();
  }, [cols, rows, zoom, pan, dragState, placedPlayers, frankyPosition]);

  // Redraw on any relevant change
  useLayoutEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Also redraw on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => drawGrid());
    const el = viewportRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [drawGrid]);

  // ── Pan via left-mouse drag ────────────────────────────────────────────────
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  // ── Franky drag (mouse-based, snaps to grid) ──────────────────────────────
  const frankyDragging = useRef(false);
  // ── Player drag (mouse-based, snaps to grid) ──────────────────────────────
  const playerDragging = useRef<string | null>(null); // playerId being dragged

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;

      // Check if click is on Franky block
      const frankyEl = target.closest('[data-franky-block]');
      if (frankyEl) {
        e.preventDefault();
        e.stopPropagation();
        frankyDragging.current = true;
        return;
      }

      // Check if click is on a player block
      const playerEl = target.closest('[data-playerblock]') as HTMLElement | null;
      if (playerEl) {
        const playerId = playerEl.getAttribute('data-playerblock');
        if (playerId) {
          e.preventDefault();
          e.stopPropagation();
          playerDragging.current = playerId;
          return;
        }
      }

      // Otherwise start panning
      e.preventDefault();
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    },
    [pan],
  );

  // Helper: convert client coords to grid cell
  const clientToGrid = useCallback((clientX: number, clientY: number): GridPosition | null => {
    const vp = viewportRef.current;
    if (!vp) return null;
    const rect = vp.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    return { col, row };
  }, [pan, zoom]);

  // Track last known positions to avoid redundant updates
  const lastFrankyPos = useRef(frankyPosition);
  lastFrankyPos.current = frankyPosition;

  const lastPlayerPositions = useRef(placedPlayers);
  lastPlayerPositions.current = placedPlayers;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Franky drag — snap to grid cells in real-time
      if (frankyDragging.current) {
        const pos = clientToGrid(e.clientX, e.clientY);
        if (!pos) return;
        const snapped: GridPosition = {
          col: pos.col - Math.floor(FRANKY_BLOCK_SIZE / 2),
          row: pos.row - Math.floor(FRANKY_BLOCK_SIZE / 2),
        };
        const cur = lastFrankyPos.current;
        if (snapped.col !== cur.col || snapped.row !== cur.row) {
          onFrankyMove(snapped);
        }
        return;
      }

      // Player drag — snap to grid cells in real-time
      if (playerDragging.current) {
        const pos = clientToGrid(e.clientX, e.clientY);
        if (!pos) return;
        const snapped: GridPosition = {
          col: pos.col - Math.floor(PLAYER_BLOCK_SIZE / 2),
          row: pos.row - Math.floor(PLAYER_BLOCK_SIZE / 2),
        };
        const pp = lastPlayerPositions.current.find(p => p.playerId === playerDragging.current);
        if (!pp || snapped.col !== pp.position.col || snapped.row !== pp.position.row) {
          onPlayerMove(playerDragging.current, snapped);
        }
        return;
      }

      // Pan
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.mx;
      const dy = e.clientY - panStart.current.my;
      onPanChange({ x: panStart.current.px + dx, y: panStart.current.py + dy });
    };
    const onUp = () => {
      panStart.current = null;
      frankyDragging.current = false;
      playerDragging.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onPanChange, onFrankyMove, onPlayerMove, clientToGrid]);

  // ── Zoom via scroll wheel ──────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();

      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));

      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const newPanX = cx - (cx - pan.x) * (newZoom / zoom);
      const newPanY = cy - (cy - pan.y) * (newZoom / zoom);

      onZoomChange(newZoom);
      onPanChange({ x: newPanX, y: newPanY });
    },
    [zoom, pan, onZoomChange, onPanChange],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Touch events (mobile pan/zoom/block drag) ──────────────────────────────
  const touchState = useRef<{
    type: 'pan' | 'franky' | 'player' | 'pinch';
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    playerId?: string;
    // pinch
    startDist?: number;
    startZoom?: number;
    centerX?: number;
    centerY?: number;
  } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const getTouchDist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchState.current = {
          type: 'pinch',
          startX: cx, startY: cy,
          startPanX: pan.x, startPanY: pan.y,
          startDist: dist, startZoom: zoom,
          centerX: cx, centerY: cy,
        };
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;

        // Check Franky
        if (target?.closest('[data-franky-block]')) {
          e.preventDefault();
          touchState.current = { type: 'franky', startX: touch.clientX, startY: touch.clientY, startPanX: pan.x, startPanY: pan.y };
          return;
        }
        // Check player
        const playerEl = target?.closest('[data-playerblock]') as HTMLElement | null;
        if (playerEl) {
          const pid = playerEl.getAttribute('data-playerblock');
          if (pid) {
            e.preventDefault();
            touchState.current = { type: 'player', startX: touch.clientX, startY: touch.clientY, startPanX: pan.x, startPanY: pan.y, playerId: pid };
            return;
          }
        }
        // Pan
        e.preventDefault();
        touchState.current = { type: 'pan', startX: touch.clientX, startY: touch.clientY, startPanX: pan.x, startPanY: pan.y };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState.current) return;
      e.preventDefault();

      if (touchState.current.type === 'pinch' && e.touches.length === 2) {
        const dist = getTouchDist(e.touches);
        const scale = dist / (touchState.current.startDist || 1);
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (touchState.current.startZoom || 1) * scale));

        const rect = el.getBoundingClientRect();
        const cx = (touchState.current.centerX || 0) - rect.left;
        const cy = (touchState.current.centerY || 0) - rect.top;
        const newPanX = cx - (cx - touchState.current.startPanX) * (newZoom / (touchState.current.startZoom || 1));
        const newPanY = cy - (cy - touchState.current.startPanY) * (newZoom / (touchState.current.startZoom || 1));

        onZoomChange(newZoom);
        onPanChange({ x: newPanX, y: newPanY });
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      if (touchState.current.type === 'pan') {
        const dx = touch.clientX - touchState.current.startX;
        const dy = touch.clientY - touchState.current.startY;
        onPanChange({ x: touchState.current.startPanX + dx, y: touchState.current.startPanY + dy });
        return;
      }

      if (touchState.current.type === 'franky') {
        const rect = el.getBoundingClientRect();
        const x = (touch.clientX - rect.left - pan.x) / zoom;
        const y = (touch.clientY - rect.top - pan.y) / zoom;
        const col = Math.floor(x / CELL_SIZE) - Math.floor(FRANKY_BLOCK_SIZE / 2);
        const row = Math.floor(y / CELL_SIZE) - Math.floor(FRANKY_BLOCK_SIZE / 2);
        const cur = lastFrankyPos.current;
        if (col !== cur.col || row !== cur.row) {
          onFrankyMove({ col, row });
        }
        return;
      }

      if (touchState.current.type === 'player' && touchState.current.playerId) {
        const rect = el.getBoundingClientRect();
        const x = (touch.clientX - rect.left - pan.x) / zoom;
        const y = (touch.clientY - rect.top - pan.y) / zoom;
        const col = Math.floor(x / CELL_SIZE) - Math.floor(PLAYER_BLOCK_SIZE / 2);
        const row = Math.floor(y / CELL_SIZE) - Math.floor(PLAYER_BLOCK_SIZE / 2);
        const pp = lastPlayerPositions.current.find(p => p.playerId === touchState.current!.playerId);
        if (!pp || col !== pp.position.col || row !== pp.position.row) {
          onPlayerMove(touchState.current.playerId, { col, row });
        }
        return;
      }
    };

    const onTouchEnd = () => {
      touchState.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [pan, zoom, onPanChange, onZoomChange, onFrankyMove, onPlayerMove]);

  // ── Player lookup ──────────────────────────────────────────────────────────
  const playerById = React.useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) map.set(p.id, p);
    return map;
  }, [players]);

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const pos = computeDropPosition(e.clientX, e.clientY, rect, zoom, pan, cols, rows);
      onDragOver(pos);
    },
    [cols, rows, zoom, pan, onDragOver],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const pos = computeDropPosition(e.clientX, e.clientY, rect, zoom, pan, cols, rows);

      if (!pos) { onDragOver(null); return; }

      const color = computeHighlight(pos, placedPlayers, frankyPosition, dragState);
      if (color === 'red') { onDragOver(null); return; }

      let source: DragSource | null = null;
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) source = JSON.parse(raw) as DragSource;
      } catch { /* ignore */ }

      if (!source) { onDragOver(null); return; }

      onDrop(pos, source);
      onDragOver(null);
    },
    [cols, rows, zoom, pan, placedPlayers, frankyPosition, dragState, onDrop, onDragOver],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const relatedTarget = e.relatedTarget as Node | null;
      const vp = viewportRef.current;
      if (vp && relatedTarget && vp.contains(relatedTarget)) return;
      onDragOver(null);
    },
    [onDragOver],
  );

  const handleBlockDragStart = useCallback(
    (_source: DragSource) => { onDragOver(null); },
    [onDragOver],
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const gridW = cols * CELL_SIZE;
  const gridH = rows * CELL_SIZE;

  const draggingPlayerId = dragState?.source.playerId ?? null;
  const draggingFromPos = dragState?.source.fromPosition ?? null;

  return (
    <div
      ref={viewportRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: panStart.current ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {/* Canvas for grid lines — no DOM elements for cells */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* DOM overlay for player blocks — transformed with pan/zoom */}
      <div
        ref={setOverlayRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: gridW,
          height: gridH,
          transformOrigin: '0 0',
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          willChange: 'transform',
          pointerEvents: 'none',
          // @ts-ignore — webkit prefix for crisper text in transformed layers
          WebkitFontSmoothing: 'antialiased',
          backfaceVisibility: 'hidden',
        }}
      >
        {placedPlayers.map((pp) => {
          const player = playerById.get(pp.playerId);
          if (!player) return null;
          const isDragging =
            draggingPlayerId === pp.playerId &&
            draggingFromPos !== null &&
            draggingFromPos.col === pp.position.col &&
            draggingFromPos.row === pp.position.row;
          return (
            <div
              key={pp.playerId}
              style={{
                position: 'absolute',
                left: pp.position.col * CELL_SIZE,
                top: pp.position.row * CELL_SIZE,
                width: CELL_SIZE * PLAYER_BLOCK_SIZE,
                height: CELL_SIZE * PLAYER_BLOCK_SIZE,
                zIndex: 5,
                pointerEvents: 'auto',
                transition: 'left 0.08s ease-out, top 0.08s ease-out',
              }}
            >
              <PlayerBlock
                player={player}
                position={pp.position}
                onDragStart={handleBlockDragStart}
                isDragging={isDragging}
              />
            </div>
          );
        })}

        <div
          data-franky-block
          style={{
            position: 'absolute',
            left: frankyPosition.col * CELL_SIZE,
            top: frankyPosition.row * CELL_SIZE,
            width: CELL_SIZE * FRANKY_BLOCK_SIZE,
            height: CELL_SIZE * FRANKY_BLOCK_SIZE,
            zIndex: 5,
            pointerEvents: 'auto',
            transition: 'left 0.08s ease-out, top 0.08s ease-out',
          }}
        >
          <FrankyBlock
            position={frankyPosition}
            onDragStart={handleBlockDragStart}
            isDragging={frankyDragging.current}
          />
        </div>
      </div>
    </div>
  );
};

export default GridCanvas;
