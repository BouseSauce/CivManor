import React, { useState, useEffect } from 'react';
import { GameClient } from '../api/client';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';

/**
 * AreaOverviewPanel
 * Displays core stats (Pop, Approval, Food) and the active queue.
 */
const AreaOverviewPanel = ({ areaId, areaName, coordinates, stats = {}, queue = [], units = [], assignments = {}, buildings = [], ownerName = null, compact = false, onRefresh = null }) => {
    const [localAssignments, setLocalAssignments] = useState(assignments || {});
    const [assigning, setAssigning] = useState(false);
    const [secondsMap, setSecondsMap] = useState({});

    const villagersCount = (units && units.find(u => u.type === 'Villager') || { count: 0 }).count;
    const totalAssigned = Object.values(localAssignments).reduce((a,b) => a + b, 0);

    const changeAssignment = async (buildingId, delta) => {
        const current = localAssignments[buildingId] || 0;
        const next = Math.max(0, current + delta);
        if (next === current) return;

        // Quick local update
        const updated = { ...localAssignments, [buildingId]: next };
        if (next === 0) delete updated[buildingId];
        setLocalAssignments(updated);

        // Send to server
        try {
            setAssigning(true);
            await GameClient.assignWorkers(areaId, buildingId, next);
            if (typeof onRefresh === 'function') onRefresh();
        } catch (err) {
            // revert on error
            setLocalAssignments(assignments || {});
            console.error('Assign failed', err);
            alert(err && err.message ? err.message : 'Assign failed');
        } finally {
            setAssigning(false);
        }
    };

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
    
    return (
        <div className='panel'>
            {!compact && (
                <div className='panel-header'>
                    AREA OVERVIEW
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'none', fontWeight: 'normal' }}>
                        {ownerName ? `Lord ${ownerName}` : ''}
                    </div>
                </div>
            )}

            {/* Core Stats Section - Responsive Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 16,
                marginBottom: 16
            }}>
                <div className='stat-box' style={{ minWidth: 120, padding: 12 }}>
                    <div className='stat-label'><i className='fa-solid fa-users'></i> POPULATION</div>
                    <div className='stat-value' style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.currentPop}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {stats.maxPop}</div>
                    </div>
                </div>

                <div className='stat-box' style={{ minWidth: 120, padding: 12 }}>
                    <div className='stat-label'><i className='fa-solid fa-face-smile'></i> APPROVAL</div>
                    <div className='stat-value' style={{ color: stats.approval >= 75 ? 'var(--accent-green)' : stats.approval < 25 ? 'var(--accent-red)' : '#fff', fontWeight: 700, fontSize: '1.25rem' }}>
                        {stats.approval}%
                    </div>
                </div>

                <div className='stat-box' style={{ minWidth: 120, padding: 12 }}>
                    <div className='stat-label'><i className='fa-solid fa-wheat-awn'></i> FOOD SUPPLY</div>
                    <div className='stat-value' style={{ color: (typeof stats.foodTotal === 'number' && stats.foodTotal > 0) ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700, fontSize: '1.25rem' }}>
                        {typeof stats.foodTotal === 'number' ? Math.floor(stats.foodTotal).toLocaleString() : 'Unknown'}
                    </div>
                </div>
                    <div className='stat-box' style={{ minWidth: 160, padding: 12 }}>
                        <div className='stat-label'><i className='fa-solid fa-utensils'></i> FOOD CONSUMPTION</div>
                        <div className='stat-value' style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {typeof stats.populationConsumptionPerHour === 'number' ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ color: 'var(--accent-red)' }}>{Math.floor(stats.populationConsumptionPerHour).toLocaleString()} food-value/hr</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>~{Math.floor(stats.breadEquivalentPerHour || 0).toLocaleString()} bread/hr</div>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>Unknown</div>
                            )}
                        </div>
                    </div>
            </div>

            {/* Worker Assignments */}
            {!compact && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 6, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Villagers</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6, minWidth: 120 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Villagers</div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{villagersCount}</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6, minWidth: 140 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assigned</div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{totalAssigned}</div>
                            <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                                <div style={{ width: `${villagersCount ? Math.min(100, Math.round((totalAssigned / villagersCount) * 100)) : 0}%`, height: '100%', background: 'var(--accent-gold)' }} />
                            </div>
                        </div>

                        {(['ForagersHut','HuntingLodge'].some(bid => findBuildingLevel(bid) > 0) && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 0, flexWrap: 'wrap' }}>
                                {['ForagersHut','HuntingLodge'].map(bid => {
                                    const lvl = findBuildingLevel(bid);
                                    if (lvl < 1) return null;
                                    const cur = localAssignments[bid] || 0;
                                    const displayName = (BUILDING_CONFIG[bid] && BUILDING_CONFIG[bid].displayName) || bid;
                                    // Determine capacity: use explicit workerCapacity if provided, otherwise default to 5 workers per level
                                    const capacity = (BUILDING_CONFIG[bid] && BUILDING_CONFIG[bid].workerCapacity) ? BUILDING_CONFIG[bid].workerCapacity * lvl : Math.max(1, lvl * 5);
                                    // Building state: Active if assigned > 0, Inactive if assigned == 0, Full if assigned >= capacity
                                    let state = 'Inactive';
                                    if (cur > 0 && cur < capacity) state = 'Active';
                                    if (cur >= capacity) state = 'Full';

                                    const stateColor = state === 'Active' ? 'var(--accent-green)' : state === 'Full' ? 'var(--accent-gold)' : 'var(--text-muted)';

                                    return (
                                        <div key={bid} style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6, minWidth: 160 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{displayName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lvl {lvl}</span></div>
                                                <div style={{ fontSize: '0.75rem', color: stateColor, fontWeight: 700, padding: '4px 8px', borderRadius: 12, background: 'rgba(0,0,0,0.02)' }}>{state}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                                                <button className='btn' aria-label={`remove worker from ${displayName}`} disabled={assigning || lvl < 1} onClick={() => changeAssignment(bid, -1)}>-</button>
                                                <div style={{ minWidth: 36, textAlign: 'center', fontWeight: 700 }}>{cur}</div>
                                                <button className='btn btn-primary' aria-label={`add worker to ${displayName}`} disabled={assigning || totalAssigned >= villagersCount || lvl < 1 || cur >= capacity} onClick={() => changeAssignment(bid, 1)}>+</button>
                                            </div>
                                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Capacity: {capacity}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{assigning ? 'Updating...' : ''}</div>
                    </div>
                </div>
            )}

            {/* Active Projects removed per user request (aggregated queue now shown on My Empire) */}
        </div>
    );
};

export default AreaOverviewPanel;
