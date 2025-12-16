import React from 'react';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';

export default function BuildingPreview({ maxItems = 999 }) {
  const entries = Object.values(BUILDING_CONFIG).slice(0, maxItems);

  return (
    <div className="panel">
      <div className="panel-header">Building Preview</div>
      <div className="panel-body" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {entries.map(b => (
            <div key={b.id} className="building-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: '1.4rem' }}>{b.icon || '🏗'}</div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{b.displayName || b.name}</div>
                  <div style={{ fontSize: 12, color: '#bbb' }}>{b.description}</div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#ddd' }}>
                Cost: {Object.entries(b.baseCost || {}).map(([k,v]) => `${v} ${k}`).join(', ') || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
