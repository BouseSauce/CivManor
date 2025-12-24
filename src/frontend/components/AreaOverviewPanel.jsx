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
    
    return (
        <div className="area-overview-panel" style={{ 
            display: 'flex', 
            gap: '16px', 
            padding: '12px', 
            background: 'var(--wood-medium)', 
            borderBottom: '4px solid var(--wood-dark)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            alignItems: 'center',
            flexShrink: 0,
            height: '80px' // Fixed height as requested
        }}>
            {/* Area Name */}
            <div className="beveled-panel" style={{ minWidth: '200px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 16px' }}>
                <div className="font-cinzel" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{areaName || 'Unknown Area'}</div>
                <div className="font-garamond" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{coordinates || 'No Coords'}</div>
            </div>

            {/* Stats Dashboard */}
            <div style={{ display: 'flex', gap: '12px', flex: 1, height: '100%' }}>
                <div className="beveled-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                    <i className="fa-solid fa-users" style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}></i>
                    <div>
                        <div className="font-cinzel" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', letterSpacing: '1.5px', fontWeight: 700 }}>POPULATION</div>
                        <div className="font-garamond" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.currentPop} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>/ {stats.maxPop}</span></div>
                    </div>
                </div>

                <div className="beveled-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                    <i className="fa-solid fa-face-smile" style={{ fontSize: '1.4rem', color: stats.approval >= 75 ? '#2e7d32' : stats.approval < 25 ? '#c62828' : 'var(--text-main)' }}></i>
                    <div>
                        <div className="font-cinzel" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', letterSpacing: '1.5px', fontWeight: 700 }}>APPROVAL</div>
                        <div className="font-garamond" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.approval}%</div>
                    </div>
                </div>

                <div className="beveled-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                    <i className="fa-solid fa-wheat-awn" style={{ fontSize: '1.4rem', color: '#f9a825' }}></i>
                    <div>
                        <div className="font-cinzel" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', letterSpacing: '1.5px', fontWeight: 700 }}>FOOD</div>
                        <div className="font-garamond" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{typeof stats.foodTotal === 'number' ? Math.floor(stats.foodTotal).toLocaleString() : '0'}</div>
                    </div>
                </div>

                {stats.spyLevel > 0 && (
                    <div className="beveled-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                        <i className="fa-solid fa-user-secret" style={{ fontSize: '1.4rem', color: '#67b0ff' }}></i>
                        <div>
                            <div className="font-cinzel" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', letterSpacing: '1.5px', fontWeight: 700 }}>SPY LEVEL</div>
                            <div className="font-garamond" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.spyLevel}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Resource Ticker (Simplified) */}
            <div className="beveled-panel" style={{ display: 'flex', gap: '20px', overflowX: 'auto', maxWidth: '450px', alignItems: 'center', height: '100%', padding: '0 20px' }}>
                {['Timber', 'Stone', 'Planks', 'Gold', 'IronIngot'].map(res => {
                    // Robust lookup: check exact key, lowercase key, cartContents, and last-fetched area cache
                    const lookup = (r) => {
                        if (!r) return null;
                        // direct
                        if (resources && typeof resources[r] !== 'undefined') return resources[r];
                        // lowercase
                        const lower = r.toLowerCase();
                        if (resources && typeof resources[lower] !== 'undefined') return resources[lower];
                        // cartContents (some endpoints put resources in cartContents)
                        if (resources && resources.cartContents && typeof resources.cartContents[r] !== 'undefined') return resources.cartContents[r];
                        if (resources && resources.cartContents && typeof resources.cartContents[lower] !== 'undefined') return resources.cartContents[lower];
                        // last fetched area global cache
                        try {
                            if (typeof window !== 'undefined' && window.__lastFetchedArea && areaId && window.__lastFetchedArea[areaId]) {
                                const a = window.__lastFetchedArea[areaId];
                                if (a.resources && typeof a.resources[r] !== 'undefined') return a.resources[r];
                                if (a.resources && typeof a.resources[lower] !== 'undefined') return a.resources[lower];
                                if (a.cartContents && typeof a.cartContents[r] !== 'undefined') return a.cartContents[r];
                                if (a.cartContents && typeof a.cartContents[lower] !== 'undefined') return a.cartContents[lower];
                            }
                        } catch (e) {}
                        return null;
                    };

                    const raw = lookup(res) ?? 0;
                    const amount = (typeof raw === 'number' && isFinite(raw)) ? Math.floor(raw) : 0;
                    const iconDef = RESOURCE_ICON_MAP[res] || { icon: 'fa-box', color: '#fff' };
                    return (
                        <div key={res} style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={`${res}: ${amount.toLocaleString()}`}>
                            <i className={`fa-solid ${iconDef.icon}`} style={{ color: 'var(--text-main)', fontSize: '1rem' }}></i>
                            <span className="font-garamond" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>{amount.toLocaleString()}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AreaOverviewPanel;
