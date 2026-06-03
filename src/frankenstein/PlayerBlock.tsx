import type { Player, GridPosition, DragSource } from './types';
import { truncateName, getInitials, getContrastColor } from './displayUtils';

interface PlayerBlockProps {
  player: Player;
  position?: GridPosition;
  onDragStart: (source: DragSource) => void;
  isDragging?: boolean;
}

/**
 * PlayerBlock — blok 3×3 gracza na siatce.
 * Przenoszenie odbywa się przez mousedown+mousemove (obsługiwane w GridCanvas).
 */
export function PlayerBlock({ player, isDragging }: PlayerBlockProps) {
  const textColor = getContrastColor(player.color);
  const displayName = truncateName(player.name);

  return (
    <div
      data-playerblock={player.id}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: player.color,
        color: textColor,
        opacity: isDragging ? 0.7 : 1,
        cursor: 'move',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        border: '2px solid rgba(255,255,255,0.3)',
        boxSizing: 'border-box',
        position: 'relative',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Top-left: initials or icon */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
        }}
      >
        {player.iconUrl ? (
          <img
            src={player.iconUrl}
            alt={player.name}
            style={{ width: 16, height: 16, borderRadius: 2, objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 11, fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none' }}>
            {getInitials(player.name)}
          </span>
        )}
      </div>

      {/* Centered name + level */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.2,
          padding: '0 4px',
          pointerEvents: 'none',
          color: textColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span>{displayName}</span>
        <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>{player.level}</span>
      </span>
    </div>
  );
}

export default PlayerBlock;
