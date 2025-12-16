import React, { useState } from 'react';
import AreaOverviewPanel from './AreaOverviewPanel';
import ManagementPanel from './ManagementPanel';
import MilitaryPanel from './MilitaryPanel';
import IndustryPanel from './IndustryPanel';
import GatheringPanel from './GatheringPanel';
import EconomyPanel from './EconomyPanel';
import ResourceRow from './ResourceRow';
import ResearchStrip from './ResearchStrip';
import ResearchPanel from './ResearchPanel';

export default function AreaView({ area, onUpgrade, onRecruit, onRefresh: parentRefresh }) {
  const [tab, setTab] = useState('overview'); // overview, military, economy

  const refreshArea = async () => {
    if (typeof parentRefresh === 'function') return parentRefresh();
    return null;
  };

  return (
    <div className="area-view" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Top Bar: Resources & Research */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <ResourceRow resources={area.resources} />
        <ResearchStrip />
      </div>

      {/* Area Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', padding: '0 8px' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-header)', color: 'var(--accent-gold)', fontSize: '2rem' }}>{area.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{area.ownerName ? `Lord ${area.ownerName}` : 'Unowned'}</div>
        </div>
        
        <div className="tabs" style={{ display: 'flex', gap: 4 }}>
          <button className={`btn ${tab === 'overview' ? 'btn-primary' : ''}`} onClick={() => setTab('overview')}>
            <i className="fa-solid fa-city" style={{ marginRight: 8 }}></i>Overview
          </button>
          <button className={`btn ${tab === 'military' ? 'btn-primary' : ''}`} onClick={() => setTab('military')}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 8 }}></i>Military
          </button>
          <button className={`btn ${tab === 'industry' ? 'btn-primary' : ''}`} onClick={() => setTab('industry')}>
            <i className="fa-solid fa-industry" style={{ marginRight: 8 }}></i>Industry
          </button>
          <button className={`btn ${tab === 'gathering' ? 'btn-primary' : ''}`} onClick={() => setTab('gathering')}>
            <i className="fa-solid fa-seedling" style={{ marginRight: 8 }}></i>Gathering
          </button>
          <button className={`btn ${tab === 'economy' ? 'btn-primary' : ''}`} onClick={() => setTab('economy')}>
            <i className="fa-solid fa-coins" style={{ marginRight: 8 }}></i>Economy
          </button>
          <button className={`btn ${tab === 'research' ? 'btn-primary' : ''}`} onClick={() => setTab('research')}>
            <i className="fa-solid fa-flask" style={{ marginRight: 8 }}></i>Research
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats Row + Research Queue */}
            <AreaOverviewPanel 
              areaId={area.id}
              areaName={area.name} 
              coordinates={area.id} 
              stats={area.stats} 
              queue={area.queue} 
              units={area.units}
              assignments={area.assignments}
              ownerName={area.ownerName}
              compact={false}
              onRefresh={refreshArea}
            />

            {/* Show buildings that are already built */}
            <ManagementPanel 
              buildings={area.buildings} 
              onUpgrade={onUpgrade} 
              onAssign={(buildingId, count) => {
                // If a specific count is provided, use it. Otherwise prompt the user.
                if (typeof count === 'number') {
                  import('../api/client').then(m => m.GameClient.assignWorkers(area.id, buildingId, count).then(() => { if (parentRefresh) parentRefresh(); }).catch(e => { alert('Assign failed'); }));
                  return;
                }
                const current = (area.assignments && area.assignments[buildingId]) || 0;
                const next = parseInt(prompt(`Assign how many villagers to ${buildingId}? (current ${current})`, String(current)), 10);
                if (!isNaN(next)) {
                  import('../api/client').then(m => m.GameClient.assignWorkers(area.id, buildingId, next).then(() => { if (parentRefresh) parentRefresh(); }).catch(e => { alert('Assign failed'); }));
                }
              }}
              filter="built"
            />
          </div>
        )}

        {tab === 'military' && (
          <MilitaryPanel 
            units={area.units} 
            buildings={area.buildings.filter(b => ['Barracks','Stable','SiegeWorkshop','Smithy','Wall','Tower'].includes(b.id) || b.resourceTier === 'Warfare')}
            onRecruit={onRecruit}
            onUpgrade={onUpgrade}
          />
        )}

        {tab === 'industry' && (
          <IndustryPanel buildings={area.buildings.filter(b => b.category === 'Industry' || b.tags?.includes('industry'))} onUpgrade={onUpgrade} />
        )}

        {tab === 'gathering' && (
          <GatheringPanel buildings={area.buildings.filter(b => b.category === 'Gathering' || b.tags?.includes('gathering'))} onUpgrade={onUpgrade} />
        )}

        {tab === 'economy' && (
          <EconomyPanel buildings={area.buildings.filter(b => b.category === 'Economy' || b.tags?.includes('economy'))} onUpgrade={onUpgrade} />
        )}
        {tab === 'research' && (
          <ResearchPanel area={area} onRefresh={refreshArea} />
        )}
      </div>
    </div>
  );
}
