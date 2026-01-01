import React, { useState, useEffect } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';
import { UNIT_ICON_MAP } from '../constants/iconMaps';
import { UNIT_CONFIG } from '../../core/config/units.js';
import { GameClient } from '../api/client';

export default function MilitaryPanel({ units, buildings, queue = [], onRecruit, onUpgrade, readOnly = false }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [recruitCounts, setRecruitCounts] = useState({});
  const [researchedTechs, setResearchedTechs] = useState([]);

  useEffect(() => {
    let mounted = true;
    const loadResearch = async () => {
      try {
        const r = await GameClient.getResearch();
        if (mounted && r && r.researched) {
          setResearchedTechs(r.researched);
        }
      } catch (e) {
        console.error('Failed to load research for MilitaryPanel', e);
      }
    };
    loadResearch();
    return () => { mounted = false; };
  }, []);

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
  // Frontend local limit for queue UI disabling (keeps in sync with server default of 5)
  const QUEUE_LIMIT = 5;

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
                      {UNIT_CONFIG[type]?.carryCapacity > 0 && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 600 }}>
                          <i className="fa-solid fa-box-open" style={{ marginRight: 4 }}></i>
                          Capacity: {UNIT_CONFIG[type].carryCapacity}
                        </div>
                      )}
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
                <i className='fa-solid fa-hourglass-half' style={{ marginRight: 8 }}></i>Training Queue ({unitQueue.length}/{QUEUE_LIMIT})
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
              // Evaluate requirements
              const b = buildings.find(b => b.id === unit.requiredBuilding);
              const hasBuilding = !!b;
              const buildingLevelOk = b && b.level >= (unit.requiredBuildingLevel || 1);
              const researchOk = !unit.requiredResearch || researchedTechs.includes(unit.requiredResearch);
              
              const isLocked = !buildingLevelOk || !researchOk;
              
              // If the building doesn't exist at all in this area, we still hide it to avoid cluttering
              // unless it's a very basic unit (tier 1)
              if (!hasBuilding && unit.tier > 1) return null;

              const iconDef = UNIT_ICON_MAP[unit.id] || { icon: 'fa-person-rifle', color: 'var(--text-main)' };
              const count = recruitCounts[unit.id] || 0;

              return (
                <div key={unit.id} className="beveled-panel" style={{ 
                  background: isLocked ? 'rgba(45, 27, 13, 0.6)' : 'var(--wood-medium)', 
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  opacity: isLocked ? 0.8 : 1,
                  border: isLocked ? '1px solid #5c4033' : '1px solid rgba(255,215,0,0.1)'
                }}>
                  {isLocked && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      color: '#ff5252', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase',
                      background: 'rgba(0,0,0,0.4)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid rgba(255,82,82,0.3)'
                    }}>
                      <i className="fa-solid fa-lock" style={{ marginRight: 4 }}></i>
                      Locked
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 40, height: 40, 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: 4, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isLocked ? '#8d6e63' : iconDef.color,
                      fontSize: '1.2rem'
                    }}>
                      <i className={`fa-solid ${iconDef.icon}`}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="font-cinzel" style={{ fontWeight: 700, color: isLocked ? '#8d6e63' : 'var(--text-main)' }}>{unit.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit.description}</div>
                    </div>
                  </div>

                  {/* Requirements Display for Locked Units */}
                  {isLocked && (
                    <div style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      padding: '8px', 
                      borderRadius: 4, 
                      fontSize: '0.75rem',
                      border: '1px solid rgba(255,215,0,0.05)'
                    }}>
                      <div style={{ color: '#8d6e63', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', fontSize: '0.65rem' }}>Requirements:</div>
                      {!buildingLevelOk && (
                        <div style={{ color: hasBuilding ? '#e57373' : '#8d6e63', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className={`fa-solid ${hasBuilding ? 'fa-circle-xmark' : 'fa-circle-minus'}`}></i>
                          {unit.requiredBuilding} Level {unit.requiredBuildingLevel || 1}
                        </div>
                      )}
                      {!researchOk && (
                        <div style={{ color: '#e57373', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fa-solid fa-circle-xmark"></i>
                          Research: {unit.requiredResearch}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, opacity: isLocked ? 0.5 : 1 }}>
                    {Object.entries(unit.cost).map(([res, amt]) => (
                      <div key={res} style={{ fontSize: '0.8rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                        {amt} {res}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                      {unit.trainingTime}s
                    </div>
                  </div>

                  {!readOnly && !isLocked && (
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
                        disabled={unitQueue.length >= QUEUE_LIMIT}
                      />
                      <button 
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '4px 12px' }}
                        onClick={() => handleRecruit(unit.id)}
                        disabled={count <= 0 || unitQueue.length >= QUEUE_LIMIT}
                      >
                        Train
                      </button>
                    </div>
                  )}
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
