import React from 'react';
import { getIconForResource } from '../constants/iconMaps';

export default function ResearchCard({ id, def = {}, researched = false, active = null, onStart, area }) {
  const costEntries = Object.entries(def.cost || {});
  const inProgress = active && active.techId === id;

  // Determine locked state: if def.requiredTownLevel exists, require TownHall level in this area
  const requiredLvl = def.requiredTownLevel || 0;
  // `area.buildings` is an array of building objects; find TownHall entry if present
  const thObj = (area && area.buildings && Array.isArray(area.buildings)) ? area.buildings.find(b => b.id === 'TownHall') : null;
  const areaTownLevel = thObj ? (thObj.level || 0) : 0;
  const isLocked = requiredLvl > 0 && (areaTownLevel < requiredLvl);

  return (
    <div style={{ width: 320, padding: 12, borderRadius: 8, background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="fa-solid fa-flask" style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }} />
          <div style={{ fontWeight: 800, color: '#eee' }}>{id}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isLocked && <div style={{ color: 'var(--accent-red)', fontWeight: 700 }}>LOCKED</div>}
          {!isLocked && researched && <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>Researched</div>}
          {!isLocked && inProgress && <div style={{ fontSize: 12, color: 'var(--accent-gold)' }}>In progress</div>}
        </div>
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>{def.description || 'No description available.'}</div>

      {isLocked && (
        <div style={{ marginBottom: 10, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: '#e0cda0', marginBottom: 6 }}>Requirements</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Requires Settlement (TownHall) level {requiredLvl} in this area.</div>
        </div>
      )}

      {costEntries.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {costEntries.map(([res, amt]) => {
            const defIcon = getIconForResource(res) || { icon: 'fa-box', color: '#bbb' };
            return (
              <div key={res} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                <i className={`fa-solid ${defIcon.icon}`} style={{ color: defIcon.color }} />
                <div style={{ fontWeight: 700, color: '#ddd' }}>{amt}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{res}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{def.durationSeconds ? `${def.durationSeconds}s` : ''}</div>
        <div>
          {isLocked && <button className="btn" disabled style={{ opacity: 0.6 }}>Locked</button>}
          {!isLocked && !researched && !inProgress && (
            <button className="btn btn-build" style={{ background: 'linear-gradient(0deg,#6bbf66,#58a74f)', color: '#081005' }} onClick={() => onStart && onStart(id)}>Start</button>
          )}
          {!isLocked && inProgress && <button className="btn" disabled>Working</button>}
          {!isLocked && researched && <button className="btn" disabled>Done</button>}
        </div>
      </div>
    </div>
  );
}
