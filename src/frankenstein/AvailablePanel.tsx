import React from 'react';
import type { Player, DragSource } from './types';
import { PlayerBlock } from './PlayerBlock';

interface AvailablePanelProps {
  players: Player[];           // only players NOT on grid
  onDragStart: (source: DragSource) => void;
  onDropOnPanel: (source: DragSource) => void;
}

export function AvailablePanel({ players, onDragStart, onDropOnPanel }: AvailablePanelProps) {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const source: DragSource = JSON.parse(raw);
      onDropOnPanel(source);
    } catch {
      // malformed data — ignore
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-surface-card rounded-lg overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-surface-hover border-b border-surface-border">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
          Dostępni gracze
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          {players.length} {players.length === 1 ? 'gracz' : 'graczy'}
        </p>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {players.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm italic">Brak graczy</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 auto-rows-[48px]">
            {players.map((player) => (
              <PlayerBlock
                key={player.id}
                player={player}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AvailablePanel;
