import React from 'react';
import { getIconForResource } from '../constants/iconMaps';

export default function ResourceRow({ resources = {} }) {
  const items = Object.entries(resources || {});
  return (
    <div className="resource-row" style={{ display: 'flex', gap: 16, padding: '8px 16px', alignItems: 'center', overflowX: 'auto' }}>
      {items.map(([key, val]) => {
        const def = getIconForResource(key) || { icon: 'fa-box', color: '#bfbfbf' };
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
            <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: '0.95rem', textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}></i>
            <div style={{ fontSize: '0.9rem', color: '#ddd', fontFamily: 'var(--font-body)' }}>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{Math.floor(val || 0).toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
