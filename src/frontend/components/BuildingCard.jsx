import React from 'react';
import { getColorForIconClass, getIconForResource } from '../constants/iconMaps';
import { BUILDING_CONFIG, computeTotalLevelCost, computeTotalProductionExtraction } from '../../core/config/buildings.js';

export default function BuildingCard({ b, onOpen, onAssign, onUpgrade, compact = false, openResearchModal, hasResearch, area }) {
  // Hide Citadel Watch until Citadel Foundations exists in config
  if (b && b.id === 'CitadelWatch' && !BUILDING_CONFIG['CitadelFoundations']) return null;

  const renderIcon = (icon, isLocked) => {
    if (!icon) return '🏗';
    const filter = isLocked ? 'grayscale(100%)' : 'none';
    if (icon.startsWith('fa-')) {
      // Color heuristics based on icon name
      const name = icon.toLowerCase();
      let color = 'var(--accent-gold)';
      color = getColorForIconClass(name);
      return <i className={icon} style={{ fontSize: '1.5rem', color, filter }}></i>;
    }
    return <span style={{ filter }}>{icon}</span>;
  };

  const iconClass = b.icon || (BUILDING_CONFIG[b.id] && BUILDING_CONFIG[b.id].icon) || null;
  const cfg = BUILDING_CONFIG[b.id] || {};
  const desc = b.description || cfg.description || 'No description available.';
  
  // Flavor text (first sentence)
  const flavorText = desc.split('.')[0] + '.';
  
  // Production benefit per level
  const productionBenefit = (() => {
    const nextLevel = (b.level || 0) + 1;
    const prod = computeTotalProductionExtraction(b.id, nextLevel) || {};
    const entries = Object.entries(prod);
    if (entries.length === 0) return null;
    // Do not show production lines for Storehouse (it doesn't 'produce' resources)
    const suppressed = new Set(['Storehouse']);
    if (suppressed.has(b.id)) return null;
    return entries.map(([k, v]) => {
        const label = k.replace(/PerHour|PerLevel|PerWorker/i, '').replace(/([A-Z])/g, ' $1').trim();
        const num = (typeof v === 'number' && isFinite(v)) ? Math.round(v) : Number(v) || 0;
        return `${num.toLocaleString()} ${label}/hr`;
    }).join(', ');
  })();

  const isBuilt = b.level && b.level > 0;
  // Prefer authoritative assignment counts from the latest fetched area snapshot when available
  const liveArea = (typeof window !== 'undefined' && window.__lastFetchedArea && window.gameState && window.gameState.activeAreaID && window.__lastFetchedArea[window.gameState.activeAreaID]) ? window.__lastFetchedArea[window.gameState.activeAreaID] : null;
  
  const assignedCount = (() => {
    if (!liveArea || !liveArea.assignments) {
      return (b && typeof b.assigned === 'number' ? b.assigned : 0) + (b && typeof b.assignedPlanks === 'number' ? b.assignedPlanks : 0);
    }
    // Sum all assignments that match this building ID or are sub-roles of it (e.g. LoggingCamp:Planks)
    return Object.entries(liveArea.assignments).reduce((acc, [k, v]) => {
      if (k === b.id || k.startsWith(b.id + ':')) {
        return acc + (v || 0);
      }
      return acc;
    }, 0);
  })();
  
  const getStatusBadge = () => {
    // Do not show any status badges for buildings that are not yet built
    if (!isBuilt) return null;
    // Completely hide status for utility buildings that have no output
    const hideStatusFor = new Set(['Storehouse']);
    if (hideStatusFor.has(b.id)) return null;
    if (b.isUpgrading || b.isQueued) return <div className="badge badge-upgrading font-cinzel">Upgrading</div>;
    if (assignedCount > 0) return <div className="badge badge-active font-cinzel">Active ({assignedCount})</div>;
    return <div className="badge badge-idle font-cinzel">Idle</div>;
  };

  if (compact) {
    const next = (b && b.upgradeCost && Object.keys(b.upgradeCost).length > 0) ? b.upgradeCost : (computeTotalLevelCost(b.id, (b.level || 0) + 1) || {});
    const canAfford = Object.entries(next).every(([res, amt]) => (liveArea?.resources?.[res] || 0) >= amt);
    
    return (
      <div 
        className={`standard-card compact ${b.isLocked ? 'locked' : ''} ${canAfford && !b.isLocked && !b.isUpgrading && !b.isQueued ? 'glow-card' : ''} tooltip-container`} 
        onClick={() => onOpen && onOpen(b)}
        style={{ padding: '12px', minHeight: '180px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Cartoonish Tooltip */}
        <div className="cartoon-tooltip">
            <div className="tooltip-flavor font-garamond">{flavorText}</div>
            {productionBenefit && (
                <div className="tooltip-benefit font-garamond">
                    <strong>Benefit:</strong> {productionBenefit}
                </div>
            )}
        </div>

        {/* Header Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 8, flex: 1 }}>
            {/* Icon */}
            <div className="beveled-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 4, background: 'var(--wood-medium)' }}>
                {renderIcon(iconClass, b.isLocked)}
            </div>

            {/* Name & Level */}
            <div style={{ textAlign: 'center', width: '100%' }}>
                <div className="font-cinzel" style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.displayName || b.name}
                </div>
                {!b.isLocked && isBuilt && (
                    <div className="badge badge-level font-cinzel" style={{ marginTop: 4, fontSize: '0.7rem' }}>Lvl {b.level}</div>
                )}
            </div>

            {/* Production Line (Unlocked Only) */}
            {!b.isLocked && productionBenefit && (
                <div className="production-line font-garamond" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Produces: {productionBenefit.split(',')[0]}
                </div>
            )}

            {/* Status Badge (Unlocked Only) */}
            {!b.isLocked && (
              <div style={{ marginTop: 4 }}>
                {getStatusBadge()}
              </div>
            )}
        </div>

        {/* Content Section: Requirements or Costs */}
        <div style={{ width: '100%', marginTop: 'auto', paddingTop: 12 }}>
            {b.isLocked ? (
                <div className="requirement-box">
                    <div className="req-header font-cinzel">Unlock Requirements</div>
                    <div className="req-list font-garamond">
                        {(() => {
                            const req = cfg.requirement;
                            if (!req) return <div className="req-item unmet">Unknown Requirement</div>;
                            
                            const reqs = [];
                            
                            // Town Hall Requirement
                            if (req.building === 'TownHall') {
                                const th = (area?.buildings || []).find(x => x.id === 'TownHall');
                                const met = (th?.level || 0) >= req.level;
                                reqs.push({
                                    label: `Town Hall Lvl ${req.level}`,
                                    met
                                });
                            } 
                            // Other Building Requirement
                            else if (req.building) {
                                const target = (area?.buildings || []).find(x => x.id === req.building);
                                const met = (target?.level || 0) >= (req.level || 1);
                                const targetName = BUILDING_CONFIG[req.building]?.displayName || req.building;
                                reqs.push({
                                    label: `${targetName} Lvl ${req.level || 1}`,
                                    met
                                });
                            }
                            // Quest/Item Requirement (Generic fallback)
                            else {
                                reqs.push({
                                    label: 'Special Event / Quest',
                                    met: false // Usually handled by game logic unlocking it
                                });
                            }

                            return reqs.map((r, i) => (
                                <div key={i} className={`req-item ${r.met ? 'met' : 'unmet'}`}>
                                    {r.met ? <i className="fas fa-check-circle"></i> : <i className="fas fa-times-circle"></i>}
                                    {r.label}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '8px', 
                    width: '100%'
                }}>
                    {Object.entries(next).slice(0,4).map(([res, amt]) => {
                        const def = getIconForResource(res) || { icon: 'fa-box', color: '#bfbfbf' };
                        return (
                            <div key={res} className="beveled-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: '0.9rem' }} />
                                <div className="font-garamond" style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>{amt}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className={`standard-card ${b.isLocked ? 'locked' : ''} tooltip-container`} style={{ cursor: 'pointer', position: 'relative', minHeight: 150, boxSizing: 'border-box' }} onClick={() => onOpen && onOpen(b)}>
      {/* Cartoonish Tooltip */}
      <div className="cartoon-tooltip">
          <div className="tooltip-flavor font-garamond">{flavorText}</div>
          {productionBenefit && (
              <div className="tooltip-benefit font-garamond">
                  <strong>Benefit:</strong> {productionBenefit}
              </div>
          )}
      </div>

      {b.isLocked && (
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

      {hasResearch && openResearchModal && !b.isLocked && (
        <div 
          onClick={(e) => { e.stopPropagation(); openResearchModal(b.id); }}
          style={{ 
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            cursor: 'pointer', 
            color: 'var(--accent-gold)', 
            padding: '6px', 
            borderRadius: 4, 
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--wood-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Open Research"
        >
          <i className="fas fa-scroll"></i>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="beveled-panel" style={{ width: 52, height: 52, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--wood-medium)', borderRadius: 8 }}>
            {renderIcon(iconClass, b.isLocked)}
          </div>
          <div>
            <h3 className="font-cinzel" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>
              {b.displayName || b.name}
            </h3>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {!b.isLocked && isBuilt && <div className="badge badge-level font-cinzel">Lvl {b.level}</div>}
          {getStatusBadge()}
        </div>
      </div>

      {b.isLocked ? (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
          <div className="requirement-box" style={{ marginBottom: 12 }}>
            {(() => {
                const req = cfg.requirement;
                if (!req) return null;
                if (req.building === 'TownHall') {
                    const th = (area?.buildings || []).find(x => x.id === 'TownHall');
                    const met = (th?.level || 0) >= req.level;
                    return (
                        <div className={`req-item ${met ? 'met' : 'unmet'} font-garamond`} style={{ fontSize: '0.9rem', padding: '8px 12px' }}>
                            {met ? <i className="fas fa-check-circle"></i> : <i className="fas fa-times-circle"></i>}
                            Requires Town Hall Lvl {req.level}
                        </div>
                    );
                }
                return (
                    <div className="req-item unmet font-garamond" style={{ fontSize: '0.9rem', padding: '8px 12px' }}>
                        <i className="fas fa-times-circle"></i>
                        Requirements not met
                    </div>
                );
            })()}
          </div>
          <button className="btn font-cinzel" disabled style={{ width: '100%', background: '#555', color: '#888', cursor: 'not-allowed' }}>
            LOCKED
          </button>
        </div>
      ) : b.isUpgrading ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            <span className="font-cinzel" style={{ color: '#4caf50', fontWeight: 700 }}>Upgrading...</span>
            <span className="font-garamond" style={{ color: 'var(--text-main)', fontWeight: 700 }}>{b.progress}%</span>
          </div>
          <div className="progress-bar-bg" style={{ height: 10, borderRadius: 5 }}>
            <div className="progress-bar-fill" style={{ width: `${b.progress}%`, backgroundColor: '#4caf50', height: '100%' }}></div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
          <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '6px 12px',
              flex: 1,
              marginRight: 16
          }}>
            {(() => {
              const next = (b && b.upgradeCost && Object.keys(b.upgradeCost).length > 0) ? b.upgradeCost : (computeTotalLevelCost(b.id, (b.level || 0) + 1) || {});
              return Object.entries(next).slice(0,4).map(([res, amt]) => {
                const def = getIconForResource(res) || { icon: 'fa-box', color: '#bfbfbf' };
                return (
                  <div key={res} className="beveled-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255,255,255,0.05)' }}>
                    <i className={`fa-solid ${def.icon} fa-lg`} style={{ color: def.color }} />
                    <div className="font-garamond" style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>{amt}</strong></div>
                  </div>
                );
              });
            })()}
          </div>

          <button
            className={`btn font-cinzel ${(!b.isLocked && !(b.isUpgrading) && !b.isQueued) ? 'btn-build' : ''} ${(() => {
              const next = (b && b.upgradeCost && Object.keys(b.upgradeCost).length > 0) ? b.upgradeCost : (computeTotalLevelCost(b.id, (b.level || 0) + 1) || {});
              const canAfford = Object.entries(next).every(([res, amt]) => (liveArea?.resources?.[res] || 0) >= amt);
              return canAfford && !b.isLocked && !b.isUpgrading && !b.isQueued ? 'glow-button' : '';
            })()}`}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); if (!b.isLocked && !b.isQueued && onUpgrade) onUpgrade(b.id); }}
            disabled={b.isLocked || b.isUpgrading || b.isQueued}
            style={{ minWidth: '120px' }}
          >
            {b.isUpgrading ? 'Upgrading' : (b.isQueued ? 'Queued' : (b.level && b.level > 0 ? 'Upgrade' : 'Build'))}
          </button>
        </div>
      )}
    </div>
  );
}
