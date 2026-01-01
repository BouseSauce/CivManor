import React, { useState, useEffect } from 'react';
import { BUILDING_CONFIG, computeTotalLevelCost, computeTotalProductionExtraction } from '../../core/config/buildings.js';
import { UNIT_CONFIG } from '../../core/config/units.js';
import { GameClient } from '../api/client.js';
import { calculateBuildTime, calculateStorageCapacity } from '../../core/logic/scaling.js';
import { getColorForIconClass, getIconForResource } from '../constants/iconMaps';

export default function BuildingCard({ b, onOpen, onAssign, onUpgrade, area, readOnly = false }) {
    const [isHovered, setIsHovered] = useState(false);
    const [scholarCount, setScholarCount] = useState(0);
    const [isRecruiting, setIsRecruiting] = useState(false);

    // --- 1. Config & Name ---
    const config = BUILDING_CONFIG[b.id] || {};
    const level = b.level || 1;
    
    let displayName = config.displayName || b.name;
    let displayIcon = config.icon || 'fa-home';

    if (config.nameEvolution) {
        const evo = config.nameEvolution.find(e => level <= e.maxLevel);
        if (evo) {
            displayName = evo.name;
            displayIcon = evo.icon;
        }
    }

    // --- 2. Stats & Production ---
    // Calculate production string
    const productionBenefit = (() => {
        const prod = computeTotalProductionExtraction(b.id, level) || {};
        const entries = Object.entries(prod);
        if (entries.length === 0) return null;
        // Filter out internal keys if needed, but usually computeTotalProductionExtraction returns clean data
        return entries.map(([k, v]) => {
            const label = k.replace(/PerHour|PerLevel|PerWorker/i, '').replace(/([A-Z])/g, ' $1').trim();
            const num = (typeof v === 'number' && isFinite(v)) ? Math.round(v) : Number(v) || 0;
            return { label, value: num };
        });
    })();

    // Determine "Type" subtitle
    const typeSubtitle = (() => {
        if (config.tags) {
            if (config.tags.includes('military')) return 'Military';
            if (config.tags.includes('production')) return 'Production';
            if (config.tags.includes('housing')) return 'Housing';
            if (config.tags.includes('storage')) return 'Storage';
            if (config.tags.includes('civic')) return 'Civic';
        }
        return 'Building';
    })();

    // --- 3. Assignment Logic ---
    const liveArea = (typeof window !== 'undefined' && window.__lastFetchedArea && area && area.id && window.__lastFetchedArea[area.id]) ? window.__lastFetchedArea[area.id] : area;
    
    // --- 4. Scholar Logic ---
    useEffect(() => {
        if (liveArea && liveArea.units) {
            const s = Array.isArray(liveArea.units) 
                ? liveArea.units.find(u => u.type === 'Scholar')
                : { count: liveArea.units['Scholar'] || 0 };
            setScholarCount(s ? s.count : 0);
        }
    }, [liveArea]);

    const scholarConfig = UNIT_CONFIG['Scholar'];
    const canRecruitScholar = liveArea && scholarConfig && 
        (liveArea.resources?.Food >= scholarConfig.cost.Food) &&
        ((liveArea.units?.Villager || 0) > 0 || (Array.isArray(liveArea.units) && (liveArea.units.find(u => u.type === 'Villager')?.count || 0) > 0));

    const handleRecruit = async () => {
        if (!canRecruitScholar || isRecruiting) return;
        setIsRecruiting(true);
        try {
            await GameClient.recruit(liveArea.id, 'Scholar', 1);
            window.dispatchEvent(new CustomEvent('area:refresh-request', { detail: { areaId: liveArea.id } }));
        } catch (e) {
            alert(e.message);
        } finally {
            setIsRecruiting(false);
        }
    };

    // Calculate assigned count
    const assignedCount = (() => {
        if (!liveArea || !liveArea.assignments) {
            return (b && typeof b.assigned === 'number' ? b.assigned : 0);
        }
        // Sum assignments for this building
        return Object.entries(liveArea.assignments).reduce((acc, [k, v]) => {
            if (k === b.id || k.startsWith(b.id + ':')) {
                return acc + (v || 0);
            }
            return acc;
        }, 0);
    })();

    const maxWorkers = (config.workforceCap || 0) * level;

    const isStorehouse = b.id === 'Storehouse';
    const storehouseCapacities = isStorehouse ? (() => {
        try {
            const cfg = BUILDING_CONFIG['Storehouse'];
            if (!cfg || !cfg.storageBase) return null;
            const caps = {};
            Object.keys(cfg.storageBase).forEach(res => {
                caps[res] = calculateStorageCapacity(res, level);
            });
            return caps;
        } catch (e) { return null; }
    })() : null;

    const producesRaw = (() => {
        try {
            const bo = config.baseOutput || {};
            const tags = (config.tags || []).map(t => (t || '').toString().toLowerCase());
            if (tags.includes('espionage') || tags.includes('intel')) return false;
            if (Object.keys(bo).some(k => typeof bo[k] === 'number')) return true;
            const relevant = ['processing', 'extraction', 'industry', 'gathering', 'research'];
            if (tags.some(t => relevant.includes(t))) return true;
            if ((b.id || '') === 'Watchtower') return false;
            return false;
        } catch (e) { return false; }
    })();
    
    // Show assignment if maxWorkers > 0 and it produces raw resources or is a processing building
    // We also allow Library and University specifically
    const showAssignment = (maxWorkers > 0 && producesRaw) || b.id === 'Library' || b.id === 'University';

    // --- 4. Upgrade Logic ---
    const nextLevelCost = computeTotalLevelCost(b.id, level + 1) || {};
    const canAffordUpgrade = Object.entries(nextLevelCost).every(([r, amt]) => (area?.resources?.[r] || 0) >= amt);
    const estTime = calculateBuildTime(b.id, level);
    const estTimeStr = estTime < 60 ? `${estTime}s` : estTime < 3600 ? `${Math.floor(estTime/60)}m` : `${Math.floor(estTime/3600)}h`;

    // Description
    const desc = b.description || config.description || 'No description available.';
    const flavorText = desc.split('.')[0] + '.';

    return (
        <div
            className={`standard-card compact ${b.isLocked ? 'locked' : ''} ${!b.isLocked && !b.isUpgrading ? 'glow-card' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onOpen && onOpen(b)}
            style={{ cursor: 'pointer', position: 'relative', minHeight: 180, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '8px' }}>
                <div className="beveled-panel" style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                    <i className={`fas ${displayIcon}`} style={{ fontSize: '1.5rem', color: getColorForIconClass(displayIcon || '') || 'var(--accent-gold)' }} />
                </div>
                <div>
                    <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'MedievalSharp', serif" }}>
                        {displayName} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Lvl {level}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{typeSubtitle}</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isStorehouse ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {isStorehouse && storehouseCapacities ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '100%' }}>
                        {Object.entries(storehouseCapacities).map(([res, cap]) => {
                            const def = getIconForResource(res) || { icon: 'fa-box', color: '#bbb' };
                            return (
                                <div key={res} style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <i className={"fa-solid " + def.icon} style={{ fontSize: '0.7rem', color: '#ffd700', marginBottom: '2px' }}></i>
                                    <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 'bold' }}>{cap.toLocaleString()}</div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    productionBenefit && productionBenefit.length > 0 ? (
                        productionBenefit.slice(0, 2).map((stat, idx) => (
                            <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' }}>{stat.label}</div>
                                <div style={{ color: '#81c784', fontWeight: 'bold' }}>{stat.value}/hr</div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' }}>Status</div>
                            <div style={{ color: '#fff', fontWeight: 'bold' }}>Operational</div>
                        </div>
                    )
                )}
            </div>

            {/* Assignment or Description */}
            {showAssignment ? (
                <div className="beveled-panel" style={{ padding: '8px', borderRadius: 6, marginBottom: 12, background: 'rgba(255,255,255,0.05)', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            <i className="fas fa-users" style={{ marginRight: 8, color: '#f9a825' }}></i> Workforce
                        </span>
                        <span className="badge badge-level" style={{ fontSize: '0.75rem' }}>{assignedCount} / {maxWorkers}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                            className="btn" 
                            style={{ flex: 1, padding: '4px 0', fontSize: '0.8rem' }}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (b.id && typeof onAssign === 'function') {
                                    onAssign(b.id, Math.max(0, assignedCount - 1)); 
                                }
                            }}
                        >-</button>
                        <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '4px 0', fontSize: '0.8rem' }}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (b.id && typeof onAssign === 'function') {
                                    onAssign(b.id, Math.min(maxWorkers, assignedCount + 1)); 
                                }
                            }}
                        >+</button>
                    </div>
                </div>
            ) : (
                <div className="beveled-panel" style={{ padding: '12px', borderRadius: 6, marginBottom: 12, background: 'rgba(255,255,255,0.05)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontStyle: 'italic', color: '#aaa', fontSize: '0.85rem', textAlign: 'center', fontFamily: 'Garamond, serif' }}>
                        "{flavorText}"
                    </div>
                </div>
            )}

            {/* Scholar Panel (Library/University only) */}
            {(b.id === 'Library' || b.id === 'University') && !b.isLocked && (
                <div className="beveled-panel" style={{ padding: '8px', borderRadius: 6, marginBottom: 12, background: 'rgba(255,255,255,0.05)', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            <i className="fas fa-graduation-cap" style={{ marginRight: 8, color: '#ce93d8' }}></i> Scholars
                        </span>
                        <span className="badge badge-level" style={{ fontSize: '0.75rem' }}>{scholarCount}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                        <span>+{scholarCount * 2} Knowledge</span>
                        <span>-{scholarCount * 5} Food</span>
                    </div>
                    {!readOnly && (
                        <button
                            className={`btn font-cinzel ${canRecruitScholar ? 'btn-primary' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleRecruit(); }}
                            disabled={!canRecruitScholar}
                            style={{ width: '100%', padding: '4px 0', fontSize: '0.75rem' }}
                        >
                            {isRecruiting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus" />}
                            &nbsp;Recruit Scholar ({scholarConfig?.cost?.Food} Food)
                        </button>
                    )}
                </div>
            )}

            {/* Upgrade Footer */}
            {b.isUpgrading ? (
                <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden', height: '24px', position: 'relative' }}>
                    <div style={{ width: `${b.progress || 0}%`, height: '100%', background: '#ffd700', opacity: 0.5 }}></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        Upgrading... {Math.floor(b.progress || 0)}%
                    </div>
                </div>
            ) : (
                !readOnly && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpgrade(b.id); }}
                        disabled={!canAffordUpgrade}
                        style={{
                            marginTop: 'auto',
                            width: '100%',
                            padding: '6px',
                            background: canAffordUpgrade ? 'linear-gradient(to bottom, #4e342e, #3e2723)' : '#3e2723',
                            border: canAffordUpgrade ? '1px solid #ffd700' : '1px solid #5c4033',
                            borderRadius: '4px',
                            color: canAffordUpgrade ? '#ffd700' : '#8d6e63',
                            fontWeight: 'bold',
                            cursor: canAffordUpgrade ? 'pointer' : 'not-allowed',
                            opacity: canAffordUpgrade ? 1 : 0.9,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            minHeight: '42px',
                            boxShadow: canAffordUpgrade ? '0 0 10px rgba(255, 215, 0, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ fontSize: '0.85rem' }}>Upgrade ({estTimeStr})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', fontSize: '0.75rem' }}>
                            {Object.entries(nextLevelCost).map(([res, amt]) => {
                                const iconDef = getIconForResource(res);
                                const userHas = (area?.resources?.[res] || 0);
                                const isMissing = userHas < amt;
                                return (
                                    <span key={res} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: (!canAffordUpgrade && isMissing) ? '#ff5252' : 'inherit' }}>
                                        <i className={`fa-solid ${iconDef.icon}`} style={{ fontSize: '0.7rem' }}></i>
                                        <span>{amt.toLocaleString()}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </button>
                )
            )}
        </div>
    );
}
