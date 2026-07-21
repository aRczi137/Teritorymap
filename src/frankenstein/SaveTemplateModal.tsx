import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Player, PlacedPlayer, GridPosition, GridConfig } from './types';
import { saveTemplate } from './templateService';
import { trackTemplateSave } from '../analytics';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  placedPlayers: PlacedPlayer[];
  frankyPosition: GridPosition;
  gridConfig: GridConfig;
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  players,
  placedPlayers,
  frankyPosition,
  gridConfig,
}: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await saveTemplate({
        name: trimmed,
        players,
        placedPlayers,
        frankyPosition,
        gridConfig,
      });
      trackTemplateSave();
      onClose();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const playerCount = placedPlayers.length;

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
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a24',
          border: '1px solid #2a2a3a',
          borderRadius: 12,
          padding: '20px 24px',
          minWidth: 380,
          maxWidth: 460,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--text-emphasis)', fontSize: 15, fontWeight: 700, margin: 0 }}>
            Save as Template
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
          Save current layout ({playerCount} {playerCount === 1 ? 'player' : 'players'}) as reusable template.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          placeholder="Template name"
          maxLength={50}
          autoFocus
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #2a2a3a',
            background: '#111118',
            color: 'var(--text-emphasis)',
            fontSize: 13,
            outline: 'none',
          }}
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: 6,
              border: '1px solid #2a2a3a',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              padding: '7px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#a855f7',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: !name.trim() || saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveTemplateModal;
