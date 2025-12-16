import React, { useEffect, useState } from 'react';
import { BUILDING_PREREQS, BUILDING_CONFIG } from '../../core/config/buildings.js';
import { getIconForResource } from '../constants/iconMaps';
import { GameClient } from '../api/client';

export default function TechTree() {
  // Build a map of tech -> list of buildings
  const techMap = {};
  Object.entries(BUILDING_PREREQS).forEach(([bId, req]) => {
    if (req && req.tech) {
      if (!techMap[req.tech]) techMap[req.tech] = [];
      techMap[req.tech].push(bId);
    }
  });

  const techs = Object.keys(techMap);
  const [researchState, setResearchState] = useState({ researched: [], active: null, defs: {} });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await GameClient.getResearch();
        if (mounted) setResearchState(r || { researched: [], active: null, defs: {} });
      } catch (e) { console.error(e); }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const start = async (techId) => {
    try {
      const r = await GameClient.startResearch(techId);
      if (r && r.success) setResearchState(prev => ({ ...prev, active: r.active }));
      else alert('Failed to start research');
    } catch (e) { alert('Start research error'); }
  };

  return (
    <div className="panel">
      <div className="panel-header">Research & Tech</div>
      <div className="panel-body" style={{ padding: 12 }}>
        {techs.length === 0 && <div>No techs configured.</div>}
        {techs.map(t => (
          <div key={t} style={{ marginBottom: 12 }} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{t}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Unlocks: {techMap[t].map(id => BUILDING_CONFIG[id]?.displayName || id).join(', ')}</div>
                {/* Show cost and requirements if available from defs */}
                {researchState.defs && researchState.defs[t] && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {Object.entries(researchState.defs[t].cost || {}).map(([res, amt]) => {
                      const icon = getIconForResource(res) || { icon: 'fa-box', color: '#bbb' };
                      return (
                        <div key={res} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                          <i className={`fa-solid ${icon.icon}`} style={{ color: icon.color }} />
                          <div style={{ fontWeight: 700, color: '#ddd' }}>{amt}</div>
                          <div style={{ color: '#999', fontSize: 12 }}>{res}</div>
                        </div>
                      );
                    })}
                    {researchState.defs[t].requiredTownLevel && (
                      <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: 12, color: '#e0cda0' }}>Requires TownHall Lvl {researchState.defs[t].requiredTownLevel}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                {researchState.researched && researchState.researched.includes(t) ? (
                  <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>Researched</div>
                ) : researchState.active && researchState.active.techId === t ? (
                  <div style={{ color: '#aaa' }}>In Progress</div>
                ) : (
                  <button className="btn btn-primary" onClick={() => start(t)}>Start</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
