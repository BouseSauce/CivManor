import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';
import ResearchCard from './ResearchCard';

export default function ResearchPanel({ area, onRefresh }) {
  const [researchState, setResearchState] = useState({ researched: [], active: null, available: [], defs: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await GameClient.getResearch();
        if (mounted) setResearchState(res || { researched: [], active: null, available: [], defs: {} });
      } catch (e) { console.error('Failed to load research', e); }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(t); };
  }, [area && area.id]);

  // Build list of tech ids related to this area (from buildings.relatedTechs)
  const areaTechIds = (() => {
    const set = new Set();
    (area.buildings || []).forEach(b => { (b.relatedTechs || []).forEach(t => { if (!t) return; set.add(typeof t === 'string' ? t : (t.id || t.name)); }); });
    return Array.from(set);
  })();

  const start = async (techId) => {
    setLoading(true);
    try {
      await GameClient.startResearch(techId);
      if (onRefresh) onRefresh();
      const res = await GameClient.getResearch();
      setResearchState(res || researchState);
    } catch (e) { alert(e && e.error ? e.error : (e && e.message) || 'Failed to start research'); }
    setLoading(false);
  };

  const { researched = [], active = null, defs = {} } = researchState;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Related Research</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {areaTechIds.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No related research for this area.</div>}
        {areaTechIds.map(tid => (
          <ResearchCard
            key={tid}
            id={tid}
            def={defs[tid] || {}}
            researched={(researched || []).includes(tid)}
            active={active}
            onStart={start}
            area={area}
          />
        ))}
      </div>
    </div>
  );
}
