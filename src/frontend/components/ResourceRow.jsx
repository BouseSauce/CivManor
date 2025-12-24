import React, { useEffect, useState } from 'react';
import { getIconForResource } from '../constants/iconMaps';
import { GAME_CONFIG } from '../../core/config/gameConfig.js';

export default function ResourceRow({ area = null, resources = null, capacities = {} }) {
  const resMap = resources || (area && area.resources) || {};
  const [ratesPerTick, setRatesPerTick] = useState({});

  useEffect(() => {
    const cb = (e) => {
      try {
        const d = e && e.detail;
        if (!d || !d.area) return;
        const newArea = d.area;
        const prev = d.prevSnapshot || null;
        const prevTs = d.prevTs || null;
        if (!prev || !prevTs) return; // need prior snapshot
        if (!area || newArea.id !== area.id) return;
        const nowTs = Date.now();
        const dt = Math.max(1, (nowTs - prevTs) / 1000); // seconds
        const rates = {};
        Object.keys(newArea.resources || {}).forEach(k => {
          const cur = Number(newArea.resources[k] || 0);
          const old = Number(prev.resources && prev.resources[k] ? prev.resources[k] : 0);
          const perSec = (cur - old) / dt;
          const perTick = perSec * (GAME_CONFIG.TICK_MS / 1000);
          rates[k] = perTick;
        });
        setRatesPerTick(rates);
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('area:fetched', cb);
    return () => window.removeEventListener('area:fetched', cb);
  }, [area]);

  const items = Object.entries(resMap || {});
  return (
    <div className="resource-row" style={{ display: 'flex', gap: 16, padding: '8px 16px', alignItems: 'center', overflowX: 'auto' }}>
      {items.map(([key, val]) => {
        const def = getIconForResource(key) || { icon: 'fa-box', color: '#bfbfbf' };
        const cap = capacities && capacities[key];
        const curStr = Math.floor(val || 0).toLocaleString();
        const capStr = (cap != null) ? Math.floor(cap).toLocaleString() : null;
        const rateTick = ratesPerTick && typeof ratesPerTick[key] !== 'undefined' ? ratesPerTick[key] : null;
        const rateDisplay = (rateTick != null) ? `${rateTick >= 0 ? '+' : ''}${Number(rateTick.toFixed(2))}/tick` : null;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
            <i className={`fa-solid ${def.icon}`} style={{ color: def.color, fontSize: '0.95rem', textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}></i>
            <div style={{ fontSize: '0.9rem', color: '#ddd', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{curStr}</span>
                {capStr && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {capStr}</span>}
              </div>
              {rateDisplay && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rateDisplay}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
