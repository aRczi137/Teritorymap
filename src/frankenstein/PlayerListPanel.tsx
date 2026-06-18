import React, { useState } from 'react';
import type { Player } from './types';
import { validatePlayerName } from './validation';

interface PlayerListPanelProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (playerId: string) => void;
}

export function PlayerListPanel({ players, onAddPlayer, onRemovePlayer }: PlayerListPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validatePlayerName(inputValue, players);
    if (validationError !== null) {
      setError(validationError);
      return;
    }

    // Valid — add player and clear form immediately (within same synchronous update)
    onAddPlayer(inputValue.trim());
    setInputValue('');
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Clear error on edit so the user gets fresh feedback on next submit
    if (error !== null) {
      setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-surface-card rounded-lg p-3">
      <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
        Gracze
      </h2>

      {/* Add player form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Nazwa gracza"
            className="flex-1 bg-surface-hover text-white placeholder-text-muted rounded px-2 py-1 text-sm border border-surface-border focus:outline-none focus:border-accent-purple"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-accent-orange to-accent-purple hover:opacity-90 active:opacity-80 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
          >
            Dodaj gracza
          </button>
        </div>

        {/* Validation error */}
        {error !== null && (
          <p className="text-red-400 text-xs mt-1" role="alert">
            {error}
          </p>
        )}
      </form>

      {/* Player list */}
      {players.length === 0 ? (
        <p className="text-text-muted text-xs italic">Brak graczy. Dodaj pierwszego gracza powyżej.</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between bg-surface-hover rounded px-2 py-1 gap-2"
            >
              {/* Color dot + name */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: player.color }}
                  aria-hidden="true"
                />
                <span className="text-white text-sm truncate">{player.name}</span>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemovePlayer(player.id)}
                aria-label={`Usuń gracza ${player.name}`}
                className="text-text-muted hover:text-red-400 active:text-red-600 transition-colors flex-shrink-0 text-sm leading-none px-1"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PlayerListPanel;
