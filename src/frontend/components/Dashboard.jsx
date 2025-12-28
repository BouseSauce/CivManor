import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';
import DashboardLayout from './DashboardLayout';
import WorldBrowser from './WorldBrowser';
import MyEmpire from './MyEmpire';
import CityView from './CityView';
import TechTree from './TechTree';
import InboxPanel from './InboxPanel';
import GreatArchives from './GreatArchives';
import AreaView from './AreaView';
import QueuePanel from './QueuePanel';
import AdminPanel from './AdminPanel';

import ResearchModal from './ResearchModal';
import GlobalResearchWidget from './GlobalResearchWidget';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import '../styles/hexgrid.css'; // Import Hex Grid Styles

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const [regions, setRegions] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaData, setAreaData] = useState(null);
  const [view, setView] = useState('empire');
  // mapInitialCenterId is used to ask the world map to center on a particular hex
  const [mapInitialCenterId, setMapInitialCenterId] = useState(null);
  const [empireSummary, setEmpireSummary] = useState(null);
  const [showLogistics, setShowLogistics] = useState(false); // Logistics Modal State
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [researchModalTab, setResearchModalTab] = useState('TownHall');

  const openResearchModal = (tab = 'TownHall') => {
    setResearchModalTab(tab);
    setIsResearchModalOpen(true);
  };

  // Sync activeAreaID to window.gameState
  useEffect(() => {
    window.gameState = window.gameState || {};
    window.gameState.currentLocation = selectedArea;
    window.gameState.activeAreaID = selectedArea; // Alias
  }, [selectedArea]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await GameClient.listAreas(true);
        setRegions(res.regions || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    // Listen for world refresh events
    const onRefresh = () => { load(); };
    window.addEventListener('areas:refresh', onRefresh);
    return () => { window.removeEventListener('areas:refresh', onRefresh); };
  }, []);


  // Compute empire summary when entering 'empire' view (population, food, stone, carts)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (view !== 'empire' || !user) {
        setEmpireSummary(null);
        return;
      }
      // Find owned areas metadata
      const owned = [];
      regions.forEach(r => r.areas.forEach(a => { if (a.ownerId === user.id) owned.push(a.id); }));
      if (owned.length === 0) {
        setEmpireSummary({ population: 0, food: 0, stone: 0, carts: (user.inventory?.units?.TradeCart || 0) });
        return;
      }
      try {
        const promises = owned.map(id => GameClient.getArea(id).catch(() => null));
        const results = await Promise.all(promises);
        let totalPop = 0, totalFood = 0, totalStone = 0;
        results.forEach(r => {
          if (!r || !r.owned) return;
          totalPop += (r.stats?.currentPop || 0);
          const res = r.resources || {};
          totalFood += (res.Food || 0) + (res.Fish || 0) + (res.Bread || 0);
          totalStone += (res.Stone || 0);
        });
        const carts = (user.inventory?.units?.TradeCart || 0);
        if (!cancelled) setEmpireSummary({ population: totalPop, food: totalFood, stone: totalStone, carts });
      } catch (e) {
        console.error('Failed to compute empire summary', e);
        if (!cancelled) setEmpireSummary({ population: 0, food: 0, stone: 0, carts: (user.inventory?.units?.TradeCart || 0) });
      }
    })();
    return () => { cancelled = true; };
  }, [view, regions, user]);

  const viewArea = async (areaId, ownerId) => {
    try {
      const res = await GameClient.getArea(areaId);
      if (res.owned) {
        setAreaData(res);
        setSelectedArea(areaId);
        setView('area');
      } else {
        const hasCart = (user && user.inventory && user.inventory.units && (user.inventory.units.TradeCart || 0)) > 0;
        if (!hasCart) {
          alert('Area is unowned and you do not have a TradeCart to claim it.');
          return;
        }
        const name = window.prompt('Name this area as you claim it (optional):', '');
        const claim = await GameClient.claimArea(areaId, name);
        if (claim && claim.success) {
          try {
            const r = await GameClient.listAreas();
            setRegions(r.regions || []);
            const owned = await GameClient.getArea(areaId);
            if (owned && owned.owned) {
              setAreaData(owned);
              setSelectedArea(areaId);
              setView('area');
            }
          } catch (e) {
            console.error('Error refreshing after claim', e);
          }
        } else {
          alert('Failed to claim area');
        }
      }
    } catch (err) {
      alert('Failed to fetch area data');
    }
  };

  const refreshSelectedArea = async () => {
    if (!selectedArea) return;
    try {
      const updated = await GameClient.getArea(selectedArea);
      if (updated && updated.owned) setAreaData(updated);
    } catch (e) {
      console.error('Failed to refresh area', e);
    }
  };

  // Clear area detail when navigating away from area view
  useEffect(() => {
    if (view !== 'area') {
      setAreaData(null);
      setSelectedArea(null);
    }
  }, [view]);

  // When entering the world view, pick a sensible initial center (player capital or first owned area)
  useEffect(() => {
    if (view === 'world') {
      const owned = regions.flatMap(r => r.areas).find(a => a.ownerId === user?.id);
      if (owned) setMapInitialCenterId(owned.id);
      else setMapInitialCenterId(null);
    }
  }, [view, regions, user]);

  const claimArea = async (areaId, name) => {

    try {
      const claim = await GameClient.claimArea(areaId, name);
      if (claim && claim.success) {
        try {
          const r = await GameClient.listAreas();
          setRegions(r.regions || []);
          const owned = await GameClient.getArea(areaId);
          if (owned && owned.owned) {
            setAreaData(owned);
            setSelectedArea(areaId);
            setView('area');
          }
          try {
            const account = await GameClient.getAccount();
            if (account && onUserUpdate) onUserUpdate({ id: account.id, username: account.username, token: user?.token, inventory: account.inventory });
          } catch (e) { }
        } catch (e) {
          console.error('Error refreshing after claim', e);
        }
      } else {
        alert('Failed to claim area');
      }
    } catch (e) {
      console.error(e);
      alert('Error claiming area');
    }
  };

  const handleUpgrade = async (buildingId) => {
    try {
      const r = await GameClient.upgradeArea(selectedArea, buildingId);
      if (r && r.success) {
        const updated = await GameClient.getArea(selectedArea);
        setAreaData(updated);
      } else {
        const msg = r?.message || r?.error || (typeof r === 'string' ? r : JSON.stringify(r)) || 'Unknown error';
        alert('Upgrade failed: ' + msg);
      }
    } catch (e) {
      console.error(e);
      alert('Upgrade error: ' + (e?.message || String(e)));
    }
  };

  const handleRecruit = async (unitType, count) => {
    try {
      const r = await GameClient.recruitUnits(selectedArea, unitType, count);
      if (r && r.success) {
        const updated = await GameClient.getArea(selectedArea);
        setAreaData(updated);
      } else {
        const msg = r?.message || r?.error || (typeof r === 'string' ? r : JSON.stringify(r)) || 'Unknown error';
        alert('Recruitment failed: ' + msg);
      }
    } catch (e) {
      console.error(e);
      alert('Recruitment error: ' + (e?.message || String(e)));
    }
  };

  // Helper to get capacities for the header bar
  const getCapacities = (area) => {
    const capacities = {};
    if (!area) return capacities;
    try {
      const storeCfg = BUILDING_CONFIG['Storehouse'];
      const storeLevel = (area.buildings || []).find(b => b.id === 'Storehouse')?.level || 0;
      if (storeCfg && storeCfg.storageBase) {
        const mul = storeCfg.storageMultiplier || 1.0;
        Object.entries(storeCfg.storageBase).forEach(([res, base]) => {
          capacities[`${res}Cap`] = Math.floor(base * Math.pow(mul, storeLevel));
        });
      }
    } catch (e) {}
    return capacities;
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} onQuick={(view) => setView(view)} empireSummary={empireSummary}>
      <div className="dashboard-children">
      {/* CityView has its own header */}

      {view === 'world' ? (
        <WorldBrowser regions={regions} onViewArea={viewArea} onClaim={claimArea} user={user} selectedAreaId={selectedArea} initialCenterId={mapInitialCenterId} />
      ) : view === 'area' && areaData ? (
        <AreaView 
          area={areaData} 
          onBack={() => setView('world')} 
          onUpgrade={handleUpgrade} 
          onRecruit={handleRecruit} 
          onRefresh={refreshSelectedArea} 
          openResearchModal={openResearchModal}
        />
      ) : (
      <div style={{ padding: 20, height: 'calc(100% - 60px)', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view !== 'area' && (
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <h2 style={{ color: 'var(--parchment)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Dashboard</h2>
            <div />
            </div>
        )}

        {view === 'empire' && <MyEmpire regions={regions} user={user} onViewArea={viewArea} />}
        {view === 'settings' && (

          <div className='beveled-panel' style={{ padding: '12px' }}>
            <div className='font-cinzel' style={{ fontSize: '1.2em', color: '#e0cda0', marginBottom: '12px', borderBottom: '1px solid #5c4033', paddingBottom: '6px' }}>Settings</div>
            <div style={{ padding: '12px' }}>
              <div className="font-garamond" style={{ color: '#ccc', marginBottom: '12px' }}>Theme: Dark Walnut & Parchment (Active)</div>
              <div>
                <button className='btn-primary font-cinzel' onClick={() => { localStorage.removeItem('gb_token'); GameClient.setToken(null); window.location.reload(); }}>Logout</button>
              </div>
            </div>
          </div>
        )}
        {view === 'research' && (
          <TechTree />
        )}

        {view === 'messages' && (
          <InboxPanel />
        )}
        {view === 'notifications' && (
          <GreatArchives />
        )}

        {/* When in 'area' (city) view we render CityView above; do not render the world map beside it to avoid dead-space duplication */}

        {/* Logistics Overlay Modal */}
        {showLogistics && (
          <div className="overlay" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }}>
            <div className="beveled-panel" style={{ maxWidth: '600px', padding: '0', background: '#1a1a1a' }}>
              <div className="font-cinzel" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #5c4033', fontSize: '1.2em', color: '#e0cda0' }}>
                <span>Logistics & Transport</span>
                <button className="btn-primary font-cinzel" style={{ fontSize: '0.8em', padding: '4px 8px' }} onClick={() => setShowLogistics(false)}>Close</button>
              </div>
              <div style={{ padding: '20px' }}>
                <p className="font-garamond" style={{ color: '#ccc' }}>Transport goods between your owned areas.</p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label className="font-cinzel" style={{ color: '#aaa', fontSize: '0.9em' }}>Source</label>
                    <select className="btn font-garamond" style={{ width: '100%', display: 'block', background: '#333', color: '#fff', border: '1px solid #555' }} disabled>
                      <option>{areaData?.name}</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'end', paddingBottom: 10 }}><i className="fa-solid fa-arrow-right" style={{ color: '#e0cda0' }}></i></div>
                  <div style={{ flex: 1 }}>
                    <label className="font-cinzel" style={{ color: '#aaa', fontSize: '0.9em' }}>Destination</label>
                    <select className="btn font-garamond" style={{ width: '100%', display: 'block', background: '#333', color: '#fff', border: '1px solid #555' }}>
                      {regions.flatMap(r => r.areas).filter(a => a.ownerId === user?.id && a.id !== areaData?.id).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="beveled-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
                  <em className="font-garamond" style={{ color: '#aaa' }}>Logistics functionality coming soon...</em>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <AdminPanel onRefresh={() => { if (selectedArea) refreshSelectedArea(); }} />
        )}
      </div>
      )}
    </div>

      <ResearchModal 
        isOpen={isResearchModalOpen} 
        onClose={() => setIsResearchModalOpen(false)} 
        initialTab={researchModalTab}
        area={areaData || { resources: {}, buildings: [] }}
      />
      
      <GlobalResearchWidget onClick={() => setIsResearchModalOpen(true)} />

    </DashboardLayout>
  );
}
