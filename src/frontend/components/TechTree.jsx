import React, { useEffect, useState } from 'react';
import { RESEARCH_DEFS } from '../../core/config/research.js';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import { GameClient } from '../api/client';
import ResearchCard from './ResearchCard';
import { useResearch } from '../hooks/useResearch';

export default function TechTree({ area }) {
  const { research: researchState, refreshResearch } = useResearch();

  // Flatten RESEARCH_DEFS since it is grouped by building
  const flatResearch = {};
  const sourceDefs = (researchState.defs && Object.keys(researchState.defs).length > 0) ? researchState.defs : RESEARCH_DEFS;
  
  Object.values(sourceDefs).forEach(group => {
    Object.assign(flatResearch, group);
  });

  const start = async (techId) => {
    try {
      const r = await GameClient.startResearch(techId);
      if (r && r.success) refreshResearch();
      else alert('Failed to start research');
    } catch (e) { alert('Start research error'); }
  };

  // Sort research: Researched first, then Researchable (available or active), then Locked
  const sortedTechs = Object.entries(flatResearch).sort(([idA], [idB]) => {
    const isResearchedA = researchState.researched?.includes(idA);
    const isResearchedB = researchState.researched?.includes(idB);
    const isActiveA = researchState.active?.techId === idA;
    const isActiveB = researchState.active?.techId === idB;
    const isAvailableA = researchState.available?.includes(idA);
    const isAvailableB = researchState.available?.includes(idB);

    const status = (researched, active, available) => {
      if (researched) return 0; // researched
      if (active || available) return 1; // researchable (including in-progress)
      return 2; // locked
    };

    const sA = status(isResearchedA, isActiveA, isAvailableA);
    const sB = status(isResearchedB, isActiveB, isAvailableB);

    if (sA !== sB) return sA - sB;
    return idA.localeCompare(idB);
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 0 16px 0',
          borderBottom: '2px solid var(--wood-dark)',
          background: 'none'
      }}>
          <h2 className="font-cinzel" style={{ 
              margin: 0, 
              color: 'var(--text-main)', 
              fontSize: '1.8rem', 
              fontWeight: 800,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(197, 160, 89, 0.2)',
              letterSpacing: '2px',
              textTransform: 'uppercase'
          }}>
              <i className='fa-solid fa-flask' style={{ marginRight: 15, color: 'var(--accent-gold)' }}></i>Technology Tree
          </h2>
      </div>

      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '20px',
          paddingBottom: '20px',
          overflowY: 'auto',
          flex: 1
      }}>
        {sortedTechs.map(([id, def]) => (
          <ResearchCard
            key={id}
            id={id}
            def={def}
            researched={researchState.researched?.includes(id)}
            researchedList={researchState.researched || []}
            techLevels={researchState.techLevels || {}}
            active={researchState.active}
            onStart={start}
            area={area}
          />
        ))}
      </div>
    </div>
  );
}
