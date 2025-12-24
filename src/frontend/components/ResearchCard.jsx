import React from 'react';
import { getIconForResource, getColorForIconClass } from '../constants/iconMaps';
import { GAME_CONFIG } from '../../core/config/gameConfig.js';

export default function ResearchCard({ id, def = {}, researched = false, active = null, onStart, area, researchedList = [] }) {
  const costEntries = Object.entries(def.cost || def.baseCost || {});
  const inProgress = active && active.techId === id;
  
  // Determine if this research should be startable from the UI.
  const isExplicitStartable = typeof def.startable !== 'undefined' ? !!def.startable : null;
  const isStartable = (isExplicitStartable === null) ? (!!def.durationSeconds) : isExplicitStartable;

  // Determine locked state: if def.requiredTownLevel exists, require TownHall level in this area
  const requiredLvl = def.requiredTownLevel || (def.requirement?.building === 'TownHall' ? def.requirement.level : 0);
  const thObj = (area && area.buildings && Array.isArray(area.buildings)) ? area.buildings.find(b => b.id === 'TownHall') : null;
  const areaTownLevel = thObj ? (thObj.level || 0) : 0;
  const townHallMet = requiredLvl === 0 || (areaTownLevel >= requiredLvl);

  // Tech Prereqs
  const prereqs = (() => {
    if (!def || typeof def !== 'object') return [];
    if (Array.isArray(def.requiredTechs) && def.requiredTechs.length > 0) return def.requiredTechs;
    if (def.requirement && def.requirement.tech) return Array.isArray(def.requirement.tech) ? def.requirement.tech : [def.requirement.tech];
    if (def.required && Array.isArray(def.required)) return def.required;
    return [];
  })();
  const techPrereqsMet = prereqs.every(p => researchedList.includes(p));

  const isLocked = !townHallMet || !techPrereqsMet;
  const canAfford = costEntries.every(([res, amt]) => (area?.resources?.[res] || 0) >= amt);
  const isAvailable = !isLocked && !researched && !inProgress && isStartable;

  const flavorText = (def.description || 'No description available.').split('.')[0] + '.';
  const iconClass = def.icon || 'fa-flask';
  const iconColor = getColorForIconClass(iconClass);

  const getStatusBadge = () => {
    if (researched) return <div className="badge badge-active font-cinzel" style={{ background: '#2e7d32' }}>Completed</div>;
    if (inProgress) return <div className="badge badge-upgrading font-cinzel">Researching</div>;
    if (isLocked) return <div className="badge badge-idle font-cinzel" style={{ background: '#c62828' }}>Locked</div>;
    return <div className="badge badge-idle font-cinzel">Available</div>;
  };

  return (
    <div 
      className={`standard-card compact ${isLocked ? 'locked' : ''} ${isAvailable && canAfford ? 'glow-card' : ''} tooltip-container`} 
      style={{ cursor: isAvailable ? 'pointer' : 'default', position: 'relative', minHeight: '180px', display: 'flex', flexDirection: 'column', padding: '12px' }} 
      onClick={() => isAvailable && onStart && onStart(id)}
    >
      {/* Cartoonish Tooltip */}
      <div className="cartoon-tooltip">
          <div className="tooltip-flavor font-garamond">{flavorText}</div>
          {def.description && <div className="tooltip-benefit font-garamond" style={{ marginTop: 8 }}>{def.description}</div>}
      </div>

      {isLocked && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          borderRadius: 4,
          pointerEvents: 'none',
          backdropFilter: 'grayscale(100%)'
        }}>
          <div className="font-cinzel" style={{ 
            background: 'var(--wood-dark)', 
            color: 'var(--text-main)', 
            padding: '8px 20px', 
            borderRadius: 20, 
            fontSize: '0.9rem', 
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <i className="fa-solid fa-lock"></i> LOCKED
          </div>
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 8, flex: 1 }}>
          {/* Icon */}
          <div className="beveled-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 4, background: 'var(--wood-medium)' }}>
              <i className={`fa-solid ${iconClass}`} style={{ fontSize: '1.5rem', color: iconColor, filter: isLocked ? 'grayscale(100%)' : 'none' }}></i>
          </div>

          {/* Name & Status */}
          <div style={{ textAlign: 'center' }}>
              <h3 className="font-cinzel" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800, lineHeight: 1.2 }}>
                  {def.name || id}
              </h3>
              <div style={{ marginTop: 4 }}>
                  {getStatusBadge()}
              </div>
                            <div style={{ marginTop: 6, maxWidth: 220 }}>
                                <div className="font-garamond" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                                    {flavorText}
                                </div>
                            </div>
          </div>
      </div>

      {/* Requirements / Progress / Costs */}
      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {isLocked ? (
              <div className="requirement-box" style={{ marginBottom: 0 }}>
                  {!townHallMet && (
                      <div className="req-item unmet font-garamond" style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                          <i className="fas fa-times-circle"></i> Town Hall Lvl {requiredLvl}
                      </div>
                  )}
                  {prereqs.map(p => {
                      if (researchedList.includes(p)) return null;
                      return (
                          <div key={p} className="req-item unmet font-garamond" style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                              <i className="fas fa-times-circle"></i> {p}
                          </div>
                      );
                  })}
              </div>
          ) : inProgress ? (
              <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span className="font-cinzel" style={{ color: '#4caf50', fontWeight: 700 }}>Researching...</span>
                      <span className="font-garamond" style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                          {(() => {
                              if (!active) return '0%';
                              const now = Date.now();
                              const total = active.durationSeconds * 1000;
                              const elapsed = Math.min(now - active.startedAt, total);
                              return `${Math.floor((elapsed / total) * 100)}%`;
                          })()}
                      </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                        <div className="font-cinzel" style={{ 
                            background: 'var(--wood-dark)', 
                            color: 'var(--text-main)', 
                            padding: '8px 20px', 
                            borderRadius: 20, 
                            fontSize: '0.9rem', 
                            fontWeight: 800,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <i className="fa-solid fa-lock"></i> LOCKED
                        </div>

                        <div style={{ maxWidth: 260, textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>Requirements</div>
                            {!townHallMet && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <i className="fas fa-landmark" style={{ color: '#c5a059' }}></i>
                                    <div>Town Hall Lvl {requiredLvl}</div>
                                </div>
                            )}
                            {prereqs.filter(p => !researchedList.includes(p)).length === 0 ? (
                                <div style={{ opacity: 0.9 }}>Other requirements unmet</div>
                            ) : (
                                prereqs.filter(p => !researchedList.includes(p)).map(p => (
                                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <i className="fa-solid fa-flask" style={{ color: '#67b0ff' }}></i>
                                        <div>{p}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                  </div>
              </div>
          ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '4px',
                      width: '100%'
                  }}>
                      {costEntries.slice(0,4).map(([res, amt]) => {
                          const resDef = getIconForResource(res);
                          return (
                              <div key={res} className="beveled-panel" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}>
                                  <i className={`fa-solid ${resDef.icon}`} style={{ color: resDef.color, fontSize: '0.9rem' }} />
                                  <span className="font-garamond" style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>{amt}</span>
                              </div>
                          );
                      })}
                  </div>
                  <button
                      className={`btn font-cinzel ${isAvailable ? 'btn-build' : ''} ${canAfford && isAvailable ? 'glow-button' : ''}`}
                      onClick={(e) => { e.stopPropagation(); if (isAvailable && onStart) onStart(id); }}
                      disabled={!isAvailable}
                      style={{ width: '100%', padding: '6px 0', fontSize: '0.9rem' }}
                  >
                      {researched ? 'Completed' : 'Start Research'}
                  </button>
              </div>
          )}
      </div>
    </div>
  );
}
