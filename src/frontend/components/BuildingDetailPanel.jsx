import React from 'react';
import { createPortal } from 'react-dom';
import { getColorForIconClass, getIconForResource } from '../constants/iconMaps';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import { GAME_CONFIG } from '../../core/config/gameConfig.js';
import { GameClient } from '../api/client';
import { useState, useEffect } from 'react';

export default function BuildingDetailPanel({ building, onClose, onAssignVillagers, onUpgrade }) {
  if (!building) return null;

  const renderIcon = (icon) => {
    if (!icon) return <i className="fa-solid fa-building" style={{ fontSize: 28, color: '#ddd' }} />;
    if (icon.startsWith('fa-')) {
      const color = getColorForIconClass(icon.toLowerCase());
      return <i className={icon} style={{ fontSize: 28, color }} />;
    }
    return icon;
  };

  const level = building.level || 0;
  const isLocked = !!building.isLocked; // prereqs locked
  const notBuilt = level < 1;
  const maxAssigned = Math.floor(3 + (level * 1.5));
  const disallowAssignments = building.id === 'TownHall' || (building.tags && building.tags.includes('housing'));
  const buildLabel = building && building.isUpgrading ? 'Upgrading' : (level > 0 ? 'Upgrade' : 'Build');
  const [upgradeSecs, setUpgradeSecs] = useState((building && building.upgradeSecondsRemaining) || null);
  const [localAssigned, setLocalAssigned] = useState(building.assigned || 0);
  const [showTownTooltip, setShowTownTooltip] = useState(false);

  useEffect(() => {
    setLocalAssigned(building.assigned || 0);
  }, [building && building.assigned]);

  // Listen for area updates (assignments/units) so the detail panel updates without full refresh
  useEffect(() => {
    const cb = (e) => {
      try {
        const d = e && e.detail;
        if (!d) return;
        // If the updated assignments include this building, refresh localAssigned
        if (d.assignments && typeof d.assignments[building.id] !== 'undefined') {
          setLocalAssigned(d.assignments[building.id] || 0);
        }
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('area:updated', cb);
    return () => window.removeEventListener('area:updated', cb);
  }, [building && building.id]);

  useEffect(() => {
    setUpgradeSecs((building && (typeof building.upgradeSecondsRemaining !== 'undefined')) ? building.upgradeSecondsRemaining : null);
  }, [building && building.upgradeSecondsRemaining]);

  useEffect(() => {
    if (upgradeSecs == null) return;
    const id = setInterval(() => {
      setUpgradeSecs(s => (s > 0 ? s - 1 : 0));
    }, GAME_CONFIG.TICK_MS);
    return () => clearInterval(id);
  }, [upgradeSecs]);

  const panel = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}></div>

      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(720px, calc(100% - 40px))', maxWidth: 'calc(100% - 40px)', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', padding: 16, borderRadius: 6, backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}>
              {(() => {
                const iconClass = building.icon || (BUILDING_CONFIG[building.id] && BUILDING_CONFIG[building.id].icon) || null;
                return renderIcon(iconClass);
              })()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-header)', color: 'var(--accent-gold)', fontSize: '1.15rem', fontWeight: 700 }}>{building.displayName || building.name}</div>
                { (building.housingByLevel || building.researchSlotsByLevel) && (
                  <div style={{ position: 'relative' }} onMouseEnter={() => setShowTownTooltip(true)} onMouseLeave={() => setShowTownTooltip(false)}>
                    <i className="fa-solid fa-circle-info" style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }} />
                    {showTownTooltip && (
                      <div style={{ position: 'absolute', top: '120%', left: 0, minWidth: 220, background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', padding: 8, borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.6)', zIndex: 10000 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Town Info</div>
                        {building.housingByLevel && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Housing per level</div>
                            <div style={{ fontSize: 13 }}>
                              {building.housingByLevel.map((cap, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}><div>Lvl {idx}</div><div style={{ fontWeight: 700 }}>{cap}</div></div>
                              ))}
                            </div>
                          </div>
                        )}
                        {building.researchSlotsByLevel && (
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Research slots</div>
                            <div style={{ fontSize: 13 }}>
                              {building.researchSlotsByLevel.map((slots, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}><div>Lvl {idx}</div><div style={{ fontWeight: 700 }}>{slots}</div></div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Level {building.level || 0}</div>
            </div>
          </div>

          <button className="btn" onClick={onClose} style={{ padding: '6px 8px' }}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div style={{ color: '#ddd', marginBottom: 10 }}>{building.description || (BUILDING_CONFIG[building.id] && BUILDING_CONFIG[building.id].description) || 'No description available.'}</div>

        {/* Related Research */}
        {building.relatedTechs && building.relatedTechs.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Related Research</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {building.relatedTechs.map(t => (
                <div key={t.id} style={{ padding: '6px 8px', borderRadius: 6, background: t.researched ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.02)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: t.researched ? 'var(--accent-green)' : 'var(--text-muted)' }}>{t.id}</div>
                  {!t.researched && !isLocked && (
                    <button className='btn' style={{ marginLeft: 6 }} onClick={async () => {
                      try {
                        await GameClient.startResearch(t.id);
                        alert('Research started: ' + t.id);
                        window.location.reload();
                      } catch (err) { console.error(err); alert(err && err.message ? err.message : 'Failed to start research'); }
                    }}>Start</button>
                  )}
                  {!t.researched && isLocked && (
                    <div style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-muted)' }}>Locked</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {((building.productionPerSecond && Object.keys(building.productionPerSecond).length > 0) || (building.perWorkerRates && Object.keys(building.perWorkerRates).length > 0)) && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Production</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              { // prefer per-worker rates if provided so we can compute live totals based on `localAssigned`
                (() => {
                  const entries = [];
                  const prod = building.productionPerSecond || {};
                  const perWorker = building.perWorkerRates || {};
                  // collect resource keys
                  const keys = new Set([...Object.keys(prod || {}), ...Object.keys(perWorker || {})]);
                  keys.forEach(res => {
                    const def = getIconForResource(res) || { icon: 'fa-box', color: '#bbb' };
                    const pw = perWorker[res] || null;
                    const serverTotal = prod[res] || 0;
                    // If per-worker available, compute live total using localAssigned; otherwise use server total
                    const liveTotal = (pw != null) ? (pw * (localAssigned || 0)) : serverTotal;
                    // Convert to per-hour for display
                    const displayTotalPerHour = Number((liveTotal || 0) * 3600).toFixed(1);
                    const displayWorkerPerHour = pw != null ? Number(pw * 3600).toFixed(1) : null;
                    entries.push(
                      <div key={res} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                        <i className={"fa-solid " + def.icon} style={{ color: def.color }} />
                        <div style={{ fontWeight: 700 }}>{displayTotalPerHour}/hr</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{res}</div>
                        {displayWorkerPerHour && (
                          <div style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>({displayWorkerPerHour}/worker/hr)</div>
                        )}
                      </div>
                    );
                  });
                  return entries;
                })()
              }
            </div>
          </div>
        )}

        {building.isLocked && building.missingReqs && building.missingReqs.length > 0 && (
          <div style={{ marginBottom: 10, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
            <div style={{ color: '#e0cda0', fontWeight: 700, marginBottom: 6 }}>Missing prerequisites</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{building.missingReqs.map((m, i) => <div key={i}>{m}</div>)}</div>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Assigned Villagers</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <button className="btn" disabled={(isLocked || notBuilt || disallowAssignments) || (localAssigned || 0) <= 0} title={(isLocked || notBuilt) ? 'Cannot assign workers to locked or unbuilt buildings' : (disallowAssignments ? 'Cannot assign villagers to the Settlement/Town Hall' : '')} onClick={async () => {
                if (isLocked || notBuilt) return;
                const next = Math.max(0, (localAssigned || 0) - 1);
                setLocalAssigned(next);
                try { if (onAssignVillagers) await onAssignVillagers(building.id, next); } catch (e) { setLocalAssigned(building.assigned || 0); }
            }}>-</button>
            <div style={{ minWidth: 80, textAlign: 'center', fontWeight: 700 }}>{(localAssigned || 0)} / {maxAssigned}</div>
            <button className="btn" disabled={(isLocked || notBuilt || disallowAssignments) || (localAssigned || 0) >= maxAssigned} title={(isLocked || notBuilt) ? 'Cannot assign workers to locked or unbuilt buildings' : (disallowAssignments ? 'Cannot assign villagers to the Settlement/Town Hall' : '')} onClick={async () => {
                if (isLocked || notBuilt) return;
                const next = Math.min(maxAssigned, (localAssigned || 0) + 1);
                if (next === (localAssigned || 0)) return;
                setLocalAssigned(next);
                try { if (onAssignVillagers) await onAssignVillagers(building.id, next); } catch (e) { setLocalAssigned(building.assigned || 0); }
            }}>+</button>
          </div>
          {(isLocked || notBuilt || disallowAssignments) && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>This building is {notBuilt ? 'not yet constructed' : isLocked ? 'locked' : 'a settlement'} — assignments and research are unavailable.</div>}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Max per building: {maxAssigned} (3 + level × 1.5)</div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Upgrade
            {upgradeSecs != null && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>&nbsp;• Time remaining: <span style={{ fontWeight: 700 }}>{Math.ceil(upgradeSecs * GAME_CONFIG.TICK_MS / 1000)}s</span>{building.upgradeTime ? ` • Total: ${Math.ceil(building.upgradeTime * GAME_CONFIG.TICK_MS / 1000)}s` : ''}</div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {Object.entries(building.upgradeCost || {}).map(([res, amt]) => {
                const def = getIconForResource(res) || { icon: 'fa-box', color: '#bbb' };
                return (
                  <div key={res} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.03)' }}>
                    <i className={"fa-solid " + def.icon} style={{ color: def.color }} />
                    <div style={{ fontWeight: 700, color: '#ddd' }}>{amt}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{res}</div>
                  </div>
                );
              })}
              {building.upgradeTime && !building.isUpgrading && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.03)' }}>
                    <i className="fa-solid fa-clock" style={{ color: '#bbb' }} />
                    <div style={{ fontWeight: 700, color: '#ddd' }}>{Math.ceil(building.upgradeTime * GAME_CONFIG.TICK_MS / 1000 / 60)}m</div>
                  </div>
              )}
            </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <button className="btn btn-build" disabled={isLocked || building.isUpgrading} onClick={() => { if (!isLocked && onUpgrade) onUpgrade(building.id); }}>{buildLabel}</button>
              {building.isUpgrading && (
                <div style={{ width: 160, height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                  <div style={{ width: `${building.progress || 0}%`, height: '100%', background: 'var(--accent-green)', borderRadius: 6 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render overlay at document.body level to avoid clipping by transformed/stacked parents
  return typeof document !== 'undefined' ? createPortal(panel, document.body) : panel;
}

