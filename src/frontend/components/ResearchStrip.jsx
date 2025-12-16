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
      <div style={{ padding: '6px 12px', color: '#888', borderBottom: '1px solid var(--panel-border)', background: '#141414' }}>
        No active research
      </div>
    );
  }

  const active = research.active;
  const now = Date.now();
  const total = active.durationSeconds * 1000;
  const elapsed = Math.min(now - active.startedAt, total);
  const pct = Math.floor((elapsed / total) * 100);

  return (
    <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--panel-border)', background: '#141414' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold' }}>{active.techId}</div>
        <div style={{ fontFamily: 'monospace' }}>{Math.max(0, Math.ceil((active.completesAt - now)/1000))}s</div>
      </div>
      <div className="progress-bar-bg" style={{ marginTop: 6 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
