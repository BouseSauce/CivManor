import React from 'react';
import { getIconForResource, getColorForIconClass } from '../constants/iconMaps';
import { GAME_CONFIG } from '../../core/config/gameConfig.js';
import { checkRequirements } from '../../core/validation/requirements.js';

export default function ResearchCard({ id, def = {}, researched = false, active = null, onStart, area, researchedList = [], techLevels = {} }) {
  const [tick, setTick] = React.useState(0);
  const costEntries = Object.entries(def.cost || def.baseCost || {});
  const inProgress = active && active.techId === id;

  React.useEffect(() => {
    if (!inProgress) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [inProgress]);
  
  // Determine if this research should be startable from the UI.
  const isExplicitStartable = typeof def.startable !== 'undefined' ? !!def.startable : null;
  const isStartable = (isExplicitStartable === null) ? (!!def.durationSeconds || def.type === 'Infinite') : isExplicitStartable;

  // Use centralized requirement checker
  const playerState = {
    techLevels: techLevels || {},
    buildingLevels: area?.buildings?.reduce((acc, b) => ({ ...acc, [b.id]: b.level }), {}) || {}
  };
  const reqCheck = checkRequirements(id, playerState);
  const isLocked = !reqCheck.unlocked;

  const canAfford = costEntries.every(([res, amt]) => (area?.resources?.[res] || 0) >= amt);
  
  const isInfinite = def.type === 'Infinite';
  const currentLevel = techLevels[id] || 0;
  const isMaxLevel = def.maxLevel && (currentLevel >= def.maxLevel);
  const isCompleted = researched && !isInfinite;
  const isAvailable = !isLocked && (!researched || isInfinite) && !isMaxLevel && !inProgress && isStartable && !active;

  const flavorText = (def.description || 'No description available.').split('.')[0] + '.';
  const iconClass = def.icon || 'fa-flask';
  const iconColor = getColorForIconClass(iconClass);

  const getStatusBadge = () => {
    if (isInfinite && currentLevel > 0) return <div className="badge badge-active font-cinzel" style={{ background: '#2e7d32' }}>Level {currentLevel}</div>;
    if (isCompleted) return <div className="badge badge-active font-cinzel" style={{ background: '#2e7d32' }}>Completed</div>;
    if (inProgress) return <div className="badge badge-upgrading font-cinzel">Researching</div>;
    if (isLocked) return <div className="badge badge-idle font-cinzel" style={{ background: '#c62828' }}>Locked</div>;
    return <div className="badge badge-idle font-cinzel">Available</div>;
  };

  const showLockedOverlay = isLocked && !researched && !inProgress;

  return (
    <div 
      className={`standard-card compact ${isLocked ? 'locked' : ''} ${isAvailable && canAfford ? 'glow-card' : ''} tooltip-container`} 
      style={{ 
        cursor: isAvailable ? 'pointer' : 'default', 
        position: 'relative', 
        minHeight: '180px', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '12px',
        filter: isLocked ? 'grayscale(100%)' : 'none',
        opacity: isLocked ? 0.7 : 1
      }} 
      onClick={() => isAvailable && onStart && onStart(id)}
    >
      {/* Cartoonish Tooltip */}
      <div className="cartoon-tooltip">
          <div className="tooltip-flavor font-garamond">{flavorText}</div>
          {def.description && <div className="tooltip-benefit font-garamond" style={{ marginTop: 8 }}>{def.description}</div>}
          
          {isLocked && reqCheck.missing.length > 0 && (
              <div className="tooltip-requirements font-garamond" style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 8 }}>
                  <div style={{ fontWeight: 'bold', color: '#c62828', marginBottom: 4 }}>Locked: {def.name || id}</div>
                  {reqCheck.missing.map(m => (
                      <div key={m.id} style={{ fontSize: '0.85rem', color: '#8b0000' }}>
                          Requires {m.id} Level {m.level} (Current: {playerState[m.type === 'tech' ? 'techLevels' : 'buildingLevels'][m.id] || 0})
                      </div>
                  ))}
              </div>
          )}

          {/* Special case for Tenements: Show next level effect */}
          {id === 'Tenements' && (
              <div className="tooltip-benefit font-garamond" style={{ marginTop: 8, color: '#7cc576', fontWeight: 'bold' }}>
                  Next Level: +15% Growth Speed (Total: {(currentLevel + 1) * 15}%)
              </div>
          )}
      </div>

      {showLockedOverlay && (
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
                  {def.name || id} {currentLevel > 0 && <span style={{ color: 'var(--accent-gold)', fontSize: '0.9rem' }}>(Lvl {currentLevel})</span>}
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
                  {reqCheck.missing.map(m => (
                      <div key={m.id} className="req-item unmet font-garamond" style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                          <i className="fas fa-times-circle"></i> {m.id} Lvl {m.level}
                      </div>
                  ))}
              </div>
          ) : inProgress ? (
              <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span className="font-cinzel" style={{ color: '#4caf50', fontWeight: 700 }}>Researching...</span>
                      <span className="font-garamond" style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                          {(() => {
                              if (!active) return '0%';
                              const now = Date.now();
                              // Use totalTicks/durationSeconds from server, fallback to 1
                              const total = (active.totalTicks || active.durationSeconds || active.totalTime || 1) * 1000;
                              const elapsed = Math.min(now - active.startedAt, total);
                              const pct = Math.floor((elapsed / total) * 100);
                              return `${isNaN(pct) ? 0 : pct}%`;
                          })()}
                      </span>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                          width: (() => {
                              if (!active) return '0%';
                              const now = Date.now();
                              const total = (active.totalTicks || active.durationSeconds || active.totalTime || 1) * 1000;
                              const elapsed = Math.min(now - active.startedAt, total);
                              const pct = Math.floor((elapsed / total) * 100);
                              return `${isNaN(pct) ? 0 : pct}%`;
                          })(),
                          height: '100%', 
                          background: '#4caf50',
                          transition: 'width 0.5s linear'
                      }}></div>
                  </div>
                  {/* Time Remaining */}
                  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {(() => {
                          if (!active) return '';
                          const now = Date.now();
                          const total = (active.totalTicks || active.durationSeconds || active.totalTime || 1) * 1000;
                          const elapsed = Math.min(now - active.startedAt, total);
                          const remaining = Math.max(0, Math.ceil((total - elapsed) / 1000));
                          return `${remaining}s remaining`;
                      })()}
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
                      {isCompleted ? 'Completed' : (isInfinite && currentLevel > 0 ? `Research Lvl ${currentLevel + 1}` : 'Start Research')}
                  </button>
              </div>
          )}
      </div>
    </div>
  );
}
