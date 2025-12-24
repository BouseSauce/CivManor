import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameClient } from '../api/client';
import { RESEARCH_DEFS } from '../../core/config/research.js';
import { getIconForResource } from '../constants/iconMaps';

const ResearchModal = ({ isOpen, onClose, initialTab, area }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'TownHall');
  const [researchState, setResearchState] = useState({ researched: [], active: null, available: [], defs: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const load = async () => {
      try {
        const res = await GameClient.getResearch();
        if (mounted) setResearchState(res || { researched: [], active: null, available: [], defs: {} });
      } catch (e) { console.error('Failed to load research', e); }
    };
    load();
    const t = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(t); };
  }, [isOpen]);

  const startResearch = async (techId) => {
    setLoading(true);
    try {
      await GameClient.startResearch(techId);
      const res = await GameClient.getResearch();
      setResearchState(res || researchState);
    } catch (e) { 
      alert(e && e.error ? e.error : (e && e.message) || 'Failed to start research'); 
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  // Group research by building based on RESEARCH_DEFS
  const tabs = Object.keys(RESEARCH_DEFS);
  
  // Get techs for current tab
  const currentTechs = RESEARCH_DEFS[activeTab] ? Object.values(RESEARCH_DEFS[activeTab]) : [];

  const { researched = [], active = null } = researchState;

  const renderTechCard = (tech) => {
    const isResearched = researched.includes(tech.id);
    const isActive = active && active.techId === tech.id;
    const isLocked = tech.requirement && tech.requirement.building && 
      (!area.buildings.find(b => b.id === tech.requirement.building && b.level >= tech.requirement.level));
    
    // Check resources
    const canAfford = Object.entries(tech.baseCost || {}).every(([res, amt]) => (area.resources[res] || 0) >= amt);

    return (
      <div key={tech.id} 
        className="standard-card"
        title={isLocked ? `Requires ${tech.requirement.building} Level ${tech.requirement.level}` : ''}
        style={{
          border: isActive ? '1px solid #66bb6a' : undefined,
          opacity: isLocked ? 0.7 : 1,
          pointerEvents: isLocked ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '180px'
      }}>
        {isLocked && (
          <div style={{ 
            position: 'absolute', top: 8, right: 8, 
            color: '#aaa', 
            background: 'rgba(0,0,0,0.5)', 
            borderRadius: '50%', width: 24, height: 24, 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <i className="fas fa-lock"></i>
          </div>
        )}
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h4 className="font-cinzel" style={{ 
              margin: 0, 
              color: isActive ? '#66bb6a' : '#e0cda0', 
              fontSize: '1.1rem',
              fontWeight: 800,
              textShadow: '0 1px 0 rgba(255,255,255,0.5)'
            }}>
              {tech.name}
            </h4>
            {isResearched && <span style={{ color: '#2e7d32', fontSize: '0.9rem', fontWeight: 'bold' }}><i className="fas fa-check"></i></span>}
          </div>

          <p className="font-garamond" style={{ 
            margin: '0 0 12px 0', 
            fontSize: '0.9rem', 
            color: '#ccc', 
            lineHeight: 1.4
          }}>
            {tech.description}
          </p>
        </div>

        <div>
          {/* Cost */}
          {!isResearched && !isActive && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {Object.entries(tech.baseCost || {}).map(([res, amt]) => {
                const hasRes = (area.resources[res] || 0) >= amt;
                const iconDef = getIconForResource(res);
                return (
                  <div key={res} style={{ 
                    display: 'flex', alignItems: 'center', gap: 4, 
                    color: hasRes ? '#e0cda0' : '#ff4d4d',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    <i className={`fas ${iconDef.icon}`}></i> <span className="font-cinzel">{amt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress Bar */}
          {isActive && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4, color: 'var(--text-main)', fontWeight: 'bold' }}>
                <span>Researching...</span>
                <span>{Math.max(0, Math.ceil((active.completesAt - Date.now()) / 1000))}s</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ 
                  width: `${Math.min(100, Math.max(0, 100 - ((active.completesAt - Date.now()) / (tech.durationSeconds * 1000)) * 100))}%`, 
                  height: '100%', 
                  background: 'var(--ember)',
                  transition: 'width 1s linear'
                }} />
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isResearched && !isActive && (
            <button
              onClick={() => startResearch(tech.id)}
              disabled={!canAfford || loading || active}
              style={{
                width: '100%',
                padding: '10px',
                background: canAfford ? 'var(--wood-dark)' : 'rgba(0,0,0,0.1)',
                border: 'none',
                color: canAfford ? 'var(--parchment)' : 'var(--text-muted)',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                fontFamily: 'MedievalSharp, serif',
                textTransform: 'uppercase',
                borderRadius: 4,
                fontWeight: 'bold',
                boxShadow: canAfford ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {active ? 'Research Busy' : (canAfford ? 'Start Research' : 'Insufficient Resources')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)'
    }}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      
      <div style={{
        width: '90%', maxWidth: 1100, height: '85vh',
        background: '#1a1a1a',
        border: '4px solid var(--wood-dark)',
        borderRadius: 8,
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 0 50px rgba(0,0,0,0.7)'
      }}>
        {/* Sidebar Tabs */}
        <div style={{ 
          width: 220, 
          background: 'var(--wood-dark)', 
          borderRight: '2px solid #2b1d19',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-gold)', fontFamily: 'MedievalSharp, serif', fontSize: '1.4rem' }}>Academy</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: activeTab === tab ? 'var(--parchment)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: activeTab === tab ? 'var(--wood-dark)' : 'var(--parchment)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'MedievalSharp, serif',
                  fontSize: '1.1rem',
                  transition: 'all 0.2s',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  position: 'relative'
                }}
              >
                {tab}
                {activeTab === tab && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--ember)' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'url("https://www.transparenttextures.com/patterns/dark-wood.png")' }}>
          <div style={{ 
            padding: '20px 32px', 
            borderBottom: '2px solid var(--wood-dark)', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: 0, color: 'var(--parchment)', fontFamily: 'MedievalSharp, serif', fontSize: '1.8rem', textShadow: '2px 2px 4px #000' }}>
              {activeTab} Research
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--parchment)', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.8 }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {currentTechs.map(renderTechCard)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ResearchModal;
