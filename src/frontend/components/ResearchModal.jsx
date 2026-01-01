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
  
  // Get techs for current tab from server defs if available
  const sourceDefs = (researchState.defs && Object.keys(researchState.defs).length > 0) ? researchState.defs : RESEARCH_DEFS;
  const currentTechs = sourceDefs[activeTab] ? Object.values(sourceDefs[activeTab]) : [];

  const { researched = [], active = null, techLevels = {} } = researchState;

  const renderIcon = (tech) => {
    let iconClass = 'fa-flask';
    const tid = tech.id.toLowerCase();
    if (tid.includes('sanitation')) iconClass = 'fa-hand-holding-droplet';
    else if (tid.includes('framing')) iconClass = 'fa-house-chimney-window';
    else if (tid.includes('tactics')) iconClass = 'fa-scroll';
    else if (tid.includes('festivals')) iconClass = 'fa-wheat-awn';
    else if (tid.includes('storage')) iconClass = 'fa-warehouse';
    else if (tid.includes('preservation')) iconClass = 'fa-box-archive';
    else if (tid.includes('bellows')) iconClass = 'fa-wind';
    else if (tid.includes('prospecting')) iconClass = 'fa-pickaxe';
    else if (tid.includes('military')) iconClass = 'fa-shield-halved';
    else if (tid.includes('watchtower')) iconClass = 'fa-tower-observation';
    else if (tid.includes('economy')) iconClass = 'fa-coins';

    return (
      <div className="beveled-panel" style={{ 
        width: 60, height: 60, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem', color: 'var(--accent-gold)',
        flexShrink: 0,
        background: 'linear-gradient(145deg, #2d1b0d, #1a0f0a)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
      }}>
        <i className={`fas ${iconClass}`}></i>
      </div>
    );
  };

  const getStatusBadge = (tech, isResearched, isActive, isLocked) => {
    const currentLevel = techLevels[tech.id] || 0;
    const isInfinite = tech.type === 'Infinite';
    if (isInfinite && currentLevel > 0) return <span style={{ color: '#66bb6a', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Level {currentLevel}</span>;
    if (isResearched && !isInfinite) return <span style={{ color: '#66bb6a', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed</span>;
    if (isActive) return <span style={{ color: 'var(--ember)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>In Progress</span>;
    if (isLocked) return <span style={{ color: '#888', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Locked</span>;
    return <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Available</span>;
  };

  const renderTechCard = (tech) => {
    const isResearched = researched.includes(tech.id);
    const isActive = active && active.techId === tech.id;
    const currentLevel = techLevels[tech.id] || 0;
    const isInfinite = tech.type === 'Infinite';
    const isMaxLevel = tech.maxLevel && currentLevel >= tech.maxLevel;
    
    // Use server-provided locked state if available, otherwise fallback to local check
    const isLocked = (typeof tech.locked !== 'undefined') ? tech.locked : (tech.requirement && tech.requirement.building && 
      (!area.buildings.find(b => b.id === tech.requirement.building && b.level >= tech.requirement.level)));
    
    // Check resources
    const canAfford = Object.entries(tech.cost || tech.baseCost || {}).every(([res, amt]) => (area.resources[res] || 0) >= amt);

    const remainingTicks = isActive ? (active.ticksRemaining || 0) : 0;
    const totalTicks = isActive ? (active.totalTicks || 60) : 60;
    const progress = isActive ? Math.min(100, Math.max(0, 100 - (remainingTicks / totalTicks) * 100)) : 0;

    return (
      <div key={tech.id} 
        className="standard-card"
        title={isLocked ? `Requires ${tech.requirement.building} Level ${tech.requirement.level}` : ''}
        style={{
          opacity: isLocked ? 0.7 : 1,
          pointerEvents: isLocked ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          position: 'relative',
          border: isActive ? '1px solid var(--ember)' : '1px solid rgba(255,255,255,0.05)'
      }}>
        {/* Header with Icon and Title */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {renderIcon(tech)}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 className="font-cinzel" style={{ 
                margin: 0, 
                color: isActive ? 'var(--ember)' : '#e0cda0', 
                fontSize: '1.1rem',
                fontWeight: 800,
                lineHeight: 1.2
              }}>
                {tech.name} {currentLevel > 0 && <span style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>(Lvl {currentLevel})</span>}
              </h4>
              {getStatusBadge(tech, isResearched, isActive, isLocked)}
            </div>
            <p className="font-garamond" style={{ 
              margin: '4px 0 0 0', 
              fontSize: '0.85rem', 
              color: '#aaa', 
              lineHeight: 1.3,
              fontStyle: 'italic'
            }}>
              {tech.description}
            </p>
          </div>
        </div>

        {/* Requirements / Costs */}
        <div style={{ flex: 1 }}>
          {(!isResearched || isInfinite) && !isActive && !isMaxLevel && (
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: 4, 
              padding: '8px 12px',
              marginBottom: 12,
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>Research Cost</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(tech.cost || tech.baseCost || {}).map(([res, amt]) => {
                  const hasRes = (area.resources[res] || 0) >= amt;
                  const iconDef = getIconForResource(res);
                  return (
                    <div key={res} style={{ 
                      display: 'flex', alignItems: 'center', gap: 6, 
                      color: hasRes ? '#e0cda0' : '#ff4d4d',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      <i className={`fas ${iconDef.icon}`} style={{ fontSize: '0.8rem', opacity: 0.8 }}></i>
                      <span className="font-cinzel">{amt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isActive && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6, color: 'var(--text-main)', fontWeight: 'bold' }}>
                <span className="font-cinzel" style={{ letterSpacing: '1px' }}>RESEARCHING...</span>
                <span className="font-cinzel">{remainingTicks} ticks</span>
              </div>
              <div style={{ height: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ 
                  width: `${progress}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--ember), #ff8a34)',
                  boxShadow: '0 0 10px var(--ember)',
                  transition: 'width 1s linear'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {(!isResearched || isInfinite) && !isActive && !isMaxLevel && (
          <button
            onClick={() => startResearch(tech.id)}
            disabled={!canAfford || loading || active}
            className="medieval-button"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '0.9rem',
              opacity: (canAfford && !active) ? 1 : 0.6,
              cursor: (canAfford && !active) ? 'pointer' : 'not-allowed'
            }}
          >
            {active ? 'ACADEMY BUSY' : (canAfford ? (isInfinite && currentLevel > 0 ? `RESEARCH LVL ${currentLevel + 1}` : 'START RESEARCH') : 'LACKING RESOURCES')}
          </button>
        )}

        {isResearched && !isInfinite && (
          <div style={{ 
            textAlign: 'center', 
            padding: '8px', 
            background: 'rgba(102, 187, 106, 0.1)', 
            borderRadius: 4,
            border: '1px solid rgba(102, 187, 106, 0.2)',
            color: '#66bb6a',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
            Research Complete
          </div>
        )}

        {isMaxLevel && (
          <div style={{ 
            textAlign: 'center', 
            padding: '8px', 
            background: 'rgba(102, 187, 106, 0.1)', 
            borderRadius: 4,
            border: '1px solid rgba(102, 187, 106, 0.2)',
            color: '#66bb6a',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            <i className="fas fa-star" style={{ marginRight: 6 }}></i>
            Maximum Level Reached
          </div>
        )}
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
