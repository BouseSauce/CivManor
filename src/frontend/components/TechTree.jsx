import React, { useEffect, useState } from 'react';
import { BUILDING_PREREQS, BUILDING_CONFIG } from '../../core/config/buildings.js';
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
  const [researchState, setResearchState] = useState({ researched: [], active: null });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await GameClient.getResearch();
        if (mounted) setResearchState(r || { researched: [], active: null });
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
