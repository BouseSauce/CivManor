import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';
import { UNIT_ICON_MAP } from '../constants/iconMaps';
import { UNIT_CONFIG } from '../../core/config/units.js';

export default function MilitaryPanel({ units, buildings, queue = [], onRecruit, onUpgrade }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [recruitCounts, setRecruitCounts] = useState({});

  // Group units by type
  const unitCounts = (units || []).reduce((acc, u) => {
    // Exclude civilian Villagers from military stationed forces display
    if (u.type === 'Villager' || u.type === 'Peasant') return acc;
    // Use the count property if it exists, otherwise default to 1 (for legacy compatibility)
    const count = typeof u.count === 'number' ? u.count : 1;
    acc[u.type] = (acc[u.type] || 0) + count;
    return acc;
  }, {});

  const handleRecruitChange = (unitId, val) => {
    setRecruitCounts(prev => ({ ...prev, [unitId]: Math.max(0, parseInt(val) || 0) }));
  };

  const handleRecruit = async (unitId) => {
    const count = recruitCounts[unitId] || 0;
    if (count <= 0) return;
    try {
      await onRecruit(unitId, count);
      setRecruitCounts(prev => ({ ...prev, [unitId]: 0 }));
    } catch (e) {
      alert(e.message || 'Recruitment failed');
    }
  };

  const unitQueue = (queue || []).filter(it => it.type === 'Unit');

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

      {/* Training Queue Section */}
      {unitQueue.length > 0 && (
        <div className='panel' style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
          <div className='panel-header' style={{ background: 'none', border: 'none', padding: '0 0 12px 0' }}>
            <h3 className="font-cinzel" style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: 700 }}>
              <i className='fa-solid fa-hourglass-half' style={{ marginRight: 8 }}></i>Training Queue ({unitQueue.length}/3)
            </h3>
          </div>
          <div className='panel-body' style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unitQueue.map((item, idx) => (
              <div key={idx} className="beveled-panel" style={{ 
                background: 'rgba(0,0,0,0.2)', 
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: 'var(--gold)', fontWeight: 800 }}>{item.count}x</div>
                  <div className="font-cinzel" style={{ color: 'var(--text-main)' }}>{item.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {idx === 0 ? `Next in: ${item.ticksRemaining}s` : 'Waiting...'}
                  </div>
                  {idx === 0 && (
                    <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${100 - (item.ticksRemaining / (item.ticksPerUnit || item.totalTicks) * 100)}%`, 
                        height: '100%', 
                        background: 'var(--gold)' 
                      }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Grounds Section */}
      <div className='panel' style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
        <div className='panel-header' style={{ background: 'none', border: 'none', padding: '0 0 12px 0' }}>
          <h3 className="font-cinzel" style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: 700 }}>
            <i className='fa-solid fa-swords' style={{ marginRight: 8 }}></i>Training Grounds
          </h3>
        </div>
        <div className='panel-body' style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {Object.values(UNIT_CONFIG).map(unit => {
              // Only show units that can be trained in this area's buildings
              const b = buildings.find(b => b.id === unit.requiredBuilding);
              const canTrain = b && b.level >= (unit.requiredBuildingLevel || 1);
              if (!canTrain) return null;

              const iconDef = UNIT_ICON_MAP[unit.id] || { icon: 'fa-person-rifle', color: 'var(--text-main)' };
              const count = recruitCounts[unit.id] || 0;

              return (
                <div key={unit.id} className="beveled-panel" style={{ 
                  background: 'var(--wood-medium)', 
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: 4, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: iconDef.color,
                      fontSize: '1.2rem'
                    }}>
                      <i className={`fa-solid ${iconDef.icon}`}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="font-cinzel" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{unit.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit.description}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(unit.cost).map(([res, amt]) => (
                      <div key={res} style={{ fontSize: '0.8rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                        {amt} {res}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                      {unit.trainingTime}s
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <input 
                      type="number" 
                      min="0"
                      value={count}
                      onChange={(e) => handleRecruitChange(unit.id, e.target.value)}
                      style={{ 
                        width: 60, 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid var(--wood-dark)', 
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 4
                      }}
                    />
                    <button 
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '4px 12px' }}
                      onClick={() => handleRecruit(unit.id)}
                      disabled={count <= 0 || unitQueue.length >= 3}
                    >
                      Train
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Military infrastructure is intentionally omitted here so the Military tab
          focuses on stationed forces only. Building management is handled in the
          main Management panel's category tabs (Extraction/Industry/Township/etc.). */}

    </div>
  );
}
