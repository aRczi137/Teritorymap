import { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, Plus, X, Check, ChevronUp, ChevronDown } from 'lucide-react';
import type { DragSource, DragState, GridPosition, PlayerLevel } from './types';
import { PLAYER_LEVELS, LEVEL_COLORS } from './types';
import { useFrankyLayout } from './useFrankyLayout';
import GridCanvas from './GridCanvas';
import { ResetModal } from './ResetModal';
import { buildExportFilename } from './exportUtils';
import { runOcrOnImage, type ParsedPlayer } from './ocrImport';
import { OcrPreviewModal } from './OcrPreviewModal';
import { trackOcrImport, trackPlayerAdd, trackHiveExport } from '../analytics';
import { TemplateListModal } from './TemplateListModal';
import { SaveTemplateModal } from './SaveTemplateModal';

/** Base cell size used by GridCanvas (must match) */
const CELL_SIZE = 40;

interface FrankensteinEventTabProps {
  isActive: boolean;
  userId: string;
}

/**
 * Full-screen Frankenstein Event tab.
 *
 * The grid fills 100% of the available space. Pan with left-mouse drag,
 * zoom with scroll wheel. A "center camera" button sits bottom-right.
 */
export function FrankensteinEventTab({ isActive, userId }: FrankensteinEventTabProps) {
  const {
    players,
    placedPlayers,
    frankyPosition,
    gridConfig,
    addPlayer,
    removePlayer,
    updatePlayer,
    placePlayer,
    movePlayer,
    moveFranky,
    resetLayout,
    loadLayout,
  } = useFrankyLayout(userId);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleDragOver = useCallback((position: GridPosition | null) => {
    setDragState((prev) => (prev ? { ...prev, hoverPosition: position } : prev));
  }, []);

  const handleDrop = useCallback(
    (position: GridPosition, source: DragSource) => {
      switch (source.type) {
        case 'panel':
          if (source.playerId) placePlayer(source.playerId, position);
          break;
        case 'grid':
          if (source.playerId) movePlayer(source.playerId, position);
          break;
        case 'franky':
          moveFranky(position);
          break;
      }
      setDragState(null);
    },
    [placePlayer, movePlayer, moveFranky],
  );

  const handleDragEnd = useCallback(() => setDragState(null), []);

  // ── Franky real-time move (snaps to grid during drag) ──────────────────────
  const handleFrankyMove = useCallback(
    (newPosition: GridPosition) => {
      moveFranky(newPosition);
    },
    [moveFranky],
  );

  // ── Player real-time move (snaps to grid during drag) ──────────────────────
  const handlePlayerMove = useCallback(
    (playerId: string, newPosition: GridPosition) => {
      movePlayer(playerId, newPosition);
    },
    [movePlayer],
  );

  // ── Add player (place near Franky) ─────────────────────────────────────────
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerLevelInput, setPlayerLevelInput] = useState<PlayerLevel>('I2');
  const [panelOpen, setPanelOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState<PlayerLevel>('I2');

  const handleAddPlayer = useCallback(() => {
    const name = playerNameInput.trim();
    if (!name) return;
    addPlayer(name, playerLevelInput);
    trackPlayerAdd('manual');
    setPlayerNameInput('');
  }, [playerNameInput, playerLevelInput, addPlayer]);

  const startEditing = useCallback((player: { id: string; name: string; level: PlayerLevel }) => {
    setEditingPlayerId(player.id);
    setEditName(player.name);
    setEditLevel(player.level);
  }, []);

  const confirmEdit = useCallback(() => {
    if (!editingPlayerId) return;
    const name = editName.trim();
    if (!name) return;
    updatePlayer(editingPlayerId, name, editLevel);
    setEditingPlayerId(null);
  }, [editingPlayerId, editName, editLevel, updatePlayer]);

  const cancelEdit = useCallback(() => {
    setEditingPlayerId(null);
  }, []);

  /** Place an existing (unplaced) player on the grid near Franky */
  const placePlayerOnGrid = useCallback((playerId: string) => {
    const PLAYER_SIZE = 3;
    const FRANKY_SIZE = 4;
    const frankyCenter = {
      col: frankyPosition.col + 2,
      row: frankyPosition.row + 2,
    };

    // Check collision helper (AABB overlap)
    const collides = (a: GridPosition, aSize: number, b: GridPosition, bSize: number) =>
      a.col < b.col + bSize && a.col + aSize > b.col &&
      a.row < b.row + bSize && a.row + aSize > b.row;

    for (let radius = 3; radius < 80; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          const candidate: GridPosition = {
            col: frankyCenter.col + dc - 1,
            row: frankyCenter.row + dr - 1,
          };
          // Bounds
          if (candidate.col < 0 || candidate.row < 0 ||
              candidate.col + PLAYER_SIZE > gridConfig.cols ||
              candidate.row + PLAYER_SIZE > gridConfig.rows) continue;
          // Collision with Franky
          if (collides(candidate, PLAYER_SIZE, frankyPosition, FRANKY_SIZE)) continue;
          // Collision with other placed players
          let blocked = false;
          for (const pp of placedPlayers) {
            if (collides(candidate, PLAYER_SIZE, pp.position, PLAYER_SIZE)) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;
          // Found free spot — place and exit
          placePlayer(playerId, candidate);
          return;
        }
      }
    }
  }, [frankyPosition, gridConfig, placedPlayers, placePlayer]);

  // ── OCR Import ─────────────────────────────────────────────────────────────
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrResult, setOcrResult] = useState<{ suggestions: ParsedPlayer[]; rawText: string } | null>(null);

  const handleImportFromImage = useCallback(() => {
    trackOcrImport();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setOcrProgress(0);
      try {
        const result = await runOcrOnImage(file, setOcrProgress);
        setOcrResult(result);
      } catch (err: any) {
        if (err?.message === 'QUOTA_EXCEEDED') {
          alert('Gemini API quota exceeded. Please wait a minute and try again.');
        } else {
          alert('OCR error — please try again');
        }
        console.error(err);
      } finally {
        setOcrProgress(null);
      }
    };
    input.click();
  }, []);

  const handleOcrConfirm = useCallback((players: ParsedPlayer[]) => {
    for (const p of players) {
      addPlayer(p.name, p.level);
    }
    trackPlayerAdd('ocr');
    setOcrResult(null);
  }, [addPlayer]);

  const handleOcrCancel = useCallback(() => {
    setOcrResult(null);
  }, []);

  // ── Zoom & pan ─────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleZoomChange = useCallback((z: number) => setZoom(z), []);
  const handlePanChange = useCallback((p: { x: number; y: number }) => setPan(p), []);

  /** Ref for the viewport div (needed to compute center) */
  const containerRef = useRef<HTMLDivElement>(null);

  // Center camera on mount
  const didInitialCenter = useRef(false);
  useEffect(() => {
    if (didInitialCenter.current) return;
    if (!isActive) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const gridW = gridConfig.cols * CELL_SIZE;
    const gridH = gridConfig.rows * CELL_SIZE;
    const newPanX = (rect.width - gridW * zoom) / 2;
    const newPanY = (rect.height - gridH * zoom) / 2;
    setPan({ x: newPanX, y: newPanY });
    didInitialCenter.current = true;
  }, [isActive, gridConfig.cols, gridConfig.rows, zoom]);

  /** Center camera on the middle of the grid */
  const centerCamera = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gridW = gridConfig.cols * CELL_SIZE;
    const gridH = gridConfig.rows * CELL_SIZE;
    const newPanX = (rect.width - gridW * zoom) / 2;
    const newPanY = (rect.height - gridH * zoom) / 2;
    setPan({ x: newPanX, y: newPanY });
  }, [gridConfig.cols, gridConfig.rows, zoom]);

  // ── Export as image (canvas-based screenshot) ───────────────────────────────
  const exportRef = useRef<HTMLDivElement>(null);

  const exportAsImage = useCallback(() => {
    trackHiveExport();
    const EXPORT_CELL = 30;
    const PADDING = 3; // cells of padding around content

    // Find bounding box of all placed content (Franky + players)
    let minCol = frankyPosition.col;
    let minRow = frankyPosition.row;
    let maxCol = frankyPosition.col + 4; // Franky is 4×4
    let maxRow = frankyPosition.row + 4;

    for (const pp of placedPlayers) {
      minCol = Math.min(minCol, pp.position.col);
      minRow = Math.min(minRow, pp.position.row);
      maxCol = Math.max(maxCol, pp.position.col + 3); // players are 3×3
      maxRow = Math.max(maxRow, pp.position.row + 3);
    }

    // Add padding
    minCol = Math.max(0, minCol - PADDING);
    minRow = Math.max(0, minRow - PADDING);
    maxCol = Math.min(gridConfig.cols, maxCol + PADDING);
    maxRow = Math.min(gridConfig.rows, maxRow + PADDING);

    const exportCols = maxCol - minCol;
    const exportRows = maxRow - minRow;
    const w = exportCols * EXPORT_CELL;
    const h = exportRows * EXPORT_CELL;

    // Use 2x resolution for crisp text
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (only in the exported region)
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= exportCols; c++) {
      ctx.moveTo(c * EXPORT_CELL, 0);
      ctx.lineTo(c * EXPORT_CELL, h);
    }
    for (let r = 0; r <= exportRows; r++) {
      ctx.moveTo(0, r * EXPORT_CELL);
      ctx.lineTo(w, r * EXPORT_CELL);
    }
    ctx.stroke();

    // Offset: translate grid positions to canvas coords
    const ox = -minCol * EXPORT_CELL;
    const oy = -minRow * EXPORT_CELL;

    // Franky block (4×4)
    const fx = frankyPosition.col * EXPORT_CELL + ox;
    const fy = frankyPosition.row * EXPORT_CELL + oy;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(fx, fy, EXPORT_CELL * 4, EXPORT_CELL * 4);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, EXPORT_CELL * 4, EXPORT_CELL * 4);
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FRANKY', fx + EXPORT_CELL * 2, fy + EXPORT_CELL * 2);

    // Player blocks (3×3)
    for (const pp of placedPlayers) {
      const player = players.find((p) => p.id === pp.playerId);
      if (!player) continue;
      const px = pp.position.col * EXPORT_CELL + ox;
      const py = pp.position.row * EXPORT_CELL + oy;
      const ps = EXPORT_CELL * 3;
      ctx.fillStyle = player.color;
      ctx.fillRect(px, py, ps, ps);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, ps, ps);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.name, px + ps / 2, py + ps / 2 - 6);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(player.level, px + ps / 2, py + ps / 2 + 8);
    }

    // Download
    const link = document.createElement('a');
    link.download = buildExportFilename(new Date());
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [gridConfig.cols, gridConfig.rows, frankyPosition, placedPlayers, players]);

  // ── Save/Load layout as JSON ───────────────────────────────────────────────
  const saveLayoutToFile = useCallback(() => {
    const data = {
      version: 1,
      gridConfig,
      players,
      placedPlayers,
      frankyPosition,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `frankenstein-layout-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [gridConfig, players, placedPlayers, frankyPosition]);

  const loadLayoutFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!data.players || !data.frankyPosition) {
            alert('Invalid layout file');
            return;
          }
          loadLayout(data);
        } catch {
          alert('File read error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadLayout]);

  // ── Reset modal ────────────────────────────────────────────────────────────
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);

  const isAdmin = userId === import.meta.env.VITE_ADMIN_DISCORD_ID;

  const handleResetConfirm = () => {
    resetLayout();
    setResetModalOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        display: isActive ? 'block' : 'none',
        position: 'absolute',
        inset: 0,
      }}
      onDragEnd={handleDragEnd}
    >
      {/* Full-screen grid */}
      <GridCanvas
        cols={gridConfig.cols}
        rows={gridConfig.rows}
        placedPlayers={placedPlayers}
        players={players}
        frankyPosition={frankyPosition}
        dragState={dragState}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        exportRef={exportRef}
        zoom={zoom}
        pan={pan}
        onZoomChange={handleZoomChange}
        onPanChange={handlePanChange}
        onFrankyMove={handleFrankyMove}
        onPlayerMove={handlePlayerMove}
      />

      {/* Floating tools panel — top-left (collapsible) */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'rgba(17,17,24,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          border: '1px solid #2a2a3a',
          padding: toolsOpen ? '6px 8px' : '6px 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          maxWidth: toolsOpen ? 'calc(100vw - 290px)' : 'calc(100vw - 280px)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#aaaacc',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          TOOLS
          {toolsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {toolsOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="px-2 py-1 rounded text-xs font-medium bg-surface-hover hover:bg-surface-hover/80
                text-gray-200 border border-surface-border hover:border-[rgba(155,48,255,0.4)]
                focus:outline-none focus:ring-2 focus:ring-accent-purple
                transition-colors duration-150"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={exportAsImage}
              className="px-2 py-1 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500
                text-white border border-indigo-500 hover:border-indigo-400
                focus:outline-none focus:ring-2 focus:ring-accent-purple
                transition-colors duration-150"
            >
              Export PNG
            </button>
            <button
              type="button"
              onClick={saveLayoutToFile}
              className="px-2 py-1 rounded text-xs font-medium bg-surface-hover hover:bg-surface-hover/80
                text-gray-200 border border-surface-border hover:border-[rgba(155,48,255,0.4)]
                focus:outline-none focus:ring-2 focus:ring-accent-purple
                transition-colors duration-150"
            >
              Save layout
            </button>
            <button
              type="button"
              onClick={loadLayoutFromFile}
              className="px-2 py-1 rounded text-xs font-medium bg-surface-hover hover:bg-surface-hover/80
                text-gray-200 border border-surface-border hover:border-[rgba(155,48,255,0.4)]
                focus:outline-none focus:ring-2 focus:ring-accent-purple
                transition-colors duration-150"
            >
              Load layout
            </button>
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="px-2 py-1 rounded text-xs font-medium bg-surface-hover hover:bg-surface-hover/80
                text-gray-200 border border-surface-border hover:border-[rgba(155,48,255,0.4)]
                focus:outline-none focus:ring-2 focus:ring-accent-purple
                transition-colors duration-150"
            >
              Load Template
            </button>
            <button
              type="button"
              onClick={handleImportFromImage}
              disabled={ocrProgress !== null}
              className="px-2 py-1 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500
                text-white border border-amber-500 hover:border-amber-400
                focus:outline-none focus:ring-2 focus:ring-amber-400
                transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ocrProgress !== null ? `OCR ${ocrProgress}%` : 'Import from image'}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setSaveTemplateModalOpen(true)}
                className="px-2 py-1 rounded text-xs font-medium bg-surface-hover hover:bg-surface-hover/80
                  text-gray-200 border border-purple-600 hover:border-purple-400
                  focus:outline-none focus:ring-2 focus:ring-accent-purple
                  transition-colors duration-150"
              >
                Save as Template
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add player panel — top-right (collapsible on mobile) */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(17,17,24,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          border: '1px solid #2a2a3a',
          padding: panelOpen ? '8px 10px' : '6px 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          maxWidth: panelOpen ? 'min(240px, calc(100vw - 140px))' : 'min(200px, calc(100vw - 120px))',
          maxHeight: panelOpen ? 'calc(100vh - 80px)' : 'auto',
          overflow: 'hidden',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#aaaacc',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          PLAYERS ({players.length})
          {panelOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {panelOpen && (
          <>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            value={playerNameInput}
            onChange={(e) => setPlayerNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
            placeholder="Player name"
            maxLength={20}
            style={{
              flex: 1,
              padding: '5px 8px',
              borderRadius: 6,
              border: '1px solid #2a2a3a',
              background: '#1a1a24',
              color: '#e0e0f0',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <select
            value={playerLevelInput}
            onChange={(e) => setPlayerLevelInput(e.target.value as PlayerLevel)}
            style={{
              padding: '5px 6px',
              borderRadius: 6,
              border: '1px solid #2a2a3a',
              background: '#1a1a24',
              color: LEVEL_COLORS[playerLevelInput],
              fontSize: 12,
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {PLAYER_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl} style={{ color: LEVEL_COLORS[lvl] }}>
                {lvl}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddPlayer}
            disabled={!playerNameInput.trim()}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              background: playerNameInput.trim() ? '#22c55e' : '#2a2a3a',
              color: playerNameInput.trim() ? '#fff' : '#666',
              fontSize: 12,
              fontWeight: 600,
              cursor: playerNameInput.trim() ? 'pointer' : 'default',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        {/* List of players */}
        {players.length > 0 && (
          <div
            className="custom-scrollbar"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              maxHeight: 200,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {[...players].sort((a, b) => {
              const lvlA = parseInt(a.level.slice(1), 10);
              const lvlB = parseInt(b.level.slice(1), 10);
              return lvlB - lvlA;
            }).map((p) => {
              const isPlaced = placedPlayers.some((pp) => pp.playerId === p.id);
              const isEditing = editingPlayerId === p.id;

              if (isEditing) {
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 6px',
                      borderRadius: 5,
                      background: 'rgba(155,48,255,0.1)',
                      border: '1px solid rgba(155,48,255,0.3)',
                    }}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      maxLength={20}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '2px 5px',
                        borderRadius: 4,
                        border: '1px solid #2a2a3a',
                        background: '#1a1a24',
                        color: '#e0e0f0',
                        fontSize: 11,
                        outline: 'none',
                        minWidth: 0,
                      }}
                    />
                    <select
                      value={editLevel}
                      onChange={(e) => setEditLevel(e.target.value as PlayerLevel)}
                      style={{
                        padding: '2px 4px',
                        borderRadius: 4,
                        border: '1px solid #2a2a3a',
                        background: '#1a1a24',
                        color: LEVEL_COLORS[editLevel],
                        fontSize: 10,
                        fontWeight: 700,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {PLAYER_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl} style={{ color: LEVEL_COLORS[lvl] }}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={confirmEdit}
                      title="Save"
                      style={{
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#22c55e',
                        fontSize: 13,
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      title="Cancel"
                      style={{
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 6px',
                    borderRadius: 5,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                  <span style={{ color: '#ccc', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {p.name}
                  </span>
                  <span style={{ color: p.color, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {p.level}
                  </span>
                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => startEditing(p)}
                    title="Edit player"
                    style={{
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 3,
                      color: '#666',
                      fontSize: 10,
                      lineHeight: 1,
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#9B30FF'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#666'; }}
                  >
                    <Pencil size={10} />
                  </button>
                  {/* Place on grid button — only visible when not placed */}
                  {!isPlaced && (
                    <button
                      type="button"
                      onClick={() => placePlayerOnGrid(p.id)}
                      title="Place on grid"
                      style={{
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 3,
                        color: '#22c55e',
                        fontSize: 14,
                        lineHeight: 1,
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                        fontWeight: 700,
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    title="Remove player"
                    style={{
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 3,
                      color: '#666',
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#666'; }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {/* Center camera button — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 30,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={centerCamera}
          aria-label="Center camera"
          title="Center camera"
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(17,17,24,0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #2a2a3a',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            color: '#aaaacc',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {/* Crosshair / target icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>

      <ResetModal
        isOpen={resetModalOpen}
        onConfirm={handleResetConfirm}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* OCR Preview Modal */}
      {ocrResult && (
        <OcrPreviewModal
          isOpen={true}
          suggestions={ocrResult.suggestions}
          rawText={ocrResult.rawText}
          onConfirm={handleOcrConfirm}
          onCancel={handleOcrCancel}
        />
      )}

      <TemplateListModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        loadLayout={loadLayout}
      />

      <SaveTemplateModal
        isOpen={saveTemplateModalOpen}
        onClose={() => setSaveTemplateModalOpen(false)}
        players={players}
        placedPlayers={placedPlayers}
        frankyPosition={frankyPosition}
        gridConfig={gridConfig}
      />
    </div>
  );
}

export default FrankensteinEventTab;
