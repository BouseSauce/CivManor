import React, { useEffect, useState } from 'react';
import { RESEARCH_DEFS } from '../../core/config/research.js';
import { GameClient } from '../api/client';
import { useResearch } from '../hooks/useResearch';
import { checkRequirements } from '../../core/validation/requirements.js';
import { getIconForResource, getColorForIconClass } from '../constants/iconMaps';

const TAB_MAPPING = {
  'Vitality': ['TownHall'],
  'Structure': ['LoggingCamp', 'StonePit', 'Sawpit', 'Library'],
  'Might': ['Bloomery', 'Watchtower', 'Stable']
};

// --- Detail Modal Component ---
const TechDetailModal = ({ techId, def, onClose, onStart, locked, inProgress, isCompleted, currentLevel, reqCheck, playerState }) => {
  if (!def) return null;
  const iconClass = def.icon || 'fa-flask';
  const iconColor = getColorForIconClass(iconClass);
  const costEntries = Object.entries(def.cost || def.baseCost || {});
  const isInfinite = def.type === 'Infinite';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div style={{
        width: 400, background: '#1a0f0a', border: '2px solid var(--accent-gold)',
        borderRadius: 12, padding: 20, position: 'relative',
        boxShadow: '0 0 30px rgba(0,0,0,0.8)'
      }} onClick={e => e.stopPropagation()}>
        
        <button onClick={onClose} style={{
          position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
          color: '#aaa', fontSize: '1.2rem', cursor: 'pointer'
        }}><i className="fa-solid fa-times"></i></button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
            border: '2px solid var(--accent-gold)', margin: '0 auto 15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className={`fa-solid ${iconClass}`} style={{ fontSize: '2.5rem', color: iconColor }}></i>
          </div>
          <h2 className="font-cinzel" style={{ color: 'var(--accent-gold)', margin: 0 }}>{def.name}</h2>
          <div style={{ color: '#888', fontSize: '0.9rem', marginTop: 5 }}>
            {isInfinite ? `Current Level: ${currentLevel}` : (isCompleted ? 'Mastered' : (locked ? 'Locked' : 'Available'))}
          </div>
        </div>

        <div className="font-garamond" style={{ color: '#ddd', lineHeight: 1.5, marginBottom: 20, textAlign: 'center' }}>
          {def.description}
        </div>

        {/* Requirements if Locked */}
        {locked && reqCheck.missing.length > 0 && (
          <div style={{ background: 'rgba(198, 40, 40, 0.1)', border: '1px solid #c62828', borderRadius: 8, padding: 10, marginBottom: 20 }}>
            <div style={{ color: '#ef5350', fontWeight: 'bold', marginBottom: 5, fontSize: '0.9rem' }}>Requirements Missing:</div>
            {reqCheck.missing.map(m => (
              <div key={m.id} style={{ color: '#ffcdd2', fontSize: '0.85rem' }}>
                • {m.id} Level {m.level} (Have: {playerState[m.type === 'tech' ? 'techLevels' : 'buildingLevels'][m.id] || 0})
              </div>
            ))}
          </div>
        )}

        {/* Cost */}
        {!isCompleted && !inProgress && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginBottom: 20 }}>
            {costEntries.map(([res, amt]) => {
              const rIcon = getIconForResource(res);
              return (
                <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc' }}>
                  <i className={`fa-solid ${rIcon.icon}`} style={{ color: rIcon.color }}></i>
                  <span className="font-garamond" style={{ fontWeight: 'bold' }}>{amt}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        {!isCompleted && !inProgress && !locked && (
          <button 
            className="btn btn-primary font-cinzel" 
            style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
            onClick={() => { onStart(techId); onClose(); }}
          >
            {isInfinite && currentLevel > 0 ? `Research Level ${currentLevel + 1}` : 'Start Research'}
          </button>
        )}
        
        {inProgress && (
          <div className="font-cinzel" style={{ textAlign: 'center', color: '#2196f3', padding: 10, border: '1px solid #2196f3', borderRadius: 8 }}>
            Research in Progress...
          </div>
        )}
        
        {isCompleted && (
          <div className="font-cinzel" style={{ textAlign: 'center', color: '#4caf50', padding: 10, border: '1px solid #4caf50', borderRadius: 8 }}>
            Technology Mastered
          </div>
        )}

      </div>
    </div>
  );
};

// --- Vertical Tree Node Component ---
const TreeNode = ({ id, def, researched, active, locked, onClick, techLevels }) => {
  const currentLevel = techLevels[id] || 0;
  const isInfinite = def.type === 'Infinite';
  const isCompleted = researched && !isInfinite;
  const inProgress = active && active.techId === id;
  
  let borderColor = '#444';
  let glowColor = 'transparent';
  
  if (isCompleted) {
    borderColor = '#2e7d32';
    glowColor = 'rgba(76, 175, 80, 0.3)';
  } else if (inProgress) {
    borderColor = '#1565c0';
    glowColor = 'rgba(33, 150, 243, 0.4)';
  } else if (!locked) {
    borderColor = '#ff8f00';
    glowColor = 'rgba(255, 215, 0, 0.2)';
  }

  const iconClass = def.icon || 'fa-flask';
  const iconColor = getColorForIconClass(iconClass);

  return (
    <div 
      className="tree-node"
      onClick={() => onClick(id)}
      style={{
        width: 180,
        background: 'linear-gradient(145deg, #2d1b0d, #1a0f0a)',
        border: `2px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '12px',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: `0 4px 8px rgba(0,0,0,0.5), 0 0 15px ${glowColor}`,
        opacity: locked ? 0.6 : 1,
        transition: 'all 0.2s ease',
        filter: locked ? 'grayscale(0.9)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 10
      }}
    >
      <div style={{ 
        width: 48, height: 48, 
        borderRadius: '50%', 
        background: 'rgba(0,0,0,0.3)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${borderColor}`
      }}>
        <i className={`fa-solid ${iconClass}`} style={{ color: iconColor, fontSize: '1.4rem' }}></i>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <div className="font-cinzel" style={{ 
          fontSize: '0.85rem', 
          fontWeight: 700, 
          color: isCompleted ? '#a5d6a7' : (locked ? '#aaa' : '#fff'),
          lineHeight: 1.2
        }}>
          {def.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 4 }}>
          {isInfinite ? `Lvl ${currentLevel}` : (isCompleted ? 'Mastered' : (locked ? 'Locked' : 'Available'))}
        </div>
      </div>

      {inProgress && (
        <div style={{ width: '100%', height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
           <div className="progress-bar-animate" style={{ width: '100%', height: '100%', background: '#2196f3' }}></div>
        </div>
      )}
    </div>
  );
};

// Recursive Vertical Tree Node Wrapper
// Renders children ABOVE the current node (inverted tree)
const TechNode = ({ techId, def, childrenMap, allDefs, researchedList, techLevels, active, onNodeClick, area }) => {
  const children = childrenMap[techId] || [];
  const hasChildren = children.length > 0;

  // Check locked status
  const playerState = {
    techLevels: techLevels || {},
    buildingLevels: area?.buildings?.reduce((acc, b) => ({ ...acc, [b.id]: b.level }), {}) || {}
  };
  const reqCheck = checkRequirements(techId, playerState);
  const isLocked = !reqCheck.unlocked;
  const isResearched = researchedList.includes(techId);

  // Line Color based on THIS node's status (outgoing line to children)
  // Actually, lines should represent the dependency flow. 
  // The line connects Parent -> Child.
  // If Parent is researched, the line to Child is "active" (or at least unlocked).
  const lineColor = isResearched ? '#4caf50' : (isLocked ? '#444' : '#ffd700');
  const lineOpacity = isLocked ? 0.3 : 0.8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Children Row (Above) */}
      {hasChildren && (
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', paddingBottom: 20, position: 'relative' }}>
          {children.map((childId, index) => {
            // We need to draw lines from the bottom of each child to the top of this parent.
            // Since we are using flexbox, we can use absolute positioning relative to the container.
            // But a simpler way is to have each child render a "connector" pointing down.
            
            return (
              <div key={childId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <TechNode 
                  techId={childId} 
                  def={allDefs[childId]} 
                  childrenMap={childrenMap} 
                  allDefs={allDefs} 
                  researchedList={researchedList}
                  techLevels={techLevels}
                  active={active}
                  onNodeClick={onNodeClick}
                  area={area}
                />
                {/* Vertical Line from Child down to horizontal bar */}
                <div style={{ width: 2, height: 20, background: lineColor, opacity: lineOpacity }}></div>
              </div>
            );
          })}
          
          {/* Horizontal Bar connecting all children */}
          {children.length > 1 && (
             <div style={{ 
               position: 'absolute', 
               bottom: 20, // Aligns with the bottom of the vertical lines from children
               left: 'calc(50% / ' + children.length + ')', // Approximate centering logic is hard in pure CSS flex
               // Better approach: The horizontal bar spans from the center of the first child to the center of the last child.
               // We can achieve this by putting a border-top on a container that wraps the children, 
               // but that's tricky with variable widths.
               // Simplified: Just let the lines meet at a single point if possible, or use a dedicated SVG layer.
               // For now, we will use a simple visual approximation:
               // A horizontal bar that spans 80% of the width, centered.
               width: 'calc(100% - 180px)', // Subtract node width roughly
               height: 2,
               background: lineColor,
               opacity: lineOpacity
             }}></div>
          )}
        </div>
      )}

      {/* Connector from Children Cluster to Parent */}
      {hasChildren && (
        <div style={{ width: 2, height: 20, background: lineColor, opacity: lineOpacity }}></div>
      )}

      {/* The Node Itself (Bottom) */}
      <TreeNode 
        id={techId} 
        def={def} 
        researched={isResearched}
        active={active}
        locked={isLocked}
        onClick={onNodeClick}
        techLevels={techLevels}
      />
    </div>
  );
};

export default function TechTree({ area }) {
  const { research: researchState, refreshResearch } = useResearch();
  const [selectedTech, setSelectedTech] = useState(null);
  const [activeTab, setActiveTab] = useState('Vitality');

  // 1. Get Source Definitions (Grouped)
  const sourceDefs = (researchState.defs && Object.keys(researchState.defs).length > 0) ? researchState.defs : RESEARCH_DEFS;

  // 2. Determine Visible Groups based on Tab
  const visibleGroups = TAB_MAPPING[activeTab] || [];
  
  // 3. Flatten ONLY visible techs for the tree
  const visibleFlatResearch = {};
  visibleGroups.forEach(groupKey => {
    if (sourceDefs[groupKey]) {
      Object.assign(visibleFlatResearch, sourceDefs[groupKey]);
    }
  });

  // 4. Flatten ALL techs for global lookups (requirements, etc.)
  const globalFlatResearch = {};
  Object.values(sourceDefs).forEach(group => {
    Object.assign(globalFlatResearch, group);
  });

  // 5. Build Tree Structure for VISIBLE techs
  const childrenMap = {};
  const roots = [];

  Object.entries(visibleFlatResearch).forEach(([id, def]) => {
    if (!def) return;
    const req = def.requirement;
    
    // Check if parent is in the CURRENT visible set
    let parentId = null;
    if (req && req.tech && visibleFlatResearch[req.tech]) {
      parentId = req.tech;
    }

    if (parentId) {
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push(id);
    } else {
      // If no parent, OR parent is in another tab -> It's a root in this view
      roots.push(id);
    }
  });

  roots.sort((a, b) => a.localeCompare(b));

  const start = async (techId) => {
    try {
      const r = await GameClient.startResearch(techId);
      if (r && r.success) refreshResearch();
      else alert('Failed to start research');
    } catch (e) { alert('Start research error'); }
  };

  const handleNodeClick = (techId) => {
    setSelectedTech(techId);
  };

  // Helper to get player state for modal
  const playerState = {
    techLevels: researchState.techLevels || {},
    buildingLevels: area?.buildings?.reduce((acc, b) => ({ ...acc, [b.id]: b.level }), {}) || {}
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
      <div className="panel-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 0 16px 0',
          borderBottom: '2px solid var(--wood-dark)',
          background: 'none',
          flexDirection: 'column',
          gap: 15
      }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h2 className="font-cinzel" style={{ 
                margin: 0, 
                color: 'var(--text-main)', 
                fontSize: '1.8rem', 
                fontWeight: 800,
                textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(197, 160, 89, 0.2)',
                letterSpacing: '2px',
                textTransform: 'uppercase'
            }}>
                <i className='fa-solid fa-network-wired' style={{ marginRight: 15, color: 'var(--accent-gold)' }}></i>Technology Tree
            </h2>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {Object.keys(TAB_MAPPING).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="font-cinzel"
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activeTab === tab ? 'linear-gradient(to bottom, #3e2723, #1a0f0a)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${activeTab === tab ? 'var(--accent-gold)' : '#444'}`,
                  borderBottom: activeTab === tab ? 'none' : '1px solid #444',
                  color: activeTab === tab ? 'var(--accent-gold)' : '#888',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
      </div>

      <div style={{ 
          flex: 1,
          overflow: 'auto',
          padding: '40px',
          background: 'radial-gradient(circle at center, #2d1b0d 0%, #000 100%)',
          border: '1px solid #444',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end' // Align roots to bottom
      }}>
        <div style={{ display: 'flex', gap: 60, alignItems: 'flex-end' }}>
          {roots.map(rootId => (
             <TechNode 
               key={rootId}
               techId={rootId}
               def={visibleFlatResearch[rootId]}
               childrenMap={childrenMap}
               allDefs={globalFlatResearch}
               researchedList={researchState.researched || []}
               techLevels={researchState.techLevels || {}}
               active={researchState.active}
               onNodeClick={handleNodeClick}
               area={area}
             />
          ))}
          {roots.length === 0 && (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No technologies available in this category.</div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTech && (
        <TechDetailModal 
          techId={selectedTech}
          def={globalFlatResearch[selectedTech]}
          onClose={() => setSelectedTech(null)}
          onStart={start}
          locked={!checkRequirements(selectedTech, playerState).unlocked}
          reqCheck={checkRequirements(selectedTech, playerState)}
          inProgress={researchState.active && researchState.active.techId === selectedTech}
          isCompleted={(researchState.researched || []).includes(selectedTech) && globalFlatResearch[selectedTech].type !== 'Infinite'}
          currentLevel={(researchState.techLevels || {})[selectedTech] || 0}
          playerState={playerState}
        />
      )}
    </div>
  );
}
