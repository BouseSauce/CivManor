import React, { useState, useEffect } from 'react';
import { GameClient } from '../api/client';
import { RESEARCH_DEFS } from '../../core/config/research.js';

const GlobalResearchWidget = ({ onClick }) => {
  const [activeResearch, setActiveResearch] = useState(null);
  const [researchName, setResearchName] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await GameClient.getResearch();
        if (!mounted) return;
        
        if (res && res.active) {
          setActiveResearch(res.active);
          setCurrentLevel((res.techLevels && res.techLevels[res.active.techId]) || 0);
          // Find name
          let name = 'Unknown Tech';
          let dur = 60;
          for (const group of Object.values(RESEARCH_DEFS)) {
            if (group[res.active.techId]) {
              name = group[res.active.techId].name;
              dur = group[res.active.techId].durationSeconds;
              break;
            }
          }
          setResearchName(name);
          setDuration(dur);
        } else {
          setActiveResearch(null);
        }
      } catch (e) { console.error(e); }
    };
    
    load();
    const interval = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!activeResearch) return null;

  const progress = Math.min(100, Math.max(0, 100 - ((activeResearch.completesAt - Date.now()) / (duration * 1000)) * 100));

  return (
    <div 
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 2000,
        background: 'var(--wood-dark)',
        border: '2px solid var(--wood-light)',
        borderRadius: 8,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        transition: 'transform 0.2s',
        minWidth: 200
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ 
        width: 40, height: 40, 
        borderRadius: '50%', 
        background: 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--wood-medium)',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2)'
      }}>
        <i className="fas fa-scroll" style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }}></i>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div className="font-cinzel" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold', letterSpacing: 0.5 }}>
          {researchName} {currentLevel > 0 && <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>(Lvl {currentLevel})</span>}
        </div>
        <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, var(--ember), #ff8f00)',
            transition: 'width 1s linear',
            boxShadow: '0 0 8px var(--ember)'
          }} />
        </div>
      </div>
    </div>
  );
};

export default GlobalResearchWidget;
