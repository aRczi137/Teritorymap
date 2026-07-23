import { useState, useEffect } from 'react';
import type { Player, PlacedPlayer, GridPosition, GridConfig } from './types';
import { fetchTemplates } from './templateService';
import { LEVEL_COLORS } from './types';
import type { HiveTemplate } from './types';
import { trackTemplateLoad } from '../analytics';

interface TemplateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadLayout: (data: {
    players: Player[];
    placedPlayers: PlacedPlayer[];
    frankyPosition: GridPosition;
    gridConfig: GridConfig;
  }) => void;
}

export function TemplateListModal({ isOpen, onClose, loadLayout }: TemplateListModalProps) {
  const [templates, setTemplates] = useState<HiveTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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

  const handleLoad = (template: HiveTemplate) => {
    trackTemplateLoad(template.id || 'unknown');
    loadLayout({
      players: template.players,
      placedPlayers: template.placedPlayers,
      frankyPosition: template.frankyPosition,
      gridConfig: template.gridConfig,
    });
    onClose();
  };

  const formatDate = (ts: any): string => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
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
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a24',
          border: '1px solid #2a2a3a',
          borderRadius: 12,
          padding: '20px 24px',
          minWidth: 420,
          maxWidth: 520,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--text-emphasis)', fontSize: 15, fontWeight: 700, margin: 0 }}>
            Load Template
          </h3>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </span>
        </div>

        {loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Loading...
          </p>
        )}

        {error && (
          <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            {error}
          </p>
        )}

        {!loading && !error && templates.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No templates available yet.
          </p>
        )}

        {!loading && !error && templates.length > 0 && (
          <div
            className="custom-scrollbar"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 340,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ color: 'var(--text-emphasis)', fontSize: 13, fontWeight: 600 }}>
                    {t.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {t.placedPlayers.length} {t.placedPlayers.length === 1 ? 'player' : 'players'}
                    {formatDate(t.updatedAt) && ` • ${formatDate(t.updatedAt)}`}
                  </span>
                </div>
                {t.placedPlayers.length > 0 && (() => {
                  const allCols = [...t.placedPlayers.map(p => p.position.col), t.frankyPosition.col, t.frankyPosition.col + 4];
                  const allRows = [...t.placedPlayers.map(p => p.position.row), t.frankyPosition.row, t.frankyPosition.row + 4];
                  const minX = Math.min(...allCols, 0);
                  const minY = Math.min(...allRows, 0);
                  const maxX = Math.max(...allCols, 0) + 1;
                  const maxY = Math.max(...allRows, 0) + 1;
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const scale = Math.min(60 / w, 60 / h, 6);
                  return (
                    <svg width={w * scale} height={h * scale} style={{ flexShrink: 0, marginLeft: 8, borderRadius: 2, background: 'rgba(0,0,0,0.3)' }}>
                      {t.placedPlayers.map(pp => {
                        const player = t.players.find(p => p.id === pp.playerId);
                        const color = player ? (LEVEL_COLORS[player.level] || '#cbd5e1') : '#cbd5e1';
                        return <rect key={pp.playerId} x={(pp.position.col - minX) * scale} y={(pp.position.row - minY) * scale} width={scale} height={scale} fill={color} opacity={0.85} rx={1} />;
                      })}
                      <rect x={(t.frankyPosition.col - minX) * scale} y={(t.frankyPosition.row - minY) * scale} width={4 * scale} height={4 * scale} fill="#fbbf24" opacity={1} rx={scale} />
                    </svg>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleLoad(t)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateListModal;
