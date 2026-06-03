import React from 'react';
import type { GridPosition, DragSource } from './types';

interface FrankyBlockProps {
  position: GridPosition;
  onDragStart: (source: DragSource) => void;
  isDragging?: boolean;
}

/**
 * FrankyBlock — blok 4×4 Frankenstein na siatce.
 * Kolor żółty, etykieta „FRANKY" wyśrodkowana.
 * Przenoszenie odbywa się przez mousedown+mousemove (obsługiwane w GridCanvas),
 * NIE przez HTML drag API.
 */
const FrankyBlock: React.FC<FrankyBlockProps> = ({ isDragging = false }) => {
  return (
    <div
      data-franky-block
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fbbf24',
        opacity: isDragging ? 0.8 : 1,
        zIndex: 10,
        border: '2px solid #ca8a04',
        boxSizing: 'border-box',
        borderRadius: 4,
        cursor: 'move',
        userSelect: 'none',
      }}
    >
      <span
        style={{ color: '#78350f', fontWeight: 'bold', fontSize: 16, pointerEvents: 'none' }}
      >
        FRANKY
      </span>
    </div>
  );
};

export default FrankyBlock;
