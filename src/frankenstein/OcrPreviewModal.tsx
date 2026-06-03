import { useState } from 'react';
import { PLAYER_LEVELS, LEVEL_COLORS } from './types';
import type { ParsedPlayer } from './ocrImport';
import { isValidLevel } from './ocrImport';

interface OcrPreviewModalProps {
  isOpen: boolean;
  suggestions: ParsedPlayer[];
  rawText: string;
  onConfirm: (players: ParsedPlayer[]) => void;
  onCancel: () => void;
}

/**
 * Modal showing OCR results for review before adding players.
 * User can edit names, change levels, remove entries, or add new ones.
 */
export function OcrPreviewModal({ isOpen, suggestions, rawText, onConfirm, onCancel }: OcrPreviewModalProps) {
  const [entries, setEntries] = useState<ParsedPlayer[]>(suggestions);
  const [showRaw, setShowRaw] = useState(false);

  if (!isOpen) return null;

  const updateEntry = (index: number, field: 'name' | 'level', value: string) => {
    setEntries((prev) => {
      const copy = [...prev];
      if (field === 'name') {
        copy[index] = { ...copy[index], name: value };
      } else if (field === 'level' && isValidLevel(value)) {
        copy[index] = { ...copy[index], level: value };
      }
      return copy;
    });
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { name: '', level: 'I2' }]);
  };

  const handleConfirm = () => {
    const valid = entries.filter((e) => e.name.trim().length >= 2);
    onConfirm(valid);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #2a2a4a',
          borderRadius: 12,
          padding: '20px 24px',
          minWidth: 380,
          maxWidth: 500,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#e0e0f0', fontSize: 15, fontWeight: 700, margin: 0 }}>
            Recognized players preview
          </h3>
          <span style={{ color: '#888', fontSize: 12 }}>
            {entries.length} {entries.length === 1 ? 'player' : 'players'}
          </span>
        </div>

        {/* Player entries list */}
        <div
          className="custom-scrollbar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 300,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
              }}
            >
              <input
                type="text"
                value={entry.name}
                onChange={(e) => updateEntry(i, 'name', e.target.value)}
                placeholder="Player name"
                maxLength={20}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 5,
                  border: '1px solid #3a3a5a',
                  background: '#0f0f1e',
                  color: '#e0e0f0',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <select
                value={entry.level}
                onChange={(e) => updateEntry(i, 'level', e.target.value)}
                style={{
                  padding: '5px 4px',
                  borderRadius: 5,
                  border: '1px solid #3a3a5a',
                  background: '#0f0f1e',
                  color: LEVEL_COLORS[entry.level],
                  fontSize: 12,
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  width: 52,
                }}
              >
                {PLAYER_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeEntry(i)}
                style={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#666'; }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add new entry */}
        <button
          type="button"
          onClick={addEntry}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px dashed #3a3a5a',
            background: 'transparent',
            color: '#888',
            fontSize: 12,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          + Add manually
        </button>

        {/* Raw OCR text toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: '#666',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showRaw ? 'Hide' : 'Show'} raw OCR text
          </button>
          {showRaw && (
            <pre
              className="custom-scrollbar"
              style={{
                marginTop: 6,
                padding: 8,
                background: '#0a0a18',
                borderRadius: 6,
                color: '#888',
                fontSize: 10,
                maxHeight: 120,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {rawText}
            </pre>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '7px 16px',
              borderRadius: 6,
              border: '1px solid #3a3a5a',
              background: 'transparent',
              color: '#aaa',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={entries.filter((e) => e.name.trim().length >= 2).length === 0}
            style={{
              padding: '7px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#22c55e',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: entries.filter((e) => e.name.trim().length >= 2).length === 0 ? 0.5 : 1,
            }}
          >
            Add players ({entries.filter((e) => e.name.trim().length >= 2).length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default OcrPreviewModal;
