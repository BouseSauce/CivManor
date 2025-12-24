import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';

export default function ResearchStrip() {
  const [research, setResearch] = useState({ active: null });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await GameClient.getResearch();
        if (mounted) setResearch(res || { active: null });
      } catch (e) {
        console.error('Failed to load research', e);
      }
    };
    load();
    const t = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  if (!research || !research.active) {
    return (
      <div className="beveled-panel" style={{ margin: '0 0 10px 0', padding: '10px', textAlign: 'center', color: '#888' }}>
        <span className="font-garamond" style={{ fontSize: '1.1em', color: '#aaa' }}>No active research</span>
      </div>
    );
  }

  const active = research.active;
  const now = Date.now();
  const total = active.durationSeconds * 1000;
  const elapsed = Math.min(now - active.startedAt, total);
  const pct = Math.floor((elapsed / total) * 100);

  return (
    <div className="beveled-panel" style={{ margin: '0 0 10px 0', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div className="font-cinzel" style={{ color: '#e0cda0', fontSize: '1.1em' }}>
          <i className="fa-solid fa-flask" style={{ marginRight: '8px', color: '#aaffaa' }}></i>
          {active.techId}
        </div>
        <div className="font-garamond" style={{ color: '#ccc', fontSize: '1.1em' }}>
          {Math.max(0, Math.ceil((active.completesAt - now)/1000))}s remaining
        </div>
      </div>
      <div className="progress-bar-bg" style={{ height: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px' }}>
        <div className="progress-bar-fill" style={{ 
          width: `${pct}%`, 
          height: '100%', 
          background: 'linear-gradient(90deg, #2e7d32, #66bb6a)',
          borderRadius: '3px'
        }} />
      </div>
    </div>
  );
}
