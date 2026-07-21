import { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import type { RegionCenter, RegionData, Building } from './AllianceMapManager';

interface DevtoolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionData: RegionData[];
  territoryLevels: Record<string, number>;
  onLevelChange: (regionId: string, level: number) => void;
  levelPositions: Record<string, RegionCenter>;
  onLevelPositionChange: (regionId: string, pos: { x: number; y: number }) => void;
  buildings: Building[];
  onBuildingAdd: () => void;
  onBuildingRemove: (id: string) => void;
  regionCenters: Record<string, RegionCenter>;
}

export function DevtoolsModal({
  isOpen,
  onClose,
  regionData,
  territoryLevels,
  onLevelChange,
  levelPositions,
  onLevelPositionChange,
  buildings,
  onBuildingAdd,
  onBuildingRemove,
  regionCenters,
}: DevtoolsModalProps) {
  const [activeTab, setActiveTab] = useState<'levels' | 'buildings'>('levels');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFilterText('');
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

  const filteredRegions = regionData.filter(r => {
    if (!filterText) return true;
    const lw = filterText.toLowerCase();
    return r.id.toLowerCase().includes(lw) || String(r.number).includes(lw);
  });

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
          width: 640,
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--text-emphasis)', fontSize: 15, fontWeight: 700, margin: 0 }}>
            S6 Devtools
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

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #2a2a3a', paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'levels' ? '#a855f7' : 'transparent',
              color: activeTab === 'levels' ? '#fff' : 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Territory Levels ({regionData.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('buildings')}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'buildings' ? '#a855f7' : 'transparent',
              color: activeTab === 'buildings' ? '#fff' : 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Buildings ({buildings.length})
          </button>
        </div>

        {activeTab === 'levels' && (
          <>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by ID or number..."
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #2a2a3a',
                background: '#111118',
                color: 'var(--text-emphasis)',
                fontSize: 12,
                outline: 'none',
              }}
            />

            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 6px', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '4px 6px', fontWeight: 600 }}>Level</th>
                    <th style={{ padding: '4px 6px', fontWeight: 600 }}>Pos X</th>
                    <th style={{ padding: '4px 6px', fontWeight: 600 }}>Pos Y</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegions.map(region => {
                    const center = levelPositions[region.id] || regionCenters[region.id] || { x: 0, y: 0 };
                    const level = territoryLevels[region.id] ?? 1;
                    return (
                      <tr key={region.id} style={{ borderTop: '1px solid #1f1f2a' }}>
                        <td style={{ padding: '2px 6px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{region.id}</td>
                        <td style={{ padding: '2px 6px' }}>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={level}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v) && v >= 1 && v <= 10) {
                                onLevelChange(region.id, v);
                              }
                            }}
                            style={{
                              width: 48,
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #2a2a3a',
                              background: '#111118',
                              color: 'var(--text-emphasis)',
                              fontSize: 12,
                              outline: 'none',
                              textAlign: 'center',
                            }}
                          />
                        </td>
                        <td style={{ padding: '2px 6px' }}>
                          <input
                            type="number"
                            value={center.x}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) {
                                onLevelPositionChange(region.id, { x: v, y: center.y });
                              }
                            }}
                            style={{
                              width: 60,
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #2a2a3a',
                              background: '#111118',
                              color: 'var(--text-emphasis)',
                              fontSize: 12,
                              outline: 'none',
                              textAlign: 'center',
                            }}
                          />
                        </td>
                        <td style={{ padding: '2px 6px' }}>
                          <input
                            type="number"
                            value={center.y}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) {
                                onLevelPositionChange(region.id, { x: center.x, y: v });
                              }
                            }}
                            style={{
                              width: 60,
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid #2a2a3a',
                              background: '#111118',
                              color: 'var(--text-emphasis)',
                              fontSize: 12,
                              outline: 'none',
                              textAlign: 'center',
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'buildings' && (
          <>
            <button
              type="button"
              onClick={() => {
                onBuildingAdd();
                onClose();
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#f59e0b',
                color: '#111118',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
              }}
            >
              <Plus size={14} />
              Add Building (click on map)
            </button>

            {buildings.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>No buildings placed</p>
            )}

            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {buildings.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #2a2a3a',
                    marginBottom: 4,
                    background: '#111118',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, color: 'var(--text-emphasis)' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{b.id.slice(0, 8)}</span>
                    <span>x: {b.x}, y: {b.y}</span>
                    <span style={{ color: '#f59e0b' }}>{b.type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBuildingRemove(b.id)}
                    style={{
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      borderRadius: 4,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DevtoolsModal;
