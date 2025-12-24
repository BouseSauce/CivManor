import React, { useState, useEffect } from 'react';
import AreaOverviewPanel from './AreaOverviewPanel';
import QueuePanel from './QueuePanel';
import ManagementPanel from './ManagementPanel';
import MilitaryPanel from './MilitaryPanel';
// Industry/Gathering/Economy panels removed here to avoid duplicate overviews.
import ResourceRow from './ResourceRow';
import ResearchStrip from './ResearchStrip';
import TechTree from './TechTree';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import { GameClient } from '../api/client';
import { GAME_CONFIG } from '../../core/config/gameConfig.js';

export default function AreaView({ area, onUpgrade, onRecruit, onRefresh: parentRefresh }) {
  const [tab, setTab] = useState('buildings'); // buildings, military, research
  const [localTick, setLocalTick] = useState(0); // bump to force re-render after optimistic changes
  const [localArea, setLocalArea] = useState(area || null);
  const [lastActionAt, setLastActionAt] = useState(0);

  const refreshArea = async () => {
    if (typeof parentRefresh === 'function') return parentRefresh();
    return null;
  };

  const handleAssign = (buildingId, count) => {
    if (!localArea || !localArea.id) return Promise.resolve();
    setLastActionAt(Date.now());
    if (typeof count === 'number') {
      return import('../api/client').then(m => m.GameClient.assignWorkers(localArea.id, buildingId, count).then((resp) => { 
        try { window.dispatchEvent(new CustomEvent('area:refresh-request', { detail: { areaId: localArea.id } })); } catch (e) {}
        if (parentRefresh) parentRefresh(); else {
          // optimistic local update: set assignment on localArea and force re-render
          try { 
            setLocalArea(prev => { 
              if (!prev) return prev;
              const next = Object.assign({}, prev);
              next.assignments = Object.assign({}, prev.assignments || {}, { [buildingId]: count });
              // Also update the building object if it exists in the buildings array
              if (next.buildings) {
                next.buildings = next.buildings.map(b => {
                  if (b.id === buildingId) return Object.assign({}, b, { assigned: count });
                  // Handle role-style IDs like LoggingCamp:Planks
                  if (buildingId.startsWith(b.id + ':')) {
                    const role = buildingId.split(':')[1];
                    if (role === 'Planks') return Object.assign({}, b, { assignedPlanks: count });
                  }
                  return b;
                });
              }
              return next; 
            }); 
          } catch (e) {}
          setLocalTick(t=>t+1);
        }
        return resp;
      }).catch(e => { 
        alert(e?.message || 'Assign failed');
        throw e; // Re-throw so caller knows it failed
      }));
    }
    const current = (localArea.assignments && localArea.assignments[buildingId]) || 0;
    const next = parseInt(prompt(`Assign how many villagers to ${buildingId}? (current ${current})`, String(current)), 10);
    if (!isNaN(next)) {
      return import('../api/client').then(m => m.GameClient.assignWorkers(localArea.id, buildingId, next).then((resp) => { 
        try { window.dispatchEvent(new CustomEvent('area:refresh-request', { detail: { areaId: localArea.id } })); } catch (e) {}
        if (parentRefresh) parentRefresh(); else {
          try { 
            setLocalArea(prev => { 
              if (!prev) return prev;
              const next = Object.assign({}, prev);
              next.assignments = resp && resp.assignments ? resp.assignments : Object.assign({}, prev.assignments || {}, { [buildingId]: next });
              if (next.buildings) {
                next.buildings = next.buildings.map(b => {
                  if (b.id === buildingId) return Object.assign({}, b, { assigned: next.assignments[buildingId] });
                  return b;
                });
              }
              return next; 
            }); 
          } catch (e) {}
          setLocalTick(t=>t+1);
        }
        return resp;
      }).catch(e => { 
        alert(e?.message || 'Assign failed');
        throw e;
      }));
    }
    return Promise.resolve();
  };

  // Keep a local copy of the area and poll the authoritative state at the game's tick rate so UI resources update live
  useEffect(() => setLocalArea(area || null), [area]);

  useEffect(() => {
    if (!localArea || !localArea.id) return undefined;
    let mounted = true;
    const tickMs = (GAME_CONFIG && GAME_CONFIG.TICK_MS) ? GAME_CONFIG.TICK_MS : 1000;
    const id = setInterval(async () => {
      try {
        const updated = await GameClient.getArea(localArea.id).catch(() => null);
        if (!mounted || !updated) return;
        
        // Skip polling update if we recently performed an action (to avoid race conditions)
        const justActed = (Date.now() - lastActionAt) < 3000;
        if (justActed) return;

        // Update local area so child components receive fresh props
        setLocalArea(updated);
        try { window.dispatchEvent(new CustomEvent('area:updated', { detail: { areaId: updated.id, resources: updated.resources, assignments: updated.assignments, idleReasons: updated.idleReasons || {}, units: updated.units } })); } catch (e) {}
      } catch (e) { /* ignore */ }
    }, tickMs);
    return () => { mounted = false; clearInterval(id); };
  }, [localArea && localArea.id, lastActionAt]);

  return (
    <div className="area-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Global Dashboard (Fixed Top) */}
      <AreaOverviewPanel 
        areaId={localArea?.id}
        areaName={localArea?.name} 
        coordinates={localArea?.id} 
        stats={localArea?.stats} 
        resources={localArea?.resources}
        queue={localArea?.queue} 
        units={localArea?.units}
        assignments={localArea?.assignments}
        ownerName={localArea?.ownerName}
        compact={false}
        onRefresh={refreshArea}
        onAssignVillagers={handleAssign}
      />

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        padding: '12px 20px 0 20px', 
        borderBottom: '2px solid var(--wood-dark)',
        background: 'rgba(0,0,0,0.1)'
      }}>
        {['buildings', 'military', 'research'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            className="font-cinzel"
            style={{
              background: tab === t ? 'var(--accent-gold)' : 'rgba(0,0,0,0.3)',
              color: tab === t ? 'var(--wood-dark)' : 'var(--text-main)',
              border: '2px solid var(--wood-dark)',
              borderBottom: 'none',
              padding: '10px 30px',
              fontSize: '1.1rem',
              fontWeight: 800,
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              opacity: tab === t ? 1 : 0.7,
              textShadow: tab === t ? 'none' : '1px 1px 2px rgba(0,0,0,0.8)',
              transition: 'all 0.2s ease',
              boxShadow: tab === t ? 'inset 0 2px 5px rgba(255,255,255,0.2)' : 'none'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Scrollable Content Area */}
      <div className="scroll-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        
        {/* Construction Queue */}
        {localArea?.queue && localArea.queue.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <QueuePanel 
              queue={localArea.queue} 
              onRefresh={refreshArea} 
              parentAreaId={localArea.id} 
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {tab === 'buildings' && (
            <>
              <ManagementPanel 
                area={localArea}
                buildings={localArea?.buildings || []} 
                queue={localArea?.queue || []}
                onUpgrade={onUpgrade} 
                onAssign={handleAssign}
                filter="all"
              />

                {/* Use ManagementPanel category tabs to show Extraction / Industry / Township views.
                  The separate Overview panels were causing duplicate headings (Industry Overview, Economy Overview)
                  to appear regardless of the selected Management tab. Removing them keeps the building grid
                  focused and controlled by the ManagementPanel's internal category tabs. */}
            </>
          )}

          {tab === 'military' && (
            <MilitaryPanel 
              units={localArea?.units || []}
              buildings={(localArea?.buildings || []).filter(b => b.category === 'Military' || b.tags?.includes('military'))}
              onRecruit={onRecruit}
              onUpgrade={onUpgrade}
            />
          )}

          {tab === 'research' && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}><TechTree /></div>
              <div style={{ width: 360 }}><ResearchStrip area={localArea} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
