import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';
import DashboardLayout from './DashboardLayout';
import WorldBrowser from './WorldBrowser';
import RegionView from './RegionView';
import MyEmpire from './MyEmpire';
import TechTree from './TechTree';
import AreaView from './AreaView';
import QueuePanel from './QueuePanel';

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const [regions, setRegions] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaData, setAreaData] = useState(null);
  const [view, setView] = useState('empire');
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [empireSummary, setEmpireSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await GameClient.listAreas(true);
        setRegions(res.regions || []);
      } catch (err) {
        console.error(err);
        alert('Failed to load areas');
      }
    };
    load();
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
          // food defined as Meat + Berries + Fish + Bread if present
          totalFood += (res.Meat || 0) + (res.Berries || 0) + (res.Fish || 0) + (res.Bread || 0);
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
        // area unowned: if the user has a TradeCart, perform single-click claim; otherwise do nothing.
        const hasCart = (user && user.inventory && user.inventory.units && user.inventory.units.TradeCart) > 0;
        if (!hasCart) {
          alert('Area is unowned and you do not have a TradeCart to claim it.');
          return;
        }
        // Prompt for a name when claiming from the area view
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

  const selectRegion = (regionId) => {
    setSelectedRegionId(regionId);
    setView('region');
  };

  const clearRegion = () => {
    setSelectedRegionId(null);
    setView('world');
  };

  const claimArea = async (areaId, name) => {
    try {
      const claim = await GameClient.claimArea(areaId, name);
      if (claim && claim.success) {
        // Refresh regions list and open claimed area
        try {
          const r = await GameClient.listAreas();
          setRegions(r.regions || []);
          const owned = await GameClient.getArea(areaId);
          if (owned && owned.owned) {
            setAreaData(owned);
            setSelectedArea(areaId);
            setView('area');
          }
          // Refresh the user's account (inventory) and notify parent
          try {
            const account = await GameClient.getAccount();
            if (account && onUserUpdate) onUserUpdate({ id: account.id, username: account.username, token: user?.token, inventory: account.inventory });
          } catch (e) {
            // ignore
          }
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
        // Refresh area data to show progress
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
      // Placeholder for recruit functionality
      alert(`Recruiting ${count} ${unitType} (Not implemented in backend yet)`);
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} onQuick={(view) => setView(view)} empireSummary={empireSummary}>
      <div style={{ padding: 12, height: '100%', boxSizing: 'border-box' }}>
        {view !== 'area' && (
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Dashboard</h2>
            <div />
            </div>
        )}

        {view === 'world' && <WorldBrowser regions={regions} onSelectRegion={selectRegion} />}
        {view === 'empire' && <MyEmpire regions={regions} user={user} onViewArea={viewArea} />}
        {view === 'region' && (
          <RegionView region={regions.find(r => r.id === selectedRegionId)} onBack={clearRegion} onViewArea={viewArea} onClaim={claimArea} user={user} />
        )}
        {view === 'settings' && (
          <div className='panel'>
            <div className='panel-header'>Settings</div>
            <div className='panel-body' style={{ padding: 12 }}>
              <div>Theme: Manor Lords (Active)</div>
              <div style={{ marginTop: 8 }}>
                <button className='btn' onClick={() => { localStorage.removeItem('gb_token'); GameClient.setToken(null); window.location.reload(); }}>Logout</button>
              </div>
            </div>
          </div>
        )}
        {view === 'research' && (
          <TechTree />
        )}

        {view === 'area' && areaData && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <AreaView 
                area={areaData} 
                onUpgrade={handleUpgrade}
                onRecruit={handleRecruit}
                onRefresh={refreshSelectedArea}
              />
            </div>
            <div style={{ width: 360 }}>
              <QueuePanel queue={areaData.queue} onRefresh={refreshSelectedArea} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
