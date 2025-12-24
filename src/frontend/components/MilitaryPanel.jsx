import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';
import { UNIT_ICON_MAP } from '../constants/iconMaps';

export default function MilitaryPanel({ units, buildings, onRecruit, onUpgrade }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Group units by type
  const unitCounts = (units || []).reduce((acc, u) => {
    // Exclude civilian Villagers from military stationed forces display
    if (u.type === 'Villager' || u.type === 'Peasant') return acc;
    // Use the count property if it exists, otherwise default to 1 (for legacy compatibility)
    const count = typeof u.count === 'number' ? u.count : 1;
    acc[u.type] = (acc[u.type] || 0) + count;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Stationed Forces Section */}
      <div className='panel' style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
        <div className='panel-header' style={{ background: 'none', border: 'none', padding: '0 0 12px 0' }}>
          <h3 className="font-cinzel" style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: 700 }}>
            <i className='fa-solid fa-chess-rook' style={{ marginRight: 8 }}></i>Stationed Forces
          </h3>
        </div>
        <div className='panel-body' style={{ padding: 0 }}>
          {Object.keys(unitCounts).length === 0 ? (
            <div className="beveled-panel" style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: 24, textAlign: 'center', background: 'var(--wood-medium)' }}>
              No military units stationed here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {Object.entries(unitCounts).map(([type, count]) => {
                const iconDef = UNIT_ICON_MAP[type] || { icon: 'fa-person-rifle', color: 'var(--text-main)' };
                return (
                  <div key={type} className="beveled-panel" style={{ 
                    background: 'var(--wood-medium)', 
                    padding: 16, 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div style={{ 
                      width: 48, height: 48, 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: iconDef.color,
                      fontSize: '1.4rem',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <i className={`fa-solid ${iconDef.icon}`}></i>
                    </div>
                    <div>
                      <div className="font-cinzel" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{type}</div>
                      <div className="font-garamond" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 700 }}>Count: {count}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Military infrastructure is intentionally omitted here so the Military tab
          focuses on stationed forces only. Building management is handled in the
          main Management panel's category tabs (Extraction/Industry/Township/etc.). */}

    </div>
  );
}
