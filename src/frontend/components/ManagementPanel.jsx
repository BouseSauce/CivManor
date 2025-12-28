import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BuildingCard from './BuildingCard';
import CoreBuildingCard from './CoreBuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import { RESEARCH_DEFS } from '../../core/config/research.js';

const MILITARY_BUILDINGS = ['Barracks', 'Stable', 'SiegeWorkshop', 'Wall', 'Tower', 'Watchtower'];

/**
 * ManagementPanel - Displays a grid of buildings
 */
const ManagementPanel = ({ area = null, buildings, queue = [], onUpgrade, onAssign, filter = 'all', openResearchModal }) => {
    const [selected, setSelected] = useState(null);

    const getTownHallReq = (b) => {
        const cfg = BUILDING_CONFIG[b.id];
        if (!cfg) return 0;
        if (b.id === 'TownHall') return 0;
        if (cfg.requirement && cfg.requirement.building === 'TownHall') {
            return cfg.requirement.level || 0;
        }
        // If it requires something else, it's effectively higher tier
        if (cfg.requirement) return 99; 
        return 0;
    };

    // Keep selected building fresh when buildings prop updates
    useEffect(() => {
        if (selected) {
            const fresh = buildings.find(b => b.id === selected.id);
            if (fresh) setSelected(fresh);
        }
    }, [buildings, selected?.id]);

    const handleOpen = (b) => setSelected(b);
    const handleClose = () => setSelected(null);

    const townHall = (buildings || []).find(b => b.id === 'TownHall') || { level: 1 };
    const townHallLevel = townHall.level || 1;

    // Ensure we have a canonical list of all known buildings (merge with provided `buildings` if available)
    const providedMap = (buildings || []).reduce((m, b) => { if (b && b.id) m[b.id] = b; return m; }, {});
    const canonicalBuildings = Object.keys(BUILDING_CONFIG).map(id => {
        const cfg = BUILDING_CONFIG[id] || {};
        const provided = providedMap[id] || {};
        
        // Progressive Disclosure disabled: show canonical list of all buildings
        const isVisible = true;

        return {
            id,
            name: cfg.name || provided.name || id,
            displayName: provided.displayName || cfg.displayName || cfg.name || id,
            level: typeof provided.level === 'number' ? provided.level : (provided.level || 0),
            isLocked: typeof provided.isLocked === 'boolean' ? provided.isLocked : (provided.isLocked || false),
            isUpgrading: provided.isUpgrading || false,
            isQueued: provided.isQueued || false,
            assigned: typeof provided.assigned === 'number' ? provided.assigned : (provided.assigned || 0),
            missingReqs: provided.missingReqs || provided.missing || [],
            category: provided.category || cfg.category || null,
            tags: provided.tags || cfg.tags || [],
            icon: provided.icon || cfg.icon || null,
            upgradeCost: provided.upgradeCost || null,
            isVisible,
            // keep any additional fields present on provided object
            ...provided
        };
    });

    // Ensure `Barracks` appears in the canonical list (workaround for any accidental omissions)
    if (!canonicalBuildings.find(b => b.id === 'Barracks')) {
        const cfg = BUILDING_CONFIG['Barracks'] || {};
        canonicalBuildings.push({
            id: 'Barracks',
            name: cfg.name || 'Barracks',
            displayName: cfg.displayName || cfg.name || 'Barracks',
            level: 0,
            isLocked: true,
            isUpgrading: false,
            isQueued: false,
            assigned: 0,
            missingReqs: [],
            category: cfg.category || 'Military',
            tags: cfg.tags || [],
            icon: cfg.icon || null,
            upgradeCost: null,
            isVisible: true
        });
    }

    // Filter buildings
    const filteredBuildings = canonicalBuildings.filter(b => {
        if (!b.isVisible) return false;

        if (filter === 'economy') {
            return !MILITARY_BUILDINGS.includes(b.id) && b.resourceTier !== 'Warfare';
        }

        if (filter === 'built') {
            return b.level && b.level > 0;
        }

        if (filter === 'gathering') {
            const name = (b.name || '').toLowerCase();
            const gatheringNames = ['farm', 'lumber', 'quarry', 'mine', 'pasture', 'field'];
            if (b.produces) return true;
            if (gatheringNames.some(n => name.includes(n))) return true;
            if (b.resourceTier && /gather|agri|food|production/i.test(b.resourceTier)) return true;
            return false;
        }

        if (filter === 'industry') {
            const name = (b.name || '').toLowerCase();
            const industryNames = ['workshop', 'mill', 'forge', 'factory'];
            if (b.resourceTier === 'Industry') return true;
            if (industryNames.some(n => name.includes(n))) return true;
            return false;
        }

        return true;
    });

    // Sort: Unlocked first, then constructed, then by name
    // Mark queued buildings
    const queuedIds = (queue || []).map(q => q.id || q.buildingId || q.name).filter(Boolean);
    const enriched = filteredBuildings.map(b => ({ ...b, isQueued: queuedIds.includes(b.id) }));

    const sortedBuildings = [...enriched].sort((a, b) => {
        // Grouping: built (level>0) -> buildable (level===0 && unlocked) -> locked
        const groupFor = (x) => {
            const lvl = x.level || 0;
            if (lvl > 0) return 0; // built
            if (!x.isLocked) return 1; // buildable
            return 2; // locked
        };
        const ga = groupFor(a);
        const gb = groupFor(b);
        if (ga !== gb) return ga - gb;

        // Within built group: sort by level desc then name
        if (ga === 0) {
            const la = a.level || 0;
            const lb = b.level || 0;
            if (la !== lb) return lb - la;
            return (a.name || '').localeCompare(b.name || '');
        }

        // Within buildable group: prefer lower TownHall requirement then name
        if (ga === 1) {
            const reqA = getTownHallReq(a);
            const reqB = getTownHallReq(b);
            if (reqA !== reqB) return reqA - reqB;
            return (a.name || '').localeCompare(b.name || '');
        }

        // Within locked group: sort by requirement level then name
        const reqA = getTownHallReq(a);
        const reqB = getTownHallReq(b);
        if (reqA !== reqB) return reqA - reqB;
        return (a.name || '').localeCompare(b.name || '');
    });

    // Category tabs and mapping
    const CATEGORIES = ['ALL', 'Township', 'Extraction', 'Industry', 'Stronghold'];
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

    const mapToCategory = (b) => {
        if (activeCategory === 'ALL') return 'ALL';
        // Prefer explicit category if provided
        const id = b.id;
        const name = (b.name || '').toLowerCase();
        const cat = (b.category || '').toString().toLowerCase();
        if (cat.includes('military') || ['barracks','stable','archeryrange','wall','tower','siegeworshop','siegeworskshop'].some(x=>id.toLowerCase().includes(x) || name.includes(x))) return 'Stronghold';
        if (['mine','quarry','surfacemine','goldshaft','sawpit'].some(x=>id.toLowerCase().includes(x) || name.includes(x))) return 'Extraction';
        if (['bloomery','sawpit','sawmill','steelworks','saw'].some(x=>id.toLowerCase().includes(x) || name.includes(x))) return 'Industry';
        // Township is default for homes, townhall, storehouse
        return 'Township';
    };

    const categoryBuildings = sortedBuildings.filter(b => activeCategory === 'ALL' || mapToCategory(b) === activeCategory);

    if (activeCategory === 'ALL') {
        categoryBuildings.sort((a, b) => {
            // 1. Unlocked first
            if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1;
            
            // 2. If both unlocked, sort by built status (optional, but good)
            // or just keep them by name/tier. Let's use Tier/Name.
            if (!a.isLocked) {
                 // Sort by Tier if available, else Name
                 const tierA = BUILDING_CONFIG[a.id]?.tier || 1;
                 const tierB = BUILDING_CONFIG[b.id]?.tier || 1;
                 if (tierA !== tierB) return tierA - tierB;
                 return (a.name || '').localeCompare(b.name || '');
            }

            // 3. If both Locked, sort by Requirement Level
            const reqA = getTownHallReq(a);
            const reqB = getTownHallReq(b);
            return reqA - reqB;
        });
    }

    return (
        <div className='management-panel' style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className='panel-header' style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0 0 16px 0',
                borderBottom: '2px solid var(--wood-dark)',
                marginBottom: '20px',
                background: 'none'
            }}>
                <h2 className="font-cinzel" style={{ 
                    margin: 0, 
                    color: 'var(--text-main)', 
                    fontSize: '1.8rem', 
                    fontWeight: 800,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(197, 160, 89, 0.2)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    <i className='fa-solid fa-city' style={{ marginRight: 15, color: 'var(--accent-gold)' }}></i>Township Management
                </h2>
                
                <div style={{ display: 'flex', gap: 10 }}>
                    {CATEGORIES.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className="font-cinzel"
                            style={{
                                background: activeCategory === cat ? 'var(--accent-gold)' : 'rgba(0,0,0,0.4)',
                                color: activeCategory === cat ? 'var(--wood-dark)' : 'var(--text-main)',
                                border: activeCategory === cat ? '1px solid var(--text-highlight)' : '1px solid var(--panel-border)',
                                padding: '8px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                boxShadow: activeCategory === cat ? '0 0 10px rgba(197, 160, 89, 0.4)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className='panel-body' style={{ padding: '20px', overflow: 'visible' }}>
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeCategory}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '20px',
                            width: '100%',
                            margin: '0 auto'
                        }}
                    >
                        {categoryBuildings.map(b => {
                            if (b.id === 'TownHall') {
                                return (
                                    <CoreBuildingCard 
                                        key={b.id}
                                        b={b}
                                        onOpen={handleOpen}
                                        onAssign={(...args) => { onAssign && onAssign(...args); }}
                                        onUpgrade={(id) => { onUpgrade && onUpgrade(id); }}
                                        area={area}
                                    />
                                );
                            }
                            return (
                                <BuildingCard 
                                    key={b.id}
                                    b={b} 
                                    compact={true} 
                                    onOpen={handleOpen} 
                                    onAssign={(...args) => { onAssign && onAssign(...args); }} 
                                    onUpgrade={(id) => { onUpgrade && onUpgrade(id); }} 
                                    openResearchModal={openResearchModal}
                                    hasResearch={!!RESEARCH_DEFS[b.id]}
                                    area={area}
                                />
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            <BuildingDetailPanel 
                building={selected} 
                area={area}
                onClose={handleClose} 
                onUpgrade={(id) => { onUpgrade && onUpgrade(id); handleClose(); }} 
                onAssignVillagers={(id, count) => { return onAssign ? onAssign(id, count) : Promise.resolve(); }}
                openResearchModal={openResearchModal}
            />
        </div>
    );
};

export default ManagementPanel;
