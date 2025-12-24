import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getColorForIconClass, getIconForResource } from '../constants/iconMaps';
import { BUILDING_CONFIG, computeTotalLevelCost, computeTotalProductionExtraction } from '../../core/config/buildings.js';
import { calculateBuildTime } from '../../core/logic/scaling.js';
import { GAME_CONFIG } from '../../core/config/gameConfig.js';
import { PRODUCTION_RATES, PRODUCTION_GROWTH, WORKER_EXP, PRODUCTION_GLOBAL_MULTIPLIER } from '../../core/config/production_fixed.js';
import { GameClient } from '../api/client';
import { getUnitConfig, ALL_UNITS } from '../../core/config/units.js';
import { ResourceEnum } from '../../core/constants/enums.js';
// Research panel removed: building detail now shows locked requirements inline

// --- Helper Components ---
const Stepper = ({ value, min = 0, max, onChange, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {label && <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</label>}
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>-</button>
      <input type="number" value={value} readOnly />
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  </div>
);

const SegmentedProgress = ({ current, max, label }) => {
  const segments = [];
  for (let i = 0; i < max; i++) {
    segments.push(<div key={i} className={`segment ${i < current ? 'filled' : ''}`} />);
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ color: 'var(--text-main)' }}>{current} / {max}</span>
      </div>
      <div className="segmented-progress">
        {segments}
      </div>
    </div>
  );
};

const LeverToggle = ({ checked, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <label className="lever-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider"></span>
    </label>
    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{label}</span>
  </div>
);

export default function BuildingDetailPanel({ building, area = null, onClose, onAssignVillagers, onUpgrade }) {
  const _b = building || {};

  // --- UI Refactor Styles ---
  const theme = {
    gold: '#e0cda0',
    slate: '#2c3e50',
    darkSlate: '#1a252f',
    lightSlate: '#34495e',
    parchment: '#1a1a1a',
    textMain: '#e0cda0',
    textMuted: '#aaa',
    border: '#5c4033',
    red: '#ff4d4d'
  };

  const sectionStyle = {
    padding: '16px 24px',
    borderBottom: `1px solid ${theme.border}`
  };

  const resourceGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
    marginTop: '8px'
  };

  const resourceBadgeStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.9rem',
    fontWeight: '600'
  };

  const progressBarContainerStyle = {
    height: '10px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '5px',
    overflow: 'hidden',
    marginTop: '6px',
    border: '1px solid rgba(255,255,255,0.1)'
  };

  const progressBarFillStyle = (percent) => ({
    height: '100%',
    width: `${Math.min(percent, 100)}%`,
    backgroundColor: theme.gold,
    boxShadow: '0 0 8px rgba(255, 159, 28, 0.3)',
    transition: 'width 0.3s ease'
  });

  const counterButtonStyle = {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.slate,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s'
  };

  const upgradeCardStyle = {
    margin: '16px 24px',
    padding: '16px',
    background: 'linear-gradient(145deg, #3e2723, #2b1d19)',
    borderRadius: '8px',
    color: '#d7ccc8',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const getResourceIcon = (res) => {
    const map = getIconForResource(res);
    return map ? map.icon : 'fa-box';
  };

  // Precompute commonly used values and small JSX blocks to avoid inline IIFEs
  const renderIcon = (icon) => {
    if (!icon) return <i className="fa-solid fa-building" style={{ fontSize: 28, color: '#ddd' }} />;
    if (icon.startsWith('fa-')) {
      const color = getColorForIconClass(icon.toLowerCase());
      return <i className={icon} style={{ fontSize: 28, color }} />;
    }
    return icon;
  };

  const level = (_b.level) || 0;
  const isLocked = !!_b.isLocked; // prereqs locked
  const notBuilt = level < 1;
  // Compute per-building max assignment matching server logic:
  // - If `_b.maxAssign` provided, use it (local override)
  // - Else if BUILDING_CONFIG defines `workerCapacity` or `workforceCap`, treat as per-level and multiply by level
  // - Otherwise fallback to legacy formula `Math.max(1, Math.floor(3 + (level * 1.5)))`
  const cfgForAssign = BUILDING_CONFIG[_b.id] || {};
  let computedMax = Math.max(1, Math.floor(3 + (level * 1.5)));
  if (typeof cfgForAssign.workerCapacity === 'number') computedMax = cfgForAssign.workerCapacity * Math.max(1, level);
  else if (typeof cfgForAssign.workforceCap === 'number') computedMax = cfgForAssign.workforceCap * Math.max(1, level);
  const maxAssigned = (typeof _b.maxAssign === 'number') ? _b.maxAssign : computedMax;
  // Disallow assigning villagers to housing buildings and the Storehouse.
  // Note: TownHall IS allowed (for gathering).
  const disallowAssignments = _b.id === 'Storehouse' || (_b.tags && _b.tags.includes('housing'));
  const buildLabel = _b && _b.isUpgrading ? 'Upgrading' : (level > 0 ? 'Upgrade' : 'Build');
  const [upgradeSecs, setUpgradeSecs] = useState((_b && _b.upgradeSecondsRemaining) || null);

  // Authoritative server values from the area object
  const liveArea = (typeof window !== 'undefined' && area && area.id && window.__lastFetchedArea && window.__lastFetchedArea[area.id]) ? window.__lastFetchedArea[area.id] : area;
  const areaAssignments = (liveArea && liveArea.assignments) ? liveArea.assignments : {};

  // Whether this building supports a separate 'Planks' assignment (used elsewhere)
  const supportsPlanks = ((BUILDING_CONFIG[_b.id] || {}).unlocks || []).includes('Planks');

  // Sum up all assignments for this building. 
  // If a sub-role like :Planks is supported, we keep it separate. 
  // Otherwise, we fold everything into the main assignment to avoid "lost" workers.
  const serverAssignedMain = (() => {
    let main = areaAssignments[_b.id] || _b.assigned || 0;
    // Add any other sub-roles that aren't explicitly handled (like :Planks)
    Object.entries(areaAssignments).forEach(([k, v]) => {
      if (k.startsWith(_b.id + ':') && k !== _b.id + ':Planks') {
        main += (v || 0);
      }
    });
    return main;
  })();
  
  const serverAssignedPlanks = supportsPlanks ? (areaAssignments[_b.id + ':Planks'] || _b.assignedPlanks || 0) : 0;

  const [localAssigned, setLocalAssigned] = useState(serverAssignedMain);
  const [localAssignedPlanks, setLocalAssignedPlanks] = useState(serverAssignedPlanks);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(0);
  const [showTownTooltip, setShowTownTooltip] = useState(false);
  const [localIdleReasons, setLocalIdleReasons] = useState((area && area.idleReasons) || {});
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState(null);

  // Reset local state when switching buildings to prevent state bleed
  useEffect(() => {
    setLocalAssigned(serverAssignedMain);
    setLocalAssignedPlanks(serverAssignedPlanks);
    setIsDirty(false);
    setIsEditing(false);
    setIsSaving(false);
    setUpgradeError(null);
    setUpgradeLoading(false);
  }, [_b.id]);

  // Per-building persistent auto-assign flag (stored in localStorage as `autoAssign:{areaId}:{buildingId}`)
  const storageKeyForAuto = (() => {
    try { const aid = area && area.id ? area.id : (typeof window !== 'undefined' && window.gameState ? window.gameState.activeAreaID : null); return aid && _b && _b.id ? `autoAssign:${aid}:${_b.id}` : null; } catch(e) { return null; }
  })();
  const [autoAssignEnabled, setAutoAssignEnabledRaw] = useState(() => {
    try {
      if (!storageKeyForAuto) return false;
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(storageKeyForAuto) : null;
      return v === '1' || v === 'true';
    } catch (e) { return false; }
  });

  const setAutoAssignEnabled = (val) => {
    try { if (storageKeyForAuto && typeof window !== 'undefined') window.localStorage.setItem(storageKeyForAuto, val ? '1' : '0'); } catch(e){}
    setAutoAssignEnabledRaw(!!val);
  };

  // Derived pieces moved outside JSX for clearer reconciliation
  const iconClass = _b.icon || (BUILDING_CONFIG[_b.id] && BUILDING_CONFIG[_b.id].icon) || null;
  const desc = _b.description || (BUILDING_CONFIG[_b.id] && BUILDING_CONFIG[_b.id].description) || 'No description available.';
  const descFirst = (() => { const text = desc || ''; const first = text.split('.')[0]; if (!first) return 'No description available.'; return first.length > 120 ? first.slice(0, 117) + '...' : first; })();

  // Computed helpers: prefer server-provided upgrade cost, fall back to client-side compute
  const nextLevelCost = (() => {
    try {
      if (_b && _b.upgradeCost && Object.keys(_b.upgradeCost).length > 0) return _b.upgradeCost;
      const next = (_b.level || 0) + 1;
      return computeTotalLevelCost(_b.id, next) || {};
    } catch (e) { return {}; }
  })();

  // Production computation removed from detail view — values were often misleading.

  useEffect(() => {
    const justSaved = (Date.now() - lastSavedAt) < 3000;
    if (!isDirty && !justSaved) {
      setLocalAssigned(serverAssignedMain);
    }
  }, [serverAssignedMain, isDirty, lastSavedAt]);

  useEffect(() => {
    const justSaved = (Date.now() - lastSavedAt) < 3000;
    if (!isDirty && !justSaved) {
      setLocalAssignedPlanks(serverAssignedPlanks);
    }
  }, [serverAssignedPlanks, isDirty, lastSavedAt]);



  // Listen for area updates (assignments/units) so the detail panel updates without full refresh
  useEffect(() => {
    const cb = (e) => {
      try {
        const d = e && e.detail;
        if (!d) return;
        // If the updated assignments include this building, decide whether to accept server value
        // Handle missing key as 0 (unassigned)
        if (d.assignments) {
          // Use the same inclusive logic as serverAssignedMain
          let serverVal = d.assignments[_b.id] || 0;
          Object.entries(d.assignments).forEach(([k, v]) => {
            if (k.startsWith(_b.id + ':') && k !== _b.id + ':Planks') {
              serverVal += (v || 0);
            }
          });
          
          const serverValPlanks = supportsPlanks ? (d.assignments[_b.id + ':Planks'] || 0) : 0;
          
          // Race condition protection: if we just saved, ignore server updates that don't match our new value
          const justSaved = (Date.now() - lastSavedAt) < 3000;

          // If user is actively editing, only accept server confirmation when it matches the local value
          if (isEditing || isDirty || justSaved) {
            if (serverVal === (localAssigned || 0) && serverValPlanks === (localAssignedPlanks || 0)) {
              // Confirmation from server — clear dirty state
              setIsDirty(false);
              setIsEditing(false);
              setLocalAssigned(serverVal);
              setLocalAssignedPlanks(serverValPlanks);
            } else {
              // Server disagrees while user editing or right after save — don't overwrite
            }
          } else {
            // Not editing and not recently saved: update if not dirty
            if (!isDirty) {
              setLocalAssigned(serverVal);
              setLocalAssignedPlanks(serverValPlanks);
            }
          }
        }
        // Update idle reasons if provided so UI can immediately reflect storage-limited state
        if (d.idleReasons) setLocalIdleReasons(d.idleReasons || {});
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('area:updated', cb);
    return () => window.removeEventListener('area:updated', cb);
  }, [_b && _b.id, isDirty, isEditing, localAssigned, localAssignedPlanks, lastSavedAt]);

  // Determine if this building is currently storage-limited (server-provided flag)
  const storageLimited = ((localIdleReasons && localIdleReasons[_b.id] === 'Storage Limit') || (area && area.idleReasons && area.idleReasons[_b.id] === 'Storage Limit'));

  useEffect(() => {
    setUpgradeSecs((_b && (typeof _b.upgradeSecondsRemaining !== 'undefined')) ? _b.upgradeSecondsRemaining : null);
  }, [_b && _b.upgradeSecondsRemaining]);

  useEffect(() => {
    if (upgradeSecs == null) return;
    const id = setInterval(() => {
      setUpgradeSecs(s => (s > 0 ? s - 1 : 0));
    }, GAME_CONFIG.TICK_MS);
    return () => clearInterval(id);
  }, [upgradeSecs]);

  // Auto-assign logic
  useEffect(() => {
    if (autoAssignEnabled && localAssigned < maxAssigned && !isEditing && !isDirty) {
      const villagersCount = (liveArea && Array.isArray(liveArea.units))
        ? (((liveArea.units.find(u => u.type === 'Villager') || {}).count) ?? 0)
        : (liveArea && liveArea.stats && typeof liveArea.stats.currentPop === 'number')
          ? liveArea.stats.currentPop
          : ((liveArea && typeof liveArea.population === 'number') ? liveArea.population : 0);
      
      const totalAssignedInArea = Object.entries(areaAssignments).reduce((acc, [k, v]) => acc + (v || 0), 0);
      const idleCount = Math.max(0, villagersCount - totalAssignedInArea);

      const next = Math.min(maxAssigned, idleCount + localAssigned);
      if (next > localAssigned) {
        setLocalAssigned(next);
        setIsDirty(true);
      }
    }
  }, [autoAssignEnabled, maxAssigned, isEditing, isDirty, liveArea]);

  // Production details removed — cards and detail view will no longer show per-hour production values.


  // If this is a Storehouse, compute storage capacities and current amounts
  const storehouseCapacities = (_b && _b.id === 'Storehouse') ? (() => {
    try {
      const cfg = BUILDING_CONFIG['Storehouse'];
      if (!cfg || !cfg.storageBase) return null;
      const lvl = _b.level || 0;
      const mul = cfg.storageMultiplier || 1.0;
      const caps = {};
      const nextCost = computeTotalLevelCost('Storehouse', lvl + 1) || {};
      const margin = 1.05;
      Object.entries(cfg.storageBase).forEach(([res, base]) => {
        const formulaCap = Math.floor(base * Math.pow(mul, lvl));
        const needed = nextCost[res] ? Math.ceil(nextCost[res] * margin) : 0;
        caps[res] = Math.max(formulaCap, needed);
      });
      return caps;
    } catch (e) { return null; }
  })() : null;

  // Small render helpers keep JSX simple and avoid parser issues
  const renderProduction = () => null;

  const renderStorage = () => {
    if (!storehouseCapacities) return null;
    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: theme.textMuted }}>
          Storage Capacity
        </h4>
        <div style={resourceGridStyle}>
          {Object.entries(storehouseCapacities).map(([res, cap]) => {
            const def = getIconForResource(res) || { icon: 'fa-box', color: '#bbb' };
            const current = (area?.resources?.[res] !== undefined)
              ? Math.floor(area.resources[res])
              : (_b && _b.storage && typeof _b.storage[res] !== 'undefined')
                ? Math.floor(_b.storage[res])
                : (_b && _b.resources && typeof _b.resources[res] !== 'undefined')
                  ? Math.floor(_b.resources[res])
                  : 0;
            const atCapacity = current >= cap;
            return (
              <div key={res} style={resourceBadgeStyle}>
                <i className={"fa-solid " + def.icon} style={{ color: atCapacity ? theme.red : theme.gold }}></i>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', color: atCapacity ? theme.red : theme.textMain }}>
                    {current.toLocaleString()} / {cap.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: theme.textMuted, textTransform: 'capitalize' }}>{res}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAssignments = () => {
    if (disallowAssignments || notBuilt) return null;
    
    const cfg = BUILDING_CONFIG[_b.id] || {};
    const supportsPlanks = (cfg.unlocks || []).includes('Planks');
    
    const liveArea = (typeof window !== 'undefined' && area && area.id && window.__lastFetchedArea && window.__lastFetchedArea[area.id]) ? window.__lastFetchedArea[area.id] : area;
    const areaAssignments = (liveArea && liveArea.assignments) ? liveArea.assignments : {};
    const totalAssignedInArea = Object.entries(areaAssignments).reduce((acc, [k, v]) => {
      return acc + (v || 0);
    }, 0);

    const villagersCount = (liveArea && Array.isArray(liveArea.units))
      ? (((liveArea.units.find(u => u.type === 'Villager') || {}).count) ?? 0)
      : (liveArea && liveArea.stats && typeof liveArea.stats.currentPop === 'number')
        ? liveArea.stats.currentPop
        : ((liveArea && typeof liveArea.population === 'number') ? liveArea.population : 0);

    const idleFromArea = Math.max(0, villagersCount - totalAssignedInArea);

    const otherBuildingsAssigned = totalAssignedInArea - (serverAssignedMain || 0) - (serverAssignedPlanks || 0);
    const totalAvailableForThisBuilding = Math.max(0, villagersCount - otherBuildingsAssigned);
    const absoluteMaxForBuilding = Math.min(maxAssigned, totalAvailableForThisBuilding);

    const totalAssigned = (localAssigned || 0) + (supportsPlanks ? (localAssignedPlanks || 0) : 0);
    
    const justSaved = (Date.now() - lastSavedAt) < 3000;
    const displayedTotalAssigned = (!isDirty && !isEditing && !justSaved) ? (serverAssignedMain + (supportsPlanks ? serverAssignedPlanks : 0)) : totalAssigned;

    const handleSetWorkers = (val) => {
      const requested = Math.max(0, Number.isFinite(val) ? val : parseInt(val, 10) || 0);
      const canTake = Math.max(0, absoluteMaxForBuilding - (localAssignedPlanks || 0));
      const next = Math.min(requested, canTake);
      setLocalAssigned(next);
      setIsDirty(true);
      setIsEditing(true);
    };

    const handleSetPlanks = (val) => {
      const requested = Math.max(0, Number.isFinite(val) ? val : parseInt(val, 10) || 0);
      const canTake = Math.max(0, absoluteMaxForBuilding - (localAssigned || 0));
      const next = Math.min(requested, canTake);
      setLocalAssignedPlanks(next);
      setIsDirty(true);
      setIsEditing(true);
    };

    return (
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 800 }}>
            Workforce Management
          </h4>
          <LeverToggle 
            label="Auto-Assign" 
            checked={autoAssignEnabled} 
            onChange={setAutoAssignEnabled} 
          />
        </div>

        <SegmentedProgress 
          current={displayedTotalAssigned} 
          max={maxAssigned} 
          label="Total Capacity" 
        />

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="stat-box" style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--wood-dark)', color: 'white' }}>
                <i className="fas fa-users"></i>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>General Labor</div>
                  <div className="badge badge-level" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{localAssigned}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{idleFromArea} idle villagers</div>
              </div>
            </div>
            <Stepper 
              value={localAssigned} 
              max={Math.max(0, absoluteMaxForBuilding - (localAssignedPlanks || 0))} 
              onChange={handleSetWorkers} 
            />
          </div>

          {supportsPlanks && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="stat-box" style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--wood-dark)', color: 'white' }}>
                  <i className="fas fa-tree"></i>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>Plank Production</div>
                    <div className="badge badge-level" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--wood-medium)' }}>{localAssignedPlanks}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialized task</div>
                </div>
              </div>
              <Stepper 
                value={localAssignedPlanks} 
                max={Math.max(0, absoluteMaxForBuilding - (localAssigned || 0))} 
                onChange={handleSetPlanks} 
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUnitProduction = () => {
    // Show on military production buildings and research buildings for Scholars
    const productionBuildings = ['Barracks', 'ArcheryRange', 'SiegeWorkshop', 'Stable', 'Library', 'University', 'TownHall', 'ShadowGuild'];
    if (!productionBuildings.includes(_b.id)) return null;
    
    // Determine candidate units (filter by building requirement)
    const candidates = ALL_UNITS.filter(u => {
      // Special case for Scholars: can be trained at TownHall, Library, or University
      if (u.id === 'Scholar') {
        return ['TownHall', 'Library', 'University'].includes(_b.id);
      }
      // Otherwise, filter by the required building
      return u.requiredBuilding === _b.id;
    });

    if (candidates.length === 0) return null;

    // Group units by class for the "Military Ledger" view
    const grouped = candidates.reduce((acc, u) => {
      const cls = u.class || 'Other';
      if (!acc[cls]) acc[cls] = [];
      acc[cls].push(u);
      return acc;
    }, {});

    return (
      <div style={sectionStyle}>
        <h4 style={{ margin: '0 0 15px 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1.5px', color: theme.accentGold, fontWeight: 900, borderBottom: `1px solid ${theme.border}`, paddingBottom: 8 }}>
          <i className="fas fa-scroll" style={{ marginRight: 8 }}></i> Military Ledger
        </h4>
        
        {Object.entries(grouped).map(([cls, units]) => (
          <div key={cls} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: theme.textMuted, marginBottom: 8, fontWeight: 800, letterSpacing: '1px' }}>
              {cls}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {units.map(u => {
                // Check requirements
                const bLevel = _b.level || 0;
                const reqLevel = u.requiredBuildingLevel || 1;
                const levelMet = bLevel >= reqLevel;
                
                // Check research requirement
                const userTechs = (window.__account && window.__account.techLevels) || {};
                const researchMet = !u.requiredResearch || (userTechs[u.requiredResearch] > 0);
                
                const isLocked = !levelMet || !researchMet;

                return (
                  <div key={u.id} style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '12px', 
                    background: isLocked ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)', 
                    borderRadius: 8,
                    border: `1px solid ${isLocked ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                    filter: isLocked ? 'grayscale(1) opacity(0.7)' : 'none',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: 6, background: theme.accentGold, color: '#000',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                        }}>
                          <i className={`fas ${u.icon || 'fa-user-shield'}`}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '1rem', color: isLocked ? theme.textMuted : theme.text }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: theme.textMuted }}>{u.description}</div>
                        </div>
                      </div>
                      {!isLocked && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="number" min={1} defaultValue={1} id={`recruit_${u.id}`} 
                            style={{ width: 50, height: 30, textAlign: 'center', borderRadius: 4, border: `1px solid ${theme.border}`, background: 'rgba(0,0,0,0.2)', color: '#fff' }} 
                          />
                          <button className="btn btn-build" style={{ padding: '4px 12px', height: 30, fontSize: '0.8rem' }} onClick={async (e) => {
                            const val = Number(document.getElementById(`recruit_${u.id}`).value || 0);
                            if (!val || val <= 0) return alert('Invalid count');
                            try {
                              const areaId = area && area.id ? area.id : (window.gameState && window.gameState.activeAreaID);
                              if (!areaId) return alert('Missing active area');
                              await GameClient.recruit(areaId, u.id, val);
                              alert(`Queued ${val} ${u.name}`);
                              try { window.dispatchEvent(new CustomEvent('area:refresh-request', { detail: { areaId } })); } catch (e) {}
                            } catch (err) { alert(err?.message || err?.error || 'Failed to recruit'); }
                          }}>Train</button>
                        </div>
                      )}
                    </div>

                    {/* Requirements Checklist for Locked Units */}
                    {isLocked && (
                      <div style={{ marginTop: 8, padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: 4, fontSize: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: theme.red, marginBottom: 4, textTransform: 'uppercase', fontSize: '0.65rem' }}>Requirements:</div>
                        {!levelMet && (
                          <div style={{ color: theme.red, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="fas fa-times-circle"></i> Requires {_b.name} Lvl {reqLevel} (Current: {bLevel})
                          </div>
                        )}
                        {!researchMet && (
                          <div style={{ color: theme.red, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="fas fa-times-circle"></i> Requires Research: {u.requiredResearch}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.7rem', color: theme.textMuted, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-coins"></i> {Object.entries(u.cost || {}).map(([r,a]) => `${a}${r[0]}`).join(' ')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-clock"></i> {u.trainingTime}s
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-sword"></i> {u.attack}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-shield-alt"></i> {u.defense}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const saveAssignments = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      // Recompute allowed maxima to ensure we don't send invalid values
      const villagersCount = (area && Array.isArray(area.units))
        ? ((area.units.find(u => u.type === 'Villager') || {}).count || 0)
        : ((area && area.population && typeof area.population.total === 'number') ? area.population.total : 0);
      const areaAssignments = (area && area.assignments) ? area.assignments : {};
      const totalAssignedInArea = Object.entries(areaAssignments).reduce((acc, [k, v]) => acc + (v || 0), 0);
      
      const otherBuildingsAssigned = totalAssignedInArea - (serverAssignedMain || 0) - (serverAssignedPlanks || 0);
      const totalAvailableForThisBuilding = Math.max(0, villagersCount - otherBuildingsAssigned);
      const absoluteMaxForBuilding = Math.min(maxAssigned, totalAvailableForThisBuilding);

      const toSendAssigned = Math.max(0, Math.min(absoluteMaxForBuilding, localAssigned || 0));
      const toSendPlanks = Math.max(0, Math.min(Math.max(0, absoluteMaxForBuilding - toSendAssigned), localAssignedPlanks || 0));

      if (typeof onAssignVillagers === 'function') {
        // Save main workers
        await onAssignVillagers(_b.id, toSendAssigned);
        // Save planks only if this building supports them and the value changed
        if (supportsPlanks && toSendPlanks !== (serverAssignedPlanks || 0)) {
          await onAssignVillagers(_b.id + ':Planks', toSendPlanks);
        }
      } else {
        // Fallback: call GameClient directly and await
        const areaId = area && area.id ? area.id : (window.gameState && window.gameState.activeAreaID);
        if (areaId) {
          await GameClient.assignWorkers(areaId, _b.id, toSendAssigned);
          if (supportsPlanks && toSendPlanks !== (serverAssignedPlanks || 0)) {
            await GameClient.assignWorkers(areaId, _b.id + ':Planks', toSendPlanks);
          }
          try { window.dispatchEvent(new CustomEvent('area:refresh-request', { detail: { areaId } })); } catch (e) {}
        }
      }
      // Update local state to reflect actual sent values (in case we clamped)
      setLocalAssigned(toSendAssigned);
      setLocalAssignedPlanks(toSendPlanks);
      setIsDirty(false);
      setLastSavedAt(Date.now());
    } catch (e) {
      console.error("Failed to save assignments", e);
      alert(e?.message || "Failed to save assignments. Please check if you have enough idle villagers.");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveAssignments();
    }, 1000);
    return () => clearTimeout(timer);
  }, [localAssigned, localAssignedPlanks, isDirty]);

  const handleClose = async () => {
    if (isDirty) {
      await saveAssignments();
    }
    onClose();
  };

  const renderUpgrade = () => {
    const nextLevel = (building.level || 0) + 1;
    const canAfford = Object.entries(nextLevelCost).every(([res, amt]) => (area?.resources?.[res] || 0) >= amt);
    
    // Calculate estimated time
    const estTime = calculateBuildTime(building.id, building.level || 0);
    const estTimeStr = estTime < 60 ? `${estTime}s` : estTime < 3600 ? `${Math.floor(estTime/60)}m ${estTime%60}s` : `${Math.floor(estTime/3600)}h ${Math.floor((estTime%3600)/60)}m`;

    return (
      <div style={upgradeCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, color: theme.gold, fontFamily: "'MedievalSharp', serif", fontSize: '1.1rem' }}>
              {building.isUpgrading ? `Upgrading to Level ${nextLevel}` : `Upgrade to Level ${nextLevel}`}
            </h4>
            {upgradeSecs != null ? (
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                Time remaining: <span style={{ fontWeight: 700 }}>{Math.ceil(upgradeSecs * GAME_CONFIG.TICK_MS / 1000)}s</span>
              </div>
            ) : (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
                Increases workforce capacity and efficiency.
              </p>
            )}
          </div>
          
          {!building.isUpgrading && Object.keys(nextLevelCost).length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cost • <i className="fas fa-clock" style={{ marginLeft: 4, marginRight: 2 }}></i> {estTimeStr}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {(() => {
                  const entries = Object.entries(nextLevelCost || {});
                  const shown = entries.slice(0, 2);
                  return (
                    <>
                      {shown.map(([res, amt]) => {
                        const hasEnough = (area?.resources?.[res] || 0) >= amt;
                        return (
                          <span key={res} style={{ 
                            fontSize: '0.85rem', 
                            color: hasEnough ? '#fff' : theme.red,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 'bold'
                          }}>
                            <i className={`fas ${getResourceIcon(res)}`}></i>
                            {amt}
                          </span>
                        );
                      })}
                      {entries.length > shown.length && (
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginLeft: 6 }}>+{entries.length - shown.length} more</span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {building.isUpgrading ? (
          <div style={{ marginTop: '8px' }}>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${building.progress || 0}%`, height: '100%', background: '#4fb04d', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>
              Construction in progress... {Math.floor(building.progress || 0)}%
            </div>
          </div>
        ) : (
          <button 
            onClick={async () => {
              if (isLocked || building.isUpgrading || upgradeLoading) return;
              setUpgradeError(null);
              setUpgradeLoading(true);
              try {
                if (isDirty) await saveAssignments();
                const areaId = area && area.id ? area.id : (window.gameState && window.gameState.activeAreaID);
                if (!areaId) throw new Error('Missing active area id');
                const resp = await GameClient.upgradeArea(areaId, _b.id);
                if (resp && resp.success) {
                  try { if (typeof onUpgrade === 'function') onUpgrade(_b.id); } catch (e) {}
                } else {
                  setUpgradeError(resp?.message || resp?.error || 'Upgrade failed');
                }
              } catch (err) {
                setUpgradeError(err.message || 'Upgrade error');
              } finally {
                setUpgradeLoading(false);
              }
            }}
            disabled={!canAfford || upgradeLoading}
            className={canAfford && !upgradeLoading ? 'glow-button' : ''}
            style={{
              width: '100%',
              padding: '12px',
              background: canAfford ? 'linear-gradient(145deg, #ff8f00, #ff6f00)' : '#555',
              color: canAfford ? '#fff' : '#888',
              border: '1px solid ' + (canAfford ? '#e65100' : '#444'),
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              fontFamily: "'MedievalSharp', serif",
              textTransform: 'uppercase',
              transition: 'all 0.2s',
              marginTop: '8px',
              boxShadow: canAfford ? '0 4px 15px rgba(255, 111, 0, 0.3)' : 'none'
            }}
          >
            {upgradeLoading ? 'Processing...' : (canAfford ? 'Begin Construction' : 'Insufficient Resources')}
          </button>
        )}
        
        {upgradeError && (
          <div style={{ color: theme.red, fontSize: '0.75rem', textAlign: 'center', marginTop: '4px' }}>
            {upgradeError}
          </div>
        )}
      </div>
    );
  };

  const statusDisplay = () => {
    if (building.isUpgrading) return 'Upgrading';
    if (storageLimited) return 'Storage Limit';
    if (storehouseCapacities) return 'Storage';
    // Completely hide status for utility buildings with no output
    const hideStatusFor = new Set(['Storehouse']);
    if (hideStatusFor.has(building.id)) return null;
    const total = (localAssigned || 0) + (localAssignedPlanks || 0);
    if (total > 0) return 'Active';
    return 'Idle';
  };

  if (!building) return null;

  const panel = (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 9999, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(4px)'
    }}>
      <div onClick={isSaving ? null : handleClose} style={{ position: 'absolute', inset: 0 }}></div>
      <div className="beveled-panel" style={{ 
        position: 'relative', 
        width: 'min(550px, calc(100% - 40px))', 
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '0',
        color: theme.textMain,
        fontFamily: "'EB Garamond', serif"
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: `1px solid ${theme.border}`, 
          background: 'rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ 
              width: 56, 
              height: 56, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'rgba(0,0,0,0.1)', 
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              {renderIcon(iconClass)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 className="font-cinzel" style={{ 
                margin: 0, 
                fontSize: '1.6rem', 
                color: theme.gold,
                textShadow: '1px 1px 1px rgba(0,0,0,0.1)',
                letterSpacing: '0.5px'
              }}>
                {building.displayName || building.name}
              </h2>
              <div style={{ fontSize: '0.8rem', color: theme.textMuted, marginTop: '2px', fontWeight: 'bold' }}>
                Level {building.level || 0}{(() => { const s = statusDisplay(); return s ? (<><span> • </span><span style={{ color: theme.slate }}>{s}</span></>) : null })()}
              </div>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            disabled={isSaving} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: theme.textMuted, 
              fontSize: '1.4rem', 
              cursor: 'pointer',
              padding: '4px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = theme.gold}
            onMouseOut={(e) => e.currentTarget.style.color = theme.textMuted}
          >
            {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-xmark"></i>}
          </button>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '0.95rem', color: theme.textMain }}>
            {desc}
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {renderStorage()}
          {renderAssignments()}
          
          {/* Base Output Section (if applicable) */}
          {BUILDING_CONFIG[_b.id]?.baseOutput && !(['Storehouse'].includes(_b.id)) && (
            <div style={sectionStyle}>
              <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: theme.textMuted }}>
                Output (current)
              </h4>
              <div style={resourceGridStyle}>
                {(() => {
                    try {
                    const perWorker = computeTotalProductionExtraction(_b.id, _b.level || 0) || {};
                    // Determine how many workers to use for total.
                    // Prefer server-confirmed assignments, but if local UI shows a higher assigned value (recent change), use that so production reflects user's intent immediately.
                    const assignedWorkers = Math.max((serverAssignedMain || 0), (localAssigned || 0));

                    // Helper to compute hourly output using the same factors as the game loop
                    const computeHourly = (baseRatePerSecond, lvl, workers = 1) => {
                      if (!baseRatePerSecond || lvl <= 0) return 0;
                      const workerFactor = Math.pow(Math.max(1, workers), WORKER_EXP || 1);
                      const levelMultiplier = Math.pow(PRODUCTION_GROWTH || 1, Math.max(0, lvl - 1));
                      const mul = (PRODUCTION_GLOBAL_MULTIPLIER || 1);
                      return baseRatePerSecond * workerFactor * levelMultiplier * mul * 3600; // per hour
                    };

                    return Object.entries(perWorker).map(([k, v]) => {
                      // Normalize label key (e.g., 'foodPerHour' -> 'food')
                      const labelKey = k.replace(/PerHour/i, '').replace(/PerLevel/i, '').toLowerCase();

                      // Try to find a matching per-second base rate in PRODUCTION_RATES
                      const rateCandidates = [
                        `${labelKey}PerWorkerPerSecond`,
                        `${labelKey}PerLevelPerSecond`,
                        `${labelKey}PerSecond`,
                        `${labelKey}PerHour` // fallback
                      ];
                      let baseRatePerSecond = null;
                      for (const rc of rateCandidates) {
                        if (PRODUCTION_RATES && typeof PRODUCTION_RATES[rc] === 'number') { baseRatePerSecond = PRODUCTION_RATES[rc]; break; }
                      }

                      if (typeof v !== 'number') {
                        // SurfaceMine special-case: compute using stonePitPerWorkerPerSecond
                        if (_b.id === 'SurfaceMine') {
                          const baseRate = PRODUCTION_RATES.stonePitPerWorkerPerSecond || 0.06;
                          // If storage-limited or no assigned workers, production should be 0
                          if (storageLimited || (assignedWorkers || 0) <= 0) {
                            const totalHour = 0;
                            const effectivePerWorker = 0;
                            return (
                              <div key={k} style={resourceBadgeStyle}>
                                <i className={`fas ${getResourceIcon(ResourceEnum.Stone)}`} style={{ color: theme.gold }} />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{totalHour.toFixed(2)}</span>
                                  <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>{effectivePerWorker.toFixed(2)} /hr (per worker)</span>
                                </div>
                              </div>
                            );
                          }
                          const totalHour = computeHourly(baseRate, _b.level || 0, Math.max(1, assignedWorkers));
                          const effectivePerWorker = assignedWorkers > 0 ? (totalHour / Math.max(1, assignedWorkers)) : computeHourly(baseRate, _b.level || 0, 1);
                          return (
                            <div key={k} style={resourceBadgeStyle}>
                              <i className={`fas ${getResourceIcon(ResourceEnum.Stone)}`} style={{ color: theme.gold }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{totalHour.toFixed(2)}</span>
                                <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>{effectivePerWorker.toFixed(2)} /hr (per worker)</span>
                              </div>
                            </div>
                          );
                        }

                        // Fallback: show the raw string
                        return (
                          <div key={k} style={resourceBadgeStyle}>
                            <i className={`fas ${getResourceIcon(k)}`} style={{ color: theme.gold }}></i>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem' }}>{String(v)}</span>
                            </div>
                          </div>
                        );
                      }

                      // Numeric base output: prefer computing total using PRODUCTION_RATES mapping when available
                      if (baseRatePerSecond) {
                        // If storage-limited or no assigned workers, production is zero
                        if (storageLimited || (assignedWorkers || 0) <= 0) {
                          const totalHour = 0;
                          const effectivePerWorker = 0;
                          return (
                            <div key={k} style={resourceBadgeStyle}>
                              <i className={`fas ${getResourceIcon(k)}`} style={{ color: theme.gold }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{totalHour.toFixed(2)} /hr</span>
                                <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>{effectivePerWorker.toFixed(2)} /hr (per worker)</span>
                              </div>
                            </div>
                          );
                        }
                        // If rate is per-worker, compute with assigned workers; if per-level, compute with 1 worker equivalent
                        const isPerWorker = String(Object.keys(PRODUCTION_RATES || {}).find(k2 => k2 === `${labelKey}PerWorkerPerSecond`)) === `${labelKey}PerWorkerPerSecond`;
                        const totalHour = isPerWorker ? computeHourly(baseRatePerSecond, _b.level || 0, Math.max(1, assignedWorkers)) : (baseRatePerSecond * (_b.level || 0) * Math.pow(PRODUCTION_GROWTH || 1, Math.max(0, (_b.level || 0) - 1)) * (PRODUCTION_GLOBAL_MULTIPLIER || 1) * 3600);
                        const effectivePerWorker = assignedWorkers > 0 ? (totalHour / Math.max(1, assignedWorkers)) : (totalHour);
                        return (
                          <div key={k} style={resourceBadgeStyle}>
                            <i className={`fas ${getResourceIcon(k)}`} style={{ color: theme.gold }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{totalHour.toFixed(2)} /hr</span>
                              <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>{effectivePerWorker.toFixed(2)} /hr (per worker)</span>
                            </div>
                          </div>
                        );
                      }

                      // Last-resort: treat v as per-worker-per-hour and multiply by assigned workers
                      const perWorkerHour = Number((v).toFixed(2));
                      const totalHour = Number((v * Math.max(0, assignedWorkers)).toFixed(2));
                      return (
                        <div key={k} style={resourceBadgeStyle}>
                          <i className={`fas ${getResourceIcon(k)}`} style={{ color: theme.gold }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{totalHour.toLocaleString()} /hr</span>
                            <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>{perWorkerHour.toLocaleString()} /hr (per worker)</span>
                          </div>
                        </div>
                      );
                    });
                  } catch (e) { return null; }
                })()}
              </div>
            </div>
          )}

          {renderUnitProduction()}

            {/* Debug: server-math production calculator (visible when needed) */}
            <div style={{ padding: '12px 16px', borderTop: '1px dashed rgba(0,0,0,0.06)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)' }}>Debug: computed production (server math)</summary>
                <div style={{ marginTop: 8 }}>
                  {(() => {
                    try {
                      const lvl = _b.level || 0;
                      const assigned = (!isDirty && !isEditing) ? (serverAssignedMain || 0) : (localAssigned || 0);
                      const resources = [];
                      // Decide which base rate to use for this building
                      if (_b.id === 'SurfaceMine') {
                        const base = PRODUCTION_RATES.stonePitPerWorkerPerSecond || 0.06;
                        const workerFactor = Math.pow(Math.max(1, assigned), WORKER_EXP || 1);
                        const levelMul = Math.pow(PRODUCTION_GROWTH || 1, Math.max(0, lvl - 1));
                        const mul = (PRODUCTION_GLOBAL_MULTIPLIER || 1);
                        const perSecond = base * workerFactor * levelMul * mul;
                        const perHour = perSecond * 3600;
                        resources.push({ name: 'Stone', base, workerFactor, levelMul, mul, perSecond, perHour, assigned });
                      } else {
                        // For other config-driven numeric outputs, gather keys from computeTotalProductionExtraction
                        const perWorker = computeTotalProductionExtraction(_b.id, lvl) || {};
                        Object.keys(perWorker).forEach(k => {
                          // Try to find matching PRODUCTION_RATES key
                          const key = k.replace(/PerHour/i, '').replace(/([A-Z])/g, c => c).toLowerCase();
                          // Best-effort mapping
                          let base = null;
                          if (k.toLowerCase().includes('timber')) base = PRODUCTION_RATES.timberPerWorkerPerSecond;
                          if (k.toLowerCase().includes('food')) base = PRODUCTION_RATES.foodPerWorkerPerSecond;
                          if (k.toLowerCase().includes('plank')) base = PRODUCTION_RATES.planksPerWorkerPerSecond;
                          if (k.toLowerCase().includes('stone')) base = PRODUCTION_RATES.stonePitPerWorkerPerSecond;
                          if (base == null) base = null;
                          const workerFactor = Math.pow(Math.max(1, assigned), WORKER_EXP || 1);
                          const levelMul = Math.pow(PRODUCTION_GROWTH || 1, Math.max(0, lvl - 1));
                          const mul = (PRODUCTION_GLOBAL_MULTIPLIER || 1);
                          const perSecond = base ? (base * workerFactor * levelMul * mul) : (Number(perWorker[k] || 0) / 3600 * Math.max(1, assigned));
                          const perHour = perSecond * 3600;
                          resources.push({ name: k, base, workerFactor, levelMul, mul, perSecond, perHour, assigned });
                        });
                      }

                      const idleReason = (localIdleReasons && localIdleReasons[_b.id]) || (area && area.idleReasons && area.idleReasons[_b.id]) || null;
                      return resources.map(r => (
                        <div key={r.name} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 800 }}>{r.name}</div>
                          <div>Assigned: {r.assigned}</div>
                          {idleReason && <div style={{ color: theme.red }}>Idle reason: {idleReason}</div>}
                          <div>BaseRate/sec: {r.base != null ? r.base : 'N/A'}</div>
                          <div>Worker factor: {Number(r.workerFactor).toFixed(6)}</div>
                          <div>Level multiplier: {Number(r.levelMul).toFixed(6)}</div>
                          <div>Global multiplier: {Number(r.mul).toFixed(3)}</div>
                          <div style={{ marginTop: 4, fontWeight: 700 }}>{Number(r.perHour).toFixed(2)} /hr ({Number(r.perSecond).toFixed(6)} /s)</div>
                        </div>
                      ));
                    } catch (e) { return <div>Debug compute error</div>; }
                  })()}
                </div>
              </details>
            </div>
          {/* Requirements: show any unmet prerequisites for this building */}
          {(() => {
            try {
              const cfg = BUILDING_CONFIG[_b.id] || {};
              const req = cfg.requirement;
              if (!req) return null;

              const missing = [];

              // Helper: get building level from area (supports array or object shapes)
              const getBuildingLevel = (areaObj, id) => {
                try {
                  if (!areaObj) return 0;
                  if (Array.isArray(areaObj.buildings)) {
                    const found = areaObj.buildings.find(b => b && (b.id === id || b.name === id));
                    return (found && (found.level || 0)) || 0;
                  }
                  if (areaObj.buildings && typeof areaObj.buildings === 'object') return areaObj.buildings[id] || 0;
                } catch (e) {}
                return 0;
              };

              if (req.building) {
                const have = getBuildingLevel(area, req.building);
                const need = req.level || 1;
                if (have < need) missing.push({ type: 'building', id: req.building, have, need });
              }

              if (req.quest) {
                const qDone = (area && Array.isArray(area.quests) && area.quests.includes(req.quest)) || (window.__account && Array.isArray(window.__account.questsCompleted) && window.__account.questsCompleted.includes(req.quest));
                if (!qDone) missing.push({ type: 'quest', id: req.quest });
              }

              if (req.items) {
                Object.entries(req.items).forEach(([it, cnt]) => {
                  const haveArea = (area && area.resources && (area.resources[it] !== undefined)) ? (area.resources[it] || 0) : 0;
                  const haveUser = (window.__account && window.__account.inventory && ((window.__account.inventory.items && window.__account.inventory.items[it]) || 0)) || 0;
                  const have = Math.max(haveArea, haveUser);
                  if (have < cnt) missing.push({ type: 'item', id: it, have, need: cnt });
                });
              }

              if (missing.length === 0) return null;

              return (
                <div style={sectionStyle}>
                  <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 800 }}>Requirements</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {missing.map((m, idx) => {
                      if (m.type === 'building') {
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: 6 }}>
                            <div style={{ fontWeight: 700 }}>{BUILDING_CONFIG[m.id] ? (BUILDING_CONFIG[m.id].displayName || BUILDING_CONFIG[m.id].name) : m.id}</div>
                            <div style={{ color: m.have < m.need ? '#ff4d4d' : '#7cc576', fontWeight: 800 }}>{m.have} / {m.need}</div>
                          </div>
                        );
                      }
                      if (m.type === 'quest') {
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: 6 }}>
                            <div style={{ fontWeight: 700 }}>Quest: {m.id}</div>
                            <div style={{ color: '#ff4d4d', fontWeight: 800 }}>Locked</div>
                          </div>
                        );
                      }
                      if (m.type === 'item') {
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: 6 }}>
                            <div style={{ fontWeight: 700 }}>{m.id}</div>
                            <div style={{ color: m.have < m.need ? '#ff4d4d' : '#7cc576', fontWeight: 800 }}>{m.have} / {m.need}</div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            } catch (e) { return null; }
          })()}
        </div>

        {/* Upgrade Action Card */}
        {renderUpgrade()}
      </div>
    </div>
  );

  // Render overlay at document.body level to avoid clipping by transformed/stacked parents
  return typeof document !== 'undefined' ? createPortal(panel, document.body) : panel;
}

