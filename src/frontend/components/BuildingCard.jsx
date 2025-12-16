import React from 'react';
import { getColorForIconClass, getIconForResource } from '../constants/iconMaps';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';

export default function BuildingCard({ b, onOpen, onAssign, onUpgrade, compact = false }) {
  const renderIcon = (icon) => {
    if (!icon) return '🏗';
    if (icon.startsWith('fa-')) {
      // Color heuristics based on icon name
      const name = icon.toLowerCase();
      let color = 'var(--accent-gold)';
      color = getColorForIconClass(name);
      return <i className={icon} style={{ fontSize: '1.2rem', color }}></i>;
    }
    return icon;
  };

  const iconClass = b.icon || (BUILDING_CONFIG[b.id] && BUILDING_CONFIG[b.id].icon) || null;
  const desc = b.description || (BUILDING_CONFIG[b.id] && BUILDING_CONFIG[b.id].description) || 'No description available.';

  const isBuilt = b.level && b.level > 0;
    if (compact) {
    return (
      <div className={`building-card compact ${b.isLocked ? 'locked' : ''}`} style={{ cursor: 'pointer', padding: 10, minWidth: 200 }} onClick={() => onOpen && onOpen(b)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            {renderIcon(iconClass)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700, color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.displayName || b.name}</div>
              {!b.isLocked && <div style={{ fontSize: '0.75rem', color: '#ccc', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>Lvl {b.level || 0}</div>}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>{desc.split('.')[0]}{(desc.split('.')[0] || '').length > 0 ? '.' : ''}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
              {(Object.entries(b.upgradeCost || {})).slice(0,2).map(([res, amt]) => {
                const def = getIconForResource(res) || { icon: 'fa-box', color: '#bfbfbf' };
                return (
                  <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                    <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: '0.9rem' }} />
                    <div style={{ fontWeight: 700, color: '#ddd', fontSize: '0.9rem' }}>{amt}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className={`btn ${(!b.isLocked && !(b.isUpgrading)) ? 'btn-build' : ''}`}
                style={(!b.isLocked && !(b.isUpgrading)) ? { background: 'linear-gradient(0deg,#6bbf66,#58a74f)', color: '#081005' } : {}}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (!b.isLocked && onUpgrade) onUpgrade(b.id); }}
                disabled={b.isLocked || b.isUpgrading}
              >
                {b.level && b.level > 0 ? 'Upgrade' : 'Build'}
              </button>
              {/* Assign button removed from compact card per UX request */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`building-card ${b.isLocked ? 'locked' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onOpen && onOpen(b)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            {renderIcon(iconClass)}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#eee', fontFamily: 'var(--font-header)' }}>
              {b.displayName || b.name}
              {b.isLocked && (
                <span title={(b.missingReqs || []).join('\n')}
                      style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--accent-red)' }}>🔒</span>
              )}
            </h3>
            {b.description && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(() => {
                  const text = desc || '';
                  const first = text.split('.')[0];
                  if (!first) return 'No description available.';
                  return first.length > 120 ? first.slice(0, 117) + '...' : first;
                })()}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!b.isLocked && <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '2px', fontSize: '0.75rem', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)' }}>Lvl {b.level}</div>}
          {/* Assigned badge */}
          {/* Assigned/villager capacity removed from building card to simplify UI */}
        </div>
      </div>

      {b.isLocked ? (
        <div>
          <div style={{ color: 'var(--accent-red)', fontSize: '0.9rem', fontWeight: '700' }}>LOCKED</div>
          {b.missingReqs && b.missingReqs.length > 0 && (
            <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: '600', color: '#e0cda0' }}>Missing:</div>
              {b.missingReqs.map((m, i) => (
                <div key={i} style={{ color: 'var(--text-muted)' }}>{m}</div>
              ))}
            </div>
          )}
        </div>
      ) : b.isUpgrading ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--accent-green)' }}>Upgrading...</span>
            <span>{b.progress}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${b.progress}%`, backgroundColor: 'var(--accent-green)' }}></div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(Object.entries(b.upgradeCost || {})).map(([res, amt]) => {
              // Use same icon mapping as resource row
              const def = getIconForResource(res) || { icon: 'fa-box', color: '#bfbfbf' };
              return (
                <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.03)', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <i className={`fa-solid ${def.icon}`} style={{ color: def.color }} />
                  <span style={{ fontWeight: 700, color: '#eee' }}>{amt}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${isBuilt ? '' : 'btn-build'}`}
              style={(!b.isLocked && !b.isUpgrading && !isBuilt) ? { background: 'linear-gradient(0deg,#6bbf66,#58a74f)', color: '#081005', flex: 1 } : { flex: 1 }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); if (!b.isLocked && onUpgrade) onUpgrade(b.id); }}
              disabled={b.isLocked || b.isUpgrading}
            >
              {isBuilt ? 'Upgrade' : 'Build'}
            </button>
            {/* Assign button removed from card view per UX request */}
          </div>
        </div>
      )}
    </div>
  );
}
