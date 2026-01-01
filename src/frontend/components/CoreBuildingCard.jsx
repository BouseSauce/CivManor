import React, { useState } from 'react';
import { BUILDING_CONFIG, computeTotalLevelCost } from '../../core/config/buildings.js';
import { calculateBuildTime } from '../../core/logic/scaling.js';
import { getColorForIconClass, getIconForResource } from '../constants/iconMaps';

export default function CoreBuildingCard({ b, onOpen, onAssign, onUpgrade, area, readOnly = false }) {
    const [isHovered, setIsHovered] = useState(false);

    // --- 1. Name Evolution Logic ---
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

    // --- 2. Dual Stat Header Logic ---
    // Calculate current output based on level
    // Note: We use the helper from buildings.js if available, or manual calc
    // TownHall has baseOutput: { populationCap: 50, foodPerHour: 90 }
    // Scaling is typically 1.1^L
    const scale = Math.pow(1.1, Math.max(0, level - 1));
    const currentPopCap = Math.floor((config.baseOutput?.populationCap || 0) * level * scale); // Linear * Scale approximation or use housingByLevel
    // Actually TownHall uses housingByLevel for pop cap usually, but let's stick to the config we just edited
    // Wait, I didn't remove housingByLevel. Let's use housingByLevel if it exists for accuracy
    const popCap = config.housingByLevel ? (config.housingByLevel[level] || config.housingByLevel[config.housingByLevel.length-1]) : currentPopCap;
    
    const foodProd = Math.floor((config.baseOutput?.foodPerHour || 0) * level * scale);

    // --- 3. Assignment Logic ---
    const liveArea = (typeof window !== 'undefined' && window.__lastFetchedArea && area && area.id && window.__lastFetchedArea[area.id]) ? window.__lastFetchedArea[area.id] : area;
    const assignedCount = (liveArea && liveArea.assignments && typeof liveArea.assignments[b.id] === 'number') ? liveArea.assignments[b.id] : 0;
    const maxWorkers = (config.workforceCap || 0) * level;
    const currentFoodProd = assignedCount > 0 ? Math.floor(foodProd * (0.5 + (assignedCount * 0.5))) : 0;

    const producesRaw = (() => {
        try {
            const bo = config.baseOutput || {};
            const tags = (config.tags || []).map(t => (t || '').toString().toLowerCase());
            if (tags.includes('espionage') || tags.includes('intel')) return false;
            if (Object.keys(bo).some(k => typeof bo[k] === 'number')) return true;
            const relevant = ['processing', 'extraction', 'industry', 'gathering'];
            if (tags.some(t => relevant.includes(t))) return true;
            if ((b.id || '') === 'Watchtower') return false;
            return false;
        } catch (e) { return false; }
    })();

    // --- Upgrade Logic ---
    const nextLevelCost = computeTotalLevelCost(b.id, level + 1) || {};
    const canAffordUpgrade = Object.entries(nextLevelCost).every(([r, amt]) => (area?.resources?.[r] || 0) >= amt);
    const estTime = calculateBuildTime(b.id, level);
        const estTimeStr = estTime < 60 ? `${estTime}s` : estTime < 3600 ? `${Math.floor(estTime/60)}m` : `${Math.floor(estTime/3600)}h`;

    return (
        <div
            className={`standard-card compact ${b.isLocked ? 'locked' : ''} ${!b.isLocked && !b.isUpgrading ? 'glow-card' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onOpen(b)}
            style={{ cursor: 'pointer', position: 'relative', minHeight: 180, boxSizing: 'border-box' }}
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
                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Settlement Core</div>
                </div>
            </div>

            {/* Dual Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' }}>Pop Cap</div>
                    <div style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{area?.population?.current || 0} / {popCap}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' }}>Food Prod</div>
                    <div style={{ color: '#81c784', fontWeight: 'bold' }}>+{currentFoodProd}/hr</div>
                </div>
            </div>

            {/* Gathering Panel */}
            {producesRaw && (
            <div className="beveled-panel" style={{ padding: '8px', borderRadius: 6, marginBottom: 12, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        <i className="fas fa-wheat-awn" style={{ marginRight: 8, color: '#f9a825' }}></i> Gathering
                    </span>
                    <span className="badge badge-level" style={{ fontSize: '0.75rem' }}>{assignedCount} / {maxWorkers} Workers</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        className="btn" 
                        style={{ flex: 1, padding: '4px 0', fontSize: '0.8rem' }}
                        onClick={(e) => { e.stopPropagation(); onAssign(b.id, Math.max(0, assignedCount - 1)); }}
                    >-</button>
                    <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '4px 0', fontSize: '0.8rem' }}
                        onClick={(e) => { e.stopPropagation(); onAssign(b.id, Math.min(maxWorkers, assignedCount + 1)); }}
                    >+</button>
                </div>
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
