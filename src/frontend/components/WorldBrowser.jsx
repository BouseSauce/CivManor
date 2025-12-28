import React, { useState, useMemo, useEffect } from 'react';
import HexGrid from './HexGrid';
import { GameClient } from '../api/client';
import { UnitTypeEnum } from '../../core/constants/enums';
import { getUnitConfig } from '../../core/config/units.js';
import EspionageModal from './EspionageModal';

export default function WorldBrowser({ regions, onViewArea, onClaim, user, selectedAreaId, initialCenterId = null, onSendMessage, onSendSpy, onAttack }) {
  const [claiming, setClaiming] = useState(null);
  const [claimModal, setClaimModal] = useState(null);
  const [attackModal, setAttackModal] = useState(null);
  const [expeditionModal, setExpeditionModal] = useState(null);
  const [espionageModal, setEspionageModal] = useState(null);
  const [tileOverlay, setTileOverlay] = useState(null);
  const [selectedCollectorId, setSelectedCollectorId] = useState(null);
  const [activeMissions, setActiveMissions] = useState([]);
  const [espionageReports, setEspionageReports] = useState([]);
  const [nowTs, setNowTs] = useState(Date.now());
  const MILITARY_KEYS = Object.keys(UnitTypeEnum).filter(k => !['Villager','Scholar'].includes(k));

  const loadEspionage = async () => {
    try {
      const resp = await GameClient.getEspionageReports();
      setEspionageReports(resp.reports || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadEspionage();
    const interval = setInterval(loadEspionage, 5000);
    return () => clearInterval(interval);
  }, []);

  // Flatten all areas from all regions into a single world view
  // Use a "Meta-Spiral" approach:
  // 1. Spiral the regions themselves (each region gets a center point)
  // 2. Spiral the areas within each region around that region's center
  const gridItems = useMemo(() => {
    // Spiral Generation Helper
    const generateSpiral = (n, centerQ = 0, centerR = 0) => {
      const results = [{q: centerQ, r: centerR}];
      if (n <= 1) return results;
      
      let radius = 1;
      while (results.length < n) {
        let q = centerQ;
        let r = centerR - radius;
        
        const moves = [
            {dq: 1, dr: 0},
            {dq: 0, dr: 1},
            {dq: -1, dr: 1},
            {dq: -1, dr: 0},
            {dq: 0, dr: -1},
            {dq: 1, dr: -1}
        ];
        
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                if (results.length >= n) return results;
                results.push({q, r});
                q += moves[i].dq;
                r += moves[i].dr;
            }
        }
        radius++;
      }
      return results;
    };

    // 1. Generate centers for each region (spaced out)
    const regionCenters = generateSpiral(regions.length);
    // Scale the centers so regions form a tight island (3 hexes apart for radius-1 regions)
    const scaledCenters = regionCenters.map(c => ({
        q: c.q * 3,
        r: c.r * 3
    }));

    const landItems = [];
    const regionThemes = [
      { color: '#8A9A5B', icon: 'fa-leaf' },           // Sage
      { color: '#B66E4F', icon: 'fa-mountain' },       // Clay
      { color: '#708090', icon: 'fa-fort-awesome' },   // Slate
      { color: '#C2B280', icon: 'fa-wheat-awn' },      // Sandstone
      { color: '#4A5D23', icon: 'fa-tree' },           // Moss
      { color: '#CC7722', icon: 'fa-hammer' },         // Ochre
      { color: '#E2725B', icon: 'fa-shield-halved' },  // Terracotta
      { color: '#5D4037', icon: 'fa-anchor' },         // Deep Brown
      { color: '#607D8B', icon: 'fa-castle' },         // Blue Grey
      { color: '#8D6E63', icon: 'fa-campground' }      // Brown
    ];

    regions.forEach((region, rIdx) => {
        const center = scaledCenters[rIdx];
        const areaCoords = generateSpiral(region.areas.length, center.q, center.r);
        const theme = regionThemes[rIdx % regionThemes.length];

        region.areas.forEach((area, aIdx) => {
            const {q, r} = areaCoords[aIdx];
            
            // Convert Axial (q, r) to Offset (col, row) for Pointy-Topped Hexes
            const gridX = q + (r - (r & 1)) / 2;
            const gridY = r;

            const terrainTypes = ['forest', 'mountain', 'plains', 'desert'];
            const hash = area.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const terrain = terrainTypes[hash % terrainTypes.length];
            const rotation = ((hash % 5) - 2); 

            landItems.push({
                ...area,
                x: gridX,
                y: gridY,
                q, r,
                regionName: region.name,
                regionColor: theme.color,
                regionIcon: theme.icon,
                owned: area.ownerId === user?.id,
                enemy: area.ownerId && area.ownerId !== user?.id,
                terrain: terrain,
                rotation: rotation,
                isRegionCenter: aIdx === 0, // First area in spiral is the center
                regionLabel: aIdx === 0 ? region.name.replace(/^Region\s+\d+\s+[-–—]\s+/, '') : null
            });
        });
    });

    return landItems;
  }, [regions, user]);

  const handleHexClick = (item) => {
    if (item.empty) return; // Ignore clicks on empty water

    // Open tile overlay instead of immediately navigating
    setTileOverlay(item);
  };

  const closeOverlay = () => setTileOverlay(null);

  const handleOverlayView = (area) => {
    closeOverlay();
    if (onViewArea) onViewArea(area.id, area.ownerId);
  };

  const handleOverlayClaim = (area) => {
    const cartCount = (user && user.inventory && user.inventory.units && user.inventory.units.TradeCart) || 0;
    if (cartCount > 0) {
      setClaimModal({ area: area, name: area.name || '', loading: false });
      closeOverlay();
    } else {
      alert('This area is unowned. You need a Trade Cart to claim it.');
    }
  };

  const handleOverlayExpedition = async (area) => {
    closeOverlay();
    const owned = regions.flatMap(r => r.areas.filter(a => a.ownerId === user?.id));
    if (owned.length === 0) {
      alert('You must own an area to launch an expedition.');
      return;
    }

    const defaultOrigin = owned.find(a => a.id === selectedAreaId) || owned[0];
    
    setExpeditionModal({ 
      target: area, 
      originId: defaultOrigin.id, 
      ownedAreas: owned,
      units: {},
      availableUnits: {},
      showOnlySelected: true,
      loading: true 
    });

    try {
      const data = await GameClient.getArea(defaultOrigin.id);
      const unitsMap = (data.units || []).reduce((m, u) => { m[u.type] = u.count; return m; }, {});
      setExpeditionModal(prev => ({ ...prev, availableUnits: unitsMap || {}, loading: false }));
    } catch (e) {
      console.error(e);
      alert('Failed to fetch origin area units');
      setExpeditionModal(null);
    }
  };

  const handleSendMessage = (area) => {
    closeOverlay();
    if (onSendMessage) return onSendMessage(area);
    const to = area.ownerName || area.ownerId || 'Player';
    const body = prompt(`Send message to ${to}:`, 'Greetings');
    if (body) alert(`(Stub) Message sent to ${to}: "${body}"`);
  };

  const handleSendSpy = async (area) => {
    closeOverlay();
    // Find owned areas with a Watchtower to pick origin
    const ownedWithWatchtower = regions.flatMap(r => r.areas.filter(a => a.ownerId === user?.id && a.hasWatchtower));
    
    if (ownedWithWatchtower.length === 0) {
      alert('You must own an area with a Watchtower to send a spy.');
      return;
    }
    
    // Pick origin (prefer selectedAreaId if owned and has watchtower, else first owned with watchtower)
    const origin = ownedWithWatchtower.find(a => a.id === selectedAreaId) || ownedWithWatchtower[0];
    
    try {
      const resp = await GameClient.sendSpy(area.id, origin.id);
      alert(resp.message || 'Spy mission launched!');
    } catch (err) {
      alert('Failed to send spy: ' + (err.message || err.error || JSON.stringify(err)));
    }
  };

  const handleAttack = async (area) => {
    closeOverlay();
    // Find owned areas to pick origin
    const owned = regions.flatMap(r => r.areas.filter(a => a.ownerId === user?.id));
    if (owned.length === 0) {
      alert('You must own an area to launch an attack.');
      return;
    }

    // Default origin to selectedAreaId if owned, else first owned
    const defaultOrigin = owned.find(a => a.id === selectedAreaId) || owned[0];
    
    // Initialize units map for eligible unit types (exclude Villager/Scholar)
    const eligibleUnitKeys = Object.keys(UnitTypeEnum).filter(k => !['Villager','Scholar'].includes(k));
    const initUnits = eligibleUnitKeys.reduce((m, k) => { m[UnitTypeEnum[k]] = 0; return m; }, {});

    setAttackModal({ 
      target: area, 
      originId: defaultOrigin.id, 
      ownedAreas: owned,
      units: initUnits,
      availableUnits: {},
      loading: true,
      sendAll: false,
      showOnlySelected: false
    });

    // Fetch available units for the default origin
    try {
      const data = await GameClient.getArea(defaultOrigin.id);
      // Normalize units to mapping and ensure zero for missing unit types
      let unitsMap = {};
      if (Array.isArray(data.units)) {
        data.units.forEach(u => { unitsMap[u.type] = u.count || 0; });
      } else if (data.units && typeof data.units === 'object') {
        unitsMap = Object.assign({}, data.units);
      }

      // Ensure eligible keys exist in both maps
      eligibleUnitKeys.forEach(k => {
        const key = UnitTypeEnum[k];
        unitsMap[key] = unitsMap[key] || 0;
      });

      setAttackModal(prev => ({ ...prev, availableUnits: unitsMap || {}, loading: false }));
    } catch (e) {
      console.error(e);
      alert('Failed to fetch origin area units');
      setAttackModal(null);
    }
  };

  // Owned areas for sidebar
  const ownedAreas = regions.flatMap(r => r.areas.filter(a => a.ownerId === user?.id)).map(a => ({ id: a.id, name: a.name }));

  // Load missions for owned areas and keep a live timer for countdowns
  const fetchMissions = async () => {
    if (!user || ownedAreas.length === 0) {
      setActiveMissions([]);
      return;
    }
    try {
      const promises = ownedAreas.map(a => GameClient.getArea(a.id).catch(() => null));
      const results = await Promise.all(promises);
      const missions = [];
      results.forEach((res, idx) => {
        if (!res || !res.missions) return;
        res.missions.forEach(m => {
          if (m.type === 'Expedition' || m.type === 'Attack') {
            missions.push({
              ...m,
              originId: m.originAreaId || ownedAreas[idx].id,
              originName: ownedAreas.find(x => x.id === (m.originAreaId || ownedAreas[idx].id))?.name || (res.name || ownedAreas[idx].name),
              // Try to resolve target name from regions map
              targetName: (() => {
                let tname = m.targetAreaId;
                for (const reg of regions) {
                  const a = reg.areas.find(x => x.id === m.targetAreaId);
                  if (a) { tname = a.name; break; }
                }
                return tname;
              })()
            });
          }
        });
      });
      setActiveMissions(missions);
    } catch (e) {
      console.error('Failed to load missions', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    // Initial load
    fetchMissions();
    // Refresh missions every 5s
    const reloadInterval = setInterval(fetchMissions, 5000);
    // Update now timestamp every second for countdowns
    const tickInterval = setInterval(() => setNowTs(Date.now()), 1000);
    return () => { mounted = false; clearInterval(reloadInterval); clearInterval(tickInterval); };
  }, [user, regions]);

  return (
    <div className="world-view-wrapper" style={{ display: 'flex', height: '100%', background: '#1a1a1a' }}>
      <div className="beveled-panel" style={{ width: '250px', display: 'flex', flexDirection: 'column', zIndex: 20, margin: '12px', padding: '12px' }}>
        <h4 className="font-cinzel" style={{ marginTop: 0, borderBottom: '1px solid #5c4033', paddingBottom: '10px', color: '#e0cda0', fontSize: '1.2em' }}>Your Territories</h4>
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px' }}>
            {ownedAreas.map(a => (
            <div key={a.id} className="standard-card" onClick={() => onViewArea(a.id, user.id)} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '8px', 
                cursor: 'pointer',
                padding: '8px',
                background: 'rgba(0,0,0,0.2)'
            }}>
                {/* Wax Seal Button */}
                <div className="btn-wax-seal" style={{ width: '32px', height: '32px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#8b0000', borderRadius: '50%', color: '#e0cda0', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    <i className="fa-solid fa-crown"></i>
                </div>
                <div className="font-cinzel" style={{ fontWeight: 700, color: '#e0cda0', fontSize: '0.9em' }}>{a.name || a.id}</div>
            </div>
            ))}
        </div>
        {/* Active Expeditions Monitor */}
        <div style={{ marginTop: 10 }}>
          <h5 className="font-cinzel" style={{ margin: '6px 0', color: '#e0cda0', fontSize: '0.95em' }}>Active Expeditions</h5>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {activeMissions.length === 0 && (
              <div style={{ color: '#888', fontSize: '0.9rem' }}>No active expeditions</div>
            )}
            {activeMissions.map(m => {
              const remainingMs = Math.max(0, (m.expectedReturnAt || 0) - nowTs);
              const seconds = Math.floor(remainingMs / 1000);
              const hh = Math.floor(seconds / 3600).toString().padStart(2,'0');
              const mm = Math.floor((seconds % 3600) / 60).toString().padStart(2,'0');
              const ss = Math.floor(seconds % 60).toString().padStart(2,'0');
              const timeLabel = remainingMs > 0 ? `${hh}:${mm}:${ss}` : 'Arriving';
              const unitSummary = m.units ? Object.entries(m.units).map(([k,v]) => `${k}: ${v}`).join(', ') : '';
              return (
                <div key={m.id} className="standard-card" style={{ marginBottom: 8, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#e0cda0' }}>{m.originName || m.originId}</div>
                    <div style={{ fontSize: '0.85rem', color: '#ccc' }}>{timeLabel}</div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#ddd' }}>{m.originName} → {m.targetName || m.targetAreaId}</div>
                  <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#bbb' }}>{unitSummary}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="draggable-map-area" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <HexGrid 
          items={gridItems} 
          className="micro" // Use micro size for the big world view
          selectedId={selectedAreaId || initialCenterId}
          onHexClick={handleHexClick}
          renderHexContent={(item) => {
            if (item.empty) return null; // Empty water tiles have no content
            const isSelected = item.id === selectedAreaId;
            
            // Espionage: Find reports for this area
            const reports = espionageReports.filter(r => r.areaId === item.id);
            const hasShadowGuild = item.owned && item.buildings && item.buildings.some(b => b.id === 'ShadowGuild' && b.level > 0);

            return (
            <>
              {/* Detection Radius Pulse (Radar) */}
              {hasShadowGuild && (
                <div className="radar-pulse" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200%',
                  height: '200%',
                  border: '2px solid rgba(0, 255, 0, 0.2)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 10,
                  animation: 'pulse 3s infinite'
                }} />
              )}

              {/* Movement Arrows from Espionage Reports */}
              {reports.map(r => {
                const rotation = {
                  'North': 0, 'North-East': 45, 'East': 90, 'South-East': 135,
                  'South': 180, 'South-West': 225, 'West': 270, 'North-West': 315
                }[r.direction] || 0;

                return (
                  <div key={r.id} style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-40px)`,
                    zIndex: 30,
                    color: '#ffeb3b',
                    textShadow: '0 0 5px #000',
                    fontSize: '1.5rem',
                    animation: 'bounce 1s infinite ease-in-out'
                  }}>
                    <i className="fa-solid fa-arrow-up"></i>
                  </div>
                );
              })}

              {/* Centered enemy icon: prominent, red, with shadow */}
              {item.enemy && (
                <div className="owned-center enemy" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 25 }}>
                  <i className="fa-solid fa-skull-crossbones" style={{ fontSize: '2.2rem', color: '#d32f2f' }}></i>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#fff', 
                    fontWeight: 'bold', 
                    textShadow: '1px 1px 2px #000',
                    marginTop: -4,
                    background: 'rgba(183, 28, 28, 0.8)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.ownerName || 'Enemy'}
                  </div>
                </div>
              )}

              {/* Centered owned icon: prominent, gold, with shadow */}
              {item.owned && (
                <div className="owned-center" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 25 }}>
                  <i className="fa-solid fa-crown" style={{ fontSize: '2.2rem' }}></i>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#000', 
                    fontWeight: 'bold', 
                    marginTop: -4,
                    background: 'rgba(255, 215, 0, 0.9)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    YOU
                  </div>
                </div>
              )}

              {/* Centered neutral/other owner icon */}
              {item.ownerId && !item.owned && !item.enemy && (
                <div className="owned-center neutral" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 25 }}>
                  <i className="fa-solid fa-certificate" style={{ fontSize: '2.2rem', color: '#5d4037' }}></i>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#fff', 
                    fontWeight: 'bold', 
                    marginTop: -4,
                    background: 'rgba(93, 64, 55, 0.8)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.ownerName || 'Settler'}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', pointerEvents: 'none', height: '100%', justifyContent: 'center' }}>
                {/* Thematic Region Icon in the center of the region */}
                {item.isRegionCenter && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    fontSize: '3rem', 
                    opacity: 0.25, 
                    color: '#000',
                    zIndex: 0 
                  }}>
                    <i className={`fa-solid ${item.regionIcon}`}></i>
                  </div>
                )}

                {item.terrain === 'forest' && (
                  <div style={{ position: 'relative', width: 60, height: 60 }}>
                    <i className="fa-solid fa-tree" style={{ position: 'absolute', top: 5, left: 15, color: '#2e7d32', fontSize: '2rem' }}></i>
                    <i className="fa-solid fa-tree" style={{ position: 'absolute', top: 20, left: 0, color: '#388e3c', fontSize: '1.6rem' }}></i>
                    <i className="fa-solid fa-tree" style={{ position: 'absolute', top: 20, right: 0, color: '#43a047', fontSize: '1.6rem' }}></i>
                  </div>
                )}
                {item.terrain === 'mountain' && (
                  <div style={{ position: 'relative', width: 60, height: 60 }}>
                    <i className="fa-solid fa-mountain" style={{ position: 'absolute', top: 10, left: 10, color: '#5d4037', fontSize: '2.2rem' }}></i>
                    <i className="fa-solid fa-mountain" style={{ position: 'absolute', top: 25, right: 0, color: '#795548', fontSize: '1.4rem' }}></i>
                  </div>
                )}
                {item.terrain === 'plains' && (
                  <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                     {/* Less intrusive plains icon */}
                  </div>
                )}

                {/* Always-visible salvage badge (shows total salvage on the tile) */}
                {(() => {
                  const salvageObj = item.salvagePool || item.salvage || {};
                  const salvageTotal = Object.values(salvageObj || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
                  if (salvageTotal > 0) {
                    const label = salvageTotal > 999 ? '999+' : String(salvageTotal);
                    return (
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        zIndex: 150, 
                        pointerEvents: 'auto',
                        animation: 'bounce 2s infinite'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          background: 'linear-gradient(135deg, #ff6f00, #ffca28)', 
                          color: '#fff', 
                          padding: '4px 10px', 
                          borderRadius: 20, 
                          fontSize: '0.9rem', 
                          fontWeight: 900, 
                          boxShadow: '0 0 15px rgba(255, 165, 0, 0.9), 0 4px 8px rgba(0,0,0,0.5)',
                          border: '2px solid #fff',
                          whiteSpace: 'nowrap',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }} title={Object.entries(salvageObj).map(([k,v])=>`${k}: ${v}`).join('\n')}>
                          <i className="fa-solid fa-box-open" style={{ fontSize: '1.1rem' }}></i>
                          <span>{label}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {item.terrain === 'desert' && (
                  <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <i className="fa-solid fa-sun" style={{ position: 'absolute', top: 0, right: 0, color: '#f57f17', fontSize: '1.5rem', opacity: 0.9 }}></i>
                  </div>
                )}
                {item.terrain === 'water' && (
                  <div><i className="fa-solid fa-water" style={{ color: '#0288d1', fontSize: '2rem', opacity: 0.7 }}></i></div>
                )}
                
                {/* Tile Label - Only show if selected */}
                {isSelected && item.name && (
                  <div className="hex-label" style={{ 
                      marginTop: 4,
                      fontSize: '0.85rem', 
                      fontWeight: 'bold', 
                      color: '#3e2723',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #3e2723',
                      whiteSpace: 'nowrap',
                      maxWidth: '140px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'center',
                      zIndex: 60
                  }}>{item.name}</div>
                )}
              </div>
            </>
          )}}
        />

        
      </div>

      {/* Tile overlay: top-level overlay when a tile is clicked */}
      {tileOverlay && (
        <div className="claim-modal-overlay" onClick={() => closeOverlay()}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 360 }}>
            <div className="panel-header">{tileOverlay.name || 'Unknown Area'}</div>
            <div className="panel-body">
              <div style={{ marginBottom: 8 }}><em>{tileOverlay.regionName}</em></div>

              {tileOverlay.ownerId ? (
                // Occupied
                <>
                  {/* Collect salvage button (if salvage present) */}
                  {(() => {
                    const salvageObj = tileOverlay.salvage || tileOverlay.salvagePool || {};
                    const hasSalvage = Object.values(salvageObj).some(v => typeof v === 'number' && v > 0);
                    if (hasSalvage && ownedAreas.length > 0) {
                      const defaultCollector = ownedAreas.find(a => a.id === selectedAreaId) || ownedAreas[0];
                      const collectorId = selectedCollectorId || defaultCollector.id;
                      return (
                        <div style={{ marginBottom: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <select className="btn" value={collectorId} onChange={e => setSelectedCollectorId(e.target.value)} style={{ background: '#333', color: '#fff' }}>
                            {ownedAreas.map(a => <option key={a.id} value={a.id}>{a.name || a.id}</option>)}
                          </select>
                          <button className="btn btn-primary" onClick={async () => {
                            try {
                              const resp = await GameClient.collectSalvage(tileOverlay.id, selectedCollectorId || defaultCollector.id);
                              alert('Collected salvage: ' + JSON.stringify(resp.transferred || {}));
                              // Refresh collector area state and request world refresh
                              try { await GameClient.getArea(selectedCollectorId || defaultCollector.id); } catch(e){}
                              // Ask dashboard to refresh regions
                              try { window.dispatchEvent(new CustomEvent('areas:refresh')); } catch (e) {}
                              closeOverlay();
                            } catch (err) {
                              alert('Failed to collect salvage: ' + (err.message || err.error || JSON.stringify(err)));
                            }
                          }}>Collect Salvage</button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div style={{ marginBottom: 8 }}>Owner: <strong>{tileOverlay.ownerName || tileOverlay.ownerId}</strong></div>
                  {/* If scouted information exists, show it */}
                  {tileOverlay.scoutedInfo || tileOverlay.scoutReport ? (
                    <div style={{ marginBottom: 8 }}>
                      <div><strong>Scouted Info</strong></div>
                      <div style={{ fontSize: '0.9rem', color: '#333' }}>{JSON.stringify(tileOverlay.scoutedInfo || tileOverlay.scoutReport)}</div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 8, color: '#666' }}>Area not scouted. Limited information available.</div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={() => handleOverlayView(tileOverlay)}>View</button>
                    <button className="btn" onClick={() => handleSendMessage(tileOverlay)}>Message</button>
                    <button className="btn" onClick={() => setEspionageModal(tileOverlay)}>Spy / Intel</button>
                    <button className="btn" onClick={() => handleSendSpy(tileOverlay)}>Send Spy</button>
                    <button className="btn btn-danger" onClick={() => handleAttack(tileOverlay)}>Attack</button>
                  </div>
                </>
              ) : (
                // Unowned
                <>
                  {/* Collect salvage button for unowned tile */}
                  {(() => {
                    const salvageObj = tileOverlay.salvage || tileOverlay.salvagePool || {};
                    const hasSalvage = Object.values(salvageObj).some(v => typeof v === 'number' && v > 0);
                    if (hasSalvage && ownedAreas.length > 0) {
                      const defaultCollector = ownedAreas.find(a => a.id === selectedAreaId) || ownedAreas[0];
                      const collectorId = selectedCollectorId || defaultCollector.id;
                      return (
                        <div style={{ marginBottom: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <select className="btn" value={collectorId} onChange={e => setSelectedCollectorId(e.target.value)} style={{ background: '#333', color: '#fff' }}>
                            {ownedAreas.map(a => <option key={a.id} value={a.id}>{a.name || a.id}</option>)}
                          </select>
                          <button className="btn btn-primary" onClick={async () => {
                            try {
                              const resp = await GameClient.collectSalvage(tileOverlay.id, selectedCollectorId || defaultCollector.id);
                              alert('Collected salvage: ' + JSON.stringify(resp.transferred || {}));
                              // Refresh collector area state and request world refresh
                              try { await GameClient.getArea(selectedCollectorId || defaultCollector.id); } catch(e){}
                              try { window.dispatchEvent(new CustomEvent('areas:refresh')); } catch (e) {}
                              closeOverlay();
                            } catch (err) {
                              alert('Failed to collect salvage: ' + (err.message || err.error || JSON.stringify(err)));
                            }
                          }}>Collect Salvage</button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div style={{ marginBottom: 8, color: '#3e2723' }}><strong>Unowned</strong></div>
                  <div style={{ marginBottom: 12 }}>You may claim this territory if you have a Trade Cart, or send an expedition to scavenge for resources.</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={() => closeOverlay()}>Close</button>
                    <button className="btn" onClick={() => handleOverlayExpedition(tileOverlay)}>Expedition</button>
                    <button className="btn btn-claim" onClick={() => handleOverlayClaim(tileOverlay)}>Claim</button>
                  </div>
                </>
              )}
              {/* Salvage icon: show if tile has salvage resources to collect */}
              {(tileOverlay.salvage || tileOverlay.salvagePool) && (() => {
                const salvageObj = tileOverlay.salvage || tileOverlay.salvagePool || {};
                const hasSalvage = Object.values(salvageObj).some(v => typeof v === 'number' && v > 0);
                if (!hasSalvage) return null;
                return (
                  <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 80, pointerEvents: 'none' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-box-open" style={{ color: '#ffd54f', fontSize: '1.0rem' }}></i>
                      <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>Salvage</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Claim modal overlay: appears centered above the map when user attempts to claim an unowned area */}
      {claimModal && (
        <div className="claim-modal-overlay" onClick={() => { if (!claimModal.loading) setClaimModal(null); }}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">Claim Area</div>
            <div className="panel-body">
              <div style={{ marginBottom: 8 }}>Claim <strong>{claimModal.area.name}</strong> in <em>{claimModal.area.regionName}</em>?</div>
              <input value={claimModal.name} onChange={e => setClaimModal({ ...claimModal, name: e.target.value })} style={{ width: '100%', marginBottom: 10 }} placeholder="New Area Name (optional)" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => { if (!claimModal.loading) setClaimModal(null); }} disabled={claimModal.loading}>Cancel</button>
                <button className="btn btn-claim" disabled={claimModal.loading} onClick={async () => {
                  try {
                    setClaimModal({ ...claimModal, loading: true });
                    await onClaim(claimModal.area.id, claimModal.name);
                    setClaimModal(null);
                  } catch (err) {
                    console.error('Claim failed', err);
                    alert('Failed to claim area');
                    setClaimModal({ ...claimModal, loading: false });
                  }
                }}>{claimModal.loading ? 'Claiming...' : 'Confirm Claim'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attack modal overlay */}
      {attackModal && (
        <div className="claim-modal-overlay" onClick={() => setAttackModal(null)}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 400 }}>
            <div className="panel-header">Launch Attack</div>
            <div className="panel-body">
              <div style={{ marginBottom: 12 }}>Target: <strong>{attackModal.target.name}</strong></div>
              
              <div style={{ marginBottom: 12 }}>
                <label className="font-cinzel" style={{ display: 'block', fontSize: '0.8rem', color: '#aaa' }}>Origin Area</label>
                <select 
                  className="btn" 
                  style={{ width: '100%', background: '#333', color: '#fff', display: 'block' }}
                  value={attackModal.originId}
                  onChange={async (e) => {
                    const newId = e.target.value;
                    setAttackModal(prev => ({ ...prev, originId: newId, loading: true }));
                    try {
                      const data = await GameClient.getArea(newId);
                      setAttackModal(prev => ({ ...prev, availableUnits: data.units || {}, loading: false }));
                    } catch (err) { alert('Failed to fetch units'); }
                  }}
                >
                  {attackModal.ownedAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="font-cinzel" style={{ display: 'block', fontSize: '0.8rem', color: '#aaa' }}>Units to Send</label>
                {attackModal.loading ? <div>Loading units...</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={!!attackModal.sendAll} onChange={(e) => {
                        const checked = !!e.target.checked;
                        if (checked) {
                          // copy availableUnits into units
                          const all = {};
                          MILITARY_KEYS.forEach(k => { const id = UnitTypeEnum[k]; all[id] = attackModal.availableUnits[id] || 0; });
                          setAttackModal(prev => ({ ...prev, units: all, sendAll: true }));
                        } else {
                          const zeros = {}; MILITARY_KEYS.forEach(k => { zeros[UnitTypeEnum[k]] = 0; });
                          setAttackModal(prev => ({ ...prev, units: zeros, sendAll: false }));
                        }
                      }} /> Send All Available
                    </label>

                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={!!attackModal.showOnlySelected} onChange={(e) => {
                        const checked = !!e.target.checked;
                        setAttackModal(prev => ({ ...prev, showOnlySelected: checked }));
                      }} /> Show Only Sent
                    </label>

                    <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 8 }}>
                      {(() => {
                        const visibleKeys = MILITARY_KEYS.filter(k => {
                          if (!attackModal.showOnlySelected) return true;
                          const id = UnitTypeEnum[k];
                          return (attackModal.units && (attackModal.units[id] || 0) > 0);
                        });
                        if (visibleKeys.length === 0) return <div style={{ color: '#888' }}>No units selected to send.</div>;
                        return visibleKeys.map(k => {
                        const id = UnitTypeEnum[k];
                        const cfg = getUnitConfig(id) || {};
                        const avail = attackModal.availableUnits[id] || 0;
                        const val = (attackModal.units && (attackModal.units[id] !== undefined)) ? attackModal.units[id] : 0;
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: '0.9rem' }}>
                            <i className={`fa-solid ${cfg.icon || 'fa-user'}`} style={{ color: '#e0cda0', width: 22, textAlign: 'center' }}></i>
                            <span style={{ flex: 1, fontSize: '0.9rem' }}>{cfg.name || id} <small style={{ color: '#bbb' }}>(Available: {avail})</small></span>
                            <input
                              type="number"
                              className="btn"
                              style={{ width: 64, background: '#000', color: '#fff', padding: '4px 6px', fontSize: '0.9rem' }}
                              value={val}
                              onChange={e => {
                                const v = Math.max(0, Math.min(avail, parseInt(e.target.value) || 0));
                                setAttackModal(prev => ({ ...prev, units: { ...prev.units, [id]: v }, sendAll: false }));
                              }}
                            />
                            <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => {
                              const all = attackModal.availableUnits[id] || 0;
                              setAttackModal(prev => ({ ...prev, units: { ...prev.units, [id]: all }, sendAll: false }));
                            }}>All</button>
                          </div>
                        );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setAttackModal(null)}>Cancel</button>
                <button 
                  className="btn btn-danger" 
                  disabled={attackModal.loading || (Object.values(attackModal.units || {}).reduce((a,b) => a + (Number(b)||0), 0) <= 0)}
                  onClick={async () => {
                    try {
                      const resp = await GameClient.attackArea(attackModal.originId, attackModal.target.id, attackModal.units);
                      // Dispatch short in-app message and notify global notification listeners
                      try { window.dispatchEvent(new CustomEvent('message:notif', { detail: { text: `Attack launched from ${attackModal.originId} → ${attackModal.target.name}` } })); } catch (e) {}
                      try { window.dispatchEvent(new CustomEvent('notifications:changed')); } catch (e) {}
                      // Refresh missions immediately so the launched attack appears in Active Expeditions
                      try { await fetchMissions(); } catch (e) { /* ignore */ }
                      setAttackModal(null);
                    } catch (err) {
                      alert('Failed to launch attack: ' + (err.message || err.error || 'Unknown error'));
                    }
                  }}
                >
                  Launch Attack
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expedition modal overlay */}
      {expeditionModal && (
        <div className="claim-modal-overlay" onClick={() => setExpeditionModal(null)}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 400 }}>
            <div className="panel-header">Launch Expedition</div>
            <div className="panel-body">
              <div style={{ marginBottom: 12 }}>Target: <strong>{expeditionModal.target.name || expeditionModal.target.id}</strong></div>
              <div style={{ marginBottom: 12, fontSize: '0.9rem', color: '#ccc' }}>
                Expeditions scavenge unowned lands for resources, but carry risks of ambush or total loss.
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label className="font-cinzel" style={{ display: 'block', fontSize: '0.8rem', color: '#aaa' }}>Origin Area</label>
                <select 
                  className="btn" 
                  style={{ width: '100%', background: '#333', color: '#fff', display: 'block' }}
                  value={expeditionModal.originId}
                  onChange={async (e) => {
                    const newId = e.target.value;
                    setExpeditionModal(prev => ({ ...prev, originId: newId, loading: true }));
                    try {
                      const data = await GameClient.getArea(newId);
                      // Normalize units to a mapping and ensure Villagers reflect idle count (total - assigned)
                      let unitsMap = {};
                      if (Array.isArray(data.units)) {
                        data.units.forEach(u => { unitsMap[u.type] = u.count || 0; });
                      } else if (data.units && typeof data.units === 'object') {
                        unitsMap = Object.assign({}, data.units);
                      }
                      const assignedTotal = Object.values(data.assignments || {}).reduce((a, b) => a + (b || 0), 0);
                      const totalVillagers = unitsMap[UnitTypeEnum.Villager] || 0;
                      const idleVillagers = Math.max(0, totalVillagers - assignedTotal);
                      unitsMap[UnitTypeEnum.Villager] = idleVillagers;
                      setExpeditionModal(prev => ({ ...prev, availableUnits: unitsMap, loading: false }));
                    } catch (err) { alert('Failed to fetch units'); }
                  }}
                >
                  {expeditionModal.ownedAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="font-cinzel" style={{ display: 'block', fontSize: '0.8rem', color: '#aaa' }}>Units to Send</label>
                {expeditionModal.loading ? <div>Loading units...</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={!!expeditionModal.sendAll} onChange={(e) => {
                        const checked = !!e.target.checked;
                        const EXPEDITION_KEYS = [...MILITARY_KEYS, 'Villager'];
                        if (checked) {
                          const all = {};
                          EXPEDITION_KEYS.forEach(k => { const id = UnitTypeEnum[k]; all[id] = expeditionModal.availableUnits[id] || 0; });
                          setExpeditionModal(prev => ({ ...prev, units: all, sendAll: true }));
                        } else {
                          const zeros = {}; EXPEDITION_KEYS.forEach(k => { zeros[UnitTypeEnum[k]] = 0; });
                          setExpeditionModal(prev => ({ ...prev, units: zeros, sendAll: false }));
                        }
                      }} /> Send All Available
                    </label>

                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={!!expeditionModal.showOnlySelected} onChange={(e) => {
                        const checked = !!e.target.checked;
                        setExpeditionModal(prev => ({ ...prev, showOnlySelected: checked }));
                      }} /> Show Only Sent
                    </label>

                    <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 8 }}>
                      {(() => {
                        const EXPEDITION_KEYS = [...MILITARY_KEYS, 'Villager'];
                        const visibleKeys = EXPEDITION_KEYS.filter(k => {
                          if (!expeditionModal.showOnlySelected) return true;
                          const id = UnitTypeEnum[k];
                          return (expeditionModal.units && (expeditionModal.units[id] || 0) > 0);
                        });
                        if (visibleKeys.length === 0) return <div style={{ color: '#888' }}>No units selected to send.</div>;
                        return visibleKeys.map(k => {
                          const id = UnitTypeEnum[k];
                          const cfg = getUnitConfig(id) || {};
                          const avail = expeditionModal.availableUnits[id] || 0;
                          const val = (expeditionModal.units && (expeditionModal.units[id] !== undefined)) ? expeditionModal.units[id] : 0;
                          return (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: '0.9rem' }}>
                              <i className={`fa-solid ${cfg.icon || 'fa-user'}`} style={{ color: '#e0cda0', width: 22, textAlign: 'center' }}></i>
                              <span style={{ flex: 1, fontSize: '0.9rem' }}>{cfg.name || id} <small style={{ color: '#bbb' }}>(Available: {avail})</small></span>
                              <input
                                type="number"
                                className="btn"
                                style={{ width: 64, background: '#000', color: '#fff', padding: '4px 6px', fontSize: '0.9rem' }}
                                value={val}
                                onChange={e => {
                                  const v = Math.max(0, Math.min(avail, parseInt(e.target.value) || 0));
                                  setExpeditionModal(prev => ({ ...prev, units: { ...prev.units, [id]: v }, sendAll: false }));
                                }}
                              />
                              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => {
                                const all = expeditionModal.availableUnits[id] || 0;
                                setExpeditionModal(prev => ({ ...prev, units: { ...prev.units, [id]: all }, sendAll: false }));
                              }}>All</button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setExpeditionModal(null)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  disabled={expeditionModal.loading || (Object.values(expeditionModal.units || {}).reduce((a,b) => a + (Number(b)||0), 0) <= 0)}
                  onClick={async () => {
                    try {
                      await GameClient.launchExpedition(expeditionModal.originId, expeditionModal.target.id, expeditionModal.units);
                      alert('Expedition launched! Units are in transit.');
                      setExpeditionModal(null);
                    } catch (err) {
                      alert('Failed to launch expedition: ' + (err.message || err.error || 'Unknown error'));
                    }
                  }}
                >
                  Launch Expedition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {espionageModal && (
        <EspionageModal
          isOpen={!!espionageModal}
          onClose={() => setEspionageModal(null)}
          targetAreaId={espionageModal.id}
          targetName={espionageModal.name}
          user={user}
          regions={regions}
        />
      )}
    </div>
  );
}


