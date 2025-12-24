import React, { useState, useEffect } from 'react';
import AreaHeaderBar from './AreaHeaderBar';
import AreaOverviewPanel from './AreaOverviewPanel';
import ManagementPanel from './ManagementPanel';
import QueuePanel from './QueuePanel';
import MilitaryPanel from './MilitaryPanel';
import IndustryPanel from './IndustryPanel';
import GatheringPanel from './GatheringPanel';
import EconomyPanel from './EconomyPanel';
import { GameClient } from '../api/client';

export default function CityView({ area, onBack, onUpgrade, onRecruit, onRefresh, openResearchModal }) {
  const [tab, setTab] = useState('overview');
  const [lastActionAt, setLastActionAt] = useState(0);

  const handleAssign = async (buildingId, count) => {
    try {
      const resp = await GameClient.assignWorkers(area.id, buildingId, count);
      if (resp && resp.success) {
        setLastActionAt(Date.now());
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Assign failed', err);
      alert(err?.message || 'Assign failed');
    }
  };

  // Poll the server for area updates so resources and header stay in sync
  useEffect(() => {
    if (!area || !area.id) return undefined;
    if (typeof onRefresh !== 'function') return undefined;
    let mounted = true;
    const tickMs = (window && window.GAME_CONFIG && window.GAME_CONFIG.TICK_MS) ? window.GAME_CONFIG.TICK_MS : 1000;
    const id = setInterval(() => {
      if (!mounted) return;
      // Avoid polling immediately after a local action to prevent races
      const justActed = (Date.now() - lastActionAt) < 3000;
      if (justActed) return;
      try { onRefresh(); } catch (e) { /* ignore */ }
    }, tickMs);
    return () => { mounted = false; clearInterval(id); };
  }, [area && area.id, onRefresh, lastActionAt]);

  return (
    <div className="city-view" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundImage: 'url(https://www.transparenttextures.com/patterns/aged-paper.png)', backgroundColor: '#efe6d6', fontFamily: 'Medieval Serif, serif' }}>
      <AreaHeaderBar resources={{ ...area.resources }} stats={area.stats} />

      <div style={{ display: 'flex', flex: 1, gap: 16, padding: 20, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Top tabs removed — ManagementPanel now provides category tabs */}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AreaOverviewPanel areaId={area.id} areaName={area.name} coordinates={area.id} stats={area.stats} queue={area.queue} units={area.units} assignments={area.assignments} ownerName={area.ownerName} compact={false} onRefresh={onRefresh} />
                <ManagementPanel area={area} buildings={area.buildings} onUpgrade={onUpgrade} onAssign={handleAssign} filter="all" openResearchModal={openResearchModal} />
              </div>
            )}

            {tab === 'military' && (
              <MilitaryPanel units={area.units} buildings={area.buildings} onRecruit={onRecruit} onUpgrade={onUpgrade} />
            )}

            {tab === 'industry' && (
              <IndustryPanel area={area} buildings={area.buildings.filter(b => b.category === 'Industry' || b.tags?.includes('industry'))} onUpgrade={onUpgrade} onAssign={handleAssign} openResearchModal={openResearchModal} />
            )}

            {tab === 'gathering' && (
              <GatheringPanel area={area} buildings={area.buildings.filter(b => b.category === 'Gathering' || b.tags?.includes('gathering'))} onUpgrade={onUpgrade} onAssign={handleAssign} openResearchModal={openResearchModal} />
            )}

            {tab === 'economy' && (
              <EconomyPanel area={area} buildings={area.buildings.filter(b => b.category === 'Economy' || b.tags?.includes('economy'))} onUpgrade={onUpgrade} onAssign={handleAssign} openResearchModal={openResearchModal} />
            )}
          </div>
        </div>

        <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', justifyContent: 'flex-start' }}>
          <div style={{ fontWeight: 700 }}>Construction Ledger</div>
          <div style={{ flex: '0 0 auto' }}>
            <QueuePanel queue={area.queue || []} onRefresh={onRefresh} parentAreaId={area.id} />
          </div>
          <div style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 200, display: 'flex', alignItems: 'center' }}>
            <div className="leather-strap"></div>
            <button className="btn-wax-seal" onClick={onBack}>
              <i className="fa-solid fa-map"></i>
            </button>
            <div style={{ marginLeft: 10, fontFamily: 'var(--font-header)', color: '#f3e5ab', textShadow: '1px 1px 2px #000', fontWeight: 'bold' }}>Back to World Map</div>
          </div>
        </div>
      </div>
    </div>
  );
}
