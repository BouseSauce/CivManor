import React, { useState, useEffect } from 'react';
import { GameClient } from '../api/client';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import { RESOURCE_ICON_MAP } from '../constants/iconMaps';

/**
 * AreaOverviewPanel
 * Displays core stats (Pop, Approval, Food) and the active queue.
 */
const AreaOverviewPanel = ({ areaId, areaName, coordinates, stats = {}, resources = {}, queue = [], units = [], assignments = {}, buildings = [], ownerName = null, compact = false, onRefresh = null }) => {
    const [localAssignments, setLocalAssignments] = useState(assignments || {});
    const [assigning, setAssigning] = useState(false);
    const [secondsMap, setSecondsMap] = useState({});

    const [localUnits, setLocalUnits] = useState(units || []);
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    // Keep localUnits in sync when parent provides new units
    useEffect(() => {
        setLocalUnits(units || []);
    }, [units]);

    const villagersCount = (localUnits && localUnits.find(u => u.type === 'Villager') || { count: 0 }).count;
    const scholarsCount = (localUnits && localUnits.find(u => u.type === 'Scholar') || { count: 0 }).count;
    const totalAssigned = Object.entries(localAssignments).reduce((acc, [k, v]) => {
        return acc + (v || 0);
    }, 0);

    const reclaimAllWorkers = async () => {
        if (!areaId) return;
        if (!window.confirm('Are you sure you want to unassign ALL workers in this area? This will reset everyone to Idle.')) return;
        
        setAssigning(true);
        try {
            const keys = Object.keys(localAssignments);
            // Process in sequence to avoid overwhelming the server, but catch individual errors
            for (const key of keys) {
                try {
                    await GameClient.assignWorkers(areaId, key, 0);
                } catch (e) {
                    console.warn(`Failed to unassign key: ${key}`, e);
                }
            }
            
            // Force a refresh to get the clean state
            if (typeof onRefresh === 'function') {
                await onRefresh();
            }
            
            alert('Workforce reclamation complete. All workers should now be idle.');
        } catch (err) {
            console.error('Reclaim process failed', err);
            alert('Failed to complete the reclaim process. Please try again or refresh the page.');
        } finally {
            setAssigning(false);
        }
    };

    const changeAssignment = async (buildingId, delta) => {
        const current = localAssignments[buildingId] || 0;
        const next = Math.max(0, current + delta);
        if (next === current) return;

        // Quick local update
        const updated = { ...localAssignments, [buildingId]: next };
        if (next === 0) delete updated[buildingId];
        setLocalAssignments(updated);

        // Send to server and update local state using server response for immediate UI feedback
        try {
            setAssigning(true);
            const resp = await GameClient.assignWorkers(areaId, buildingId, next);
            // resp should include updated assignments and units
            if (resp && resp.assignments) setLocalAssignments(resp.assignments);
            else setLocalAssignments(assignments || {});
            if (resp && resp.units) setLocalUnits(resp.units);
            if (typeof onRefresh === 'function') onRefresh();
        } catch (err) {
            // revert on error
            setLocalAssignments(assignments || {});
            setLocalUnits(units || []);
            console.error('Assign failed', err);
            alert(err && err.message ? err.message : 'Assign failed');
        } finally {
            setAssigning(false);
        }
    };

    // Keep localAssignments in sync when parent provides new assignments (after refresh)
    useEffect(() => {
        setLocalAssignments(assignments || {});
    }, [assignments]);

    const findBuildingLevel = (id) => {
        const b = (buildings || []).find(x => x.id === id);
        return b ? (b.level || 0) : 0;
    };

    // Initialize and keep a local seconds map for queue items so we can show a realtime countdown
    useEffect(() => {
        const parseSeconds = (v) => {
            if (v == null) return null;
            if (typeof v === 'number') return Math.max(0, Math.floor(v));
            if (typeof v === 'string') {
                const m = v.match(/(\d+)/);
                if (m) return parseInt(m[1], 10);
            }
            return null;
        };

        const next = {};
        (queue || []).forEach((item, idx) => {
            const key = `${item.type}:${item.id || item.name}:${idx}`;
            const secs = parseSeconds(item.secondsRemaining) ?? parseSeconds(item.timeRemainingSeconds) ?? parseSeconds(item.timeRemaining);
            next[key] = secs;
        });
        setSecondsMap(next);
    }, [queue]);

    // Decrement local seconds every second for a realtime countdown
    useEffect(() => {
        const id = setInterval(() => {
            setSecondsMap(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(k => {
                    if (next[k] == null) return;
                    if (next[k] > 0) { next[k] = next[k] - 1; changed = true; }
                });
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const PRIMARY_RESOURCES = [
        'Timber', 'Stone', 'Coal', 'Food', 'Planks', 'IronIngot', 'Steel', 'Knowledge', 'Horses', 'Captives'
    ];
    
    return (
        <div className="area-overview-panel" style={{ 
            display: 'flex', 
            gap: '12px', 
            padding: '8px 16px', 
            background: 'linear-gradient(to bottom, #2d1b0d, #1a0f0a)', 
            borderBottom: '3px solid #5c4033',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            alignItems: 'center',
            flexShrink: 0,
            height: '90px',
            position: 'relative',
            zIndex: 100
        }}>
            {/* Area Name & Coordinates */}
            <div className="beveled-panel" style={{ 
                minWidth: '180px', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                padding: '0 12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,215,0,0.15)',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
            }}>
                <div className="font-cinzel" style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {areaName || 'Unknown Area'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span className="font-garamond" style={{ fontSize: '0.8rem', color: '#8d6e63', fontWeight: 600 }}>{coordinates || 'R0:A0'}</span>
                    {/* Spy Intel Badge */}
                    {typeof window !== 'undefined' && window.__lastFetchedArea && window.__lastFetchedArea[areaId]?.spyIntel && (
                        <span style={{ 
                            fontSize: '0.6rem', 
                            background: 'rgba(103, 176, 255, 0.15)', 
                            color: '#67b0ff', 
                            padding: '1px 5px', 
                            borderRadius: '3px',
                            border: '1px solid rgba(103, 176, 255, 0.3)',
                            textTransform: 'uppercase',
                            fontWeight: 800
                        }}>
                            <i className="fa-solid fa-user-secret" style={{ marginRight: 3 }}></i>
                            {window.__lastFetchedArea[areaId].intelDepth}
                        </span>
                    )}
                </div>
            </div>

            {/* Core Stats Dashboard */}
            <div style={{ display: 'flex', gap: '8px', height: '100%' }}>
                {/* Population */}
                <div className="beveled-panel" style={{ 
                    width: '140px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '0 12px', 
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,215,0,0.1)',
                    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
                }}>
                    <i className="fa-solid fa-users" style={{ fontSize: '1.2rem', color: '#ffd700' }}></i>
                    <div style={{ flex: 1 }}>
                        <div className="font-cinzel" style={{ fontSize: '0.65rem', color: '#8d6e63', letterSpacing: '1px', fontWeight: 800 }}>POPULATION</div>
                        <div className="font-garamond" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                            {stats.currentPop} <span style={{ fontSize: '0.8rem', color: '#8d6e63' }}>/ {stats.maxPop}</span>
                        </div>
                        {/* Next Pop Timer */}
                        {stats.nextPopSeconds && stats.nextPopSeconds > 0 && (
                            <div style={{ fontSize: '0.65rem', color: '#7cc576', marginTop: 2, fontWeight: 600 }}>
                                +1 in {Math.ceil(stats.nextPopSeconds)}s
                            </div>
                        )}
                        <div style={{ width: '100%', height: '3px', background: 'rgba(0,0,0,0.4)', marginTop: '4px', borderRadius: '1px', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${Math.min(100, Math.max(0, (stats.popGrowRemainder || 0) * 100))}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #ffd700, #ffb300)', 
                                transition: 'width 0.5s ease'
                            }}></div>
                        </div>
                    </div>
                </div>

                {/* Approval */}
                <div className="beveled-panel" style={{ 
                    width: '110px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '0 12px', 
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,215,0,0.1)',
                    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
                }}>
                    <i className="fa-solid fa-face-smile" style={{ fontSize: '1.2rem', color: stats.approval >= 75 ? '#81c784' : stats.approval < 25 ? '#e57373' : '#ffd700' }}></i>
                    <div>
                        <div className="font-cinzel" style={{ fontSize: '0.65rem', color: '#8d6e63', letterSpacing: '1px', fontWeight: 800 }}>APPROVAL</div>
                        <div className="font-garamond" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{stats.approval}%</div>
                    </div>
                </div>

                {/* Food */}
                <div className="beveled-panel" style={{ 
                    width: '130px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '0 12px', 
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,215,0,0.1)',
                    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
                }}>
                    <i className="fa-solid fa-wheat-awn" style={{ fontSize: '1.2rem', color: '#f9a825' }}></i>
                    <div>
                        <div className="font-cinzel" style={{ fontSize: '0.65rem', color: '#8d6e63', letterSpacing: '1px', fontWeight: 800 }}>FOOD</div>
                        <div className="font-garamond" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{typeof stats.foodTotal === 'number' ? Math.floor(stats.foodTotal).toLocaleString() : '0'}</div>
                    </div>
                </div>

                {/* Workforce / Idle */}
                <div className="beveled-panel" style={{ 
                    minWidth: '140px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '0 12px', 
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,215,0,0.1)',
                    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)',
                    position: 'relative'
                }}>
                    <i className="fa-solid fa-person-digging" style={{ fontSize: '1.2rem', color: '#ffd700' }}></i>
                    <div style={{ flex: 1 }}>
                        <div className="font-cinzel" style={{ fontSize: '0.65rem', color: '#8d6e63', letterSpacing: '1px', fontWeight: 800 }}>WORKFORCE</div>
                        <div className="font-garamond" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', gap: '8px' }}>
                            <span>{villagersCount - totalAssigned} <span style={{ fontSize: '0.7rem', color: '#8d6e63' }}>IDLE</span></span>
                            {scholarsCount > 0 && (
                                <span style={{ borderLeft: '1px solid rgba(255,215,0,0.2)', paddingLeft: '8px', color: '#67b0ff' }}>
                                    {scholarsCount} <span style={{ fontSize: '0.7rem', color: '#8d6e63' }}>SCH</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={reclaimAllWorkers}
                        disabled={assigning}
                        title="Reclaim All Workers (Set all to Idle)"
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(255,0,0,0.1)',
                            border: '1px solid rgba(255,0,0,0.3)',
                            color: '#ff5252',
                            borderRadius: '4px',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                        }}
                    >
                        <i className={`fa-solid fa-rotate-left ${assigning ? 'fa-spin' : ''}`}></i>
                    </button>
                </div>

                {/* Spy Level (Conditional) */}
                {stats.spyLevel > 0 && (
                    <div className="beveled-panel" style={{ 
                        width: '100px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '0 12px', 
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(103, 176, 255, 0.2)',
                        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
                    }}>
                        <i className="fa-solid fa-user-secret" style={{ fontSize: '1.2rem', color: '#67b0ff' }}></i>
                        <div>
                            <div className="font-cinzel" style={{ fontSize: '0.65rem', color: '#8d6e63', letterSpacing: '1px', fontWeight: 800 }}>SPY LVL</div>
                            <div className="font-garamond" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{stats.spyLevel}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Resource Ticker (Expanded & Scrollable) */}
            <div className="beveled-panel" style={{ 
                flex: 1, 
                display: 'flex', 
                gap: '20px', 
                overflowX: 'auto', 
                alignItems: 'center', 
                height: '100%', 
                padding: '0 20px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,215,0,0.08)',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#5c4033 transparent'
            }}>
                {PRIMARY_RESOURCES.map(res => {
                    const lookup = (r) => {
                        if (!r) return null;
                        if (resources && typeof resources[r] !== 'undefined') return resources[r];
                        const lower = r.toLowerCase();
                        if (resources && typeof resources[lower] !== 'undefined') return resources[lower];
                        if (resources && resources.cartContents && typeof resources.cartContents[r] !== 'undefined') return resources.cartContents[r];
                        try {
                            if (typeof window !== 'undefined' && window.__lastFetchedArea && areaId && window.__lastFetchedArea[areaId]) {
                                const a = window.__lastFetchedArea[areaId];
                                if (a.resources && typeof a.resources[r] !== 'undefined') return a.resources[r];
                                if (a.resources && typeof a.resources[lower] !== 'undefined') return a.resources[lower];
                            }
                        } catch (e) {}
                        return null;
                    };

                    const raw = lookup(res) ?? 0;
                    const amount = (typeof raw === 'number' && isFinite(raw)) ? Math.floor(raw) : 0;
                    const iconDef = RESOURCE_ICON_MAP[res] || { icon: 'fa-box', color: '#fff' };
                    
                    // Only show resources that the player actually has (or primary ones)
                    if (amount === 0 && !['Timber', 'Stone', 'Coal', 'Food'].includes(res)) return null;

                    return (
                        <div key={res} style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            minWidth: '60px',
                            justifyContent: 'center'
                        }} title={`${res}: ${amount.toLocaleString()}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className={`fa-solid ${iconDef.icon}`} style={{ color: iconDef.color || '#fff', fontSize: '0.9rem' }}></i>
                                <span className="font-garamond" style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                                    {amount > 999999 ? `${(amount/1000000).toFixed(1)}M` : amount > 9999 ? `${(amount/1000).toFixed(1)}K` : amount.toLocaleString()}
                                </span>
                            </div>
                            <div className="font-cinzel" style={{ fontSize: '0.55rem', color: '#8d6e63', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>{res}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AreaOverviewPanel;
