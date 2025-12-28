import { ResourceEnum } from '../constants/enums.js';

/**
 * RESEARCH_DEFS grouped by assigned building.
 * 'One-Off' techs are permanent unlocks.
 * 'Infinite' techs scale in cost and benefit per level.
 */
export const RESEARCH_DEFS = {
    // --- TOWN HALL RESEARCH ---
    TownHall: {
        'Basic Sanitation': {
            id: 'Basic Sanitation',
            name: 'Basic Sanitation',
            description: '+2% Pop Growth Speed per level.',
            baseCost: { [ResourceEnum.Food]: 500, [ResourceEnum.Stone]: 200 },
            growthFactor: 1.7,
            requirement: { building: 'TownHall', level: 3 },
            type: 'Infinite'
        },
        'Hardwood Framing': {
            id: 'Hardwood Framing',
            name: 'Hardwood Framing',
            description: '+5% Housing Capacity per level.',
            baseCost: { [ResourceEnum.Timber]: 800, [ResourceEnum.Planks]: 400 },
            growthFactor: 1.8,
            requirement: { building: 'TownHall', level: 5 },
            type: 'Infinite'
        },
        'Drafting Tactics': {
            id: 'Drafting Tactics',
            name: 'Drafting Tactics',
            description: '-5% Unit Training Time per level.',
            baseCost: { [ResourceEnum.Food]: 1000, [ResourceEnum.Timber]: 500 },
            growthFactor: 1.6,
            requirement: { building: 'TownHall', level: 10 },
            type: 'Infinite'
        },
        'Fertility Festivals': {
            id: 'Fertility Festivals',
            name: 'Fertility Festivals',
            description: 'Significantly boosts population growth (+25% per level). 4 Tiers.',
            baseCost: { [ResourceEnum.Food]: 1000, [ResourceEnum.Gold]: 100 },
            growthFactor: 2.0,
            requirement: { building: 'TownHall', level: 2 },
            type: 'Infinite'
        }
    },

    // --- STOREHOUSE RESEARCH ---
    Storehouse: {
        'Gold Storage': {
            id: 'Gold Storage',
            name: 'Gold Storage',
            description: 'Allows storage of Gold in your Storehouse.',
            baseCost: { [ResourceEnum.Gold]: 0, [ResourceEnum.Timber]: 50 },
            durationSeconds: 60,
            type: 'One-Off'
        },
        'Mineral Storage': {
            id: 'Mineral Storage',
            name: 'Mineral Storage',
            description: 'Allows storage of mineral resources (Stone/Coal) in your Storehouse.',
            baseCost: { [ResourceEnum.Gold]: 0, [ResourceEnum.Timber]: 60 },
            durationSeconds: 75,
            type: 'One-Off'
        },
        'Preservation': {
            id: 'Preservation',
            name: 'Preservation',
            description: '-3% Army Food Upkeep per level.',
            baseCost: { [ResourceEnum.Food]: 1000, [ResourceEnum.Stone]: 500 },
            growthFactor: 1.6,
            type: 'Infinite'
        }
    },

    // --- BLOOMERY & SAWPIT RESEARCH ---
    Bloomery: {
        'Bellows Design': {
            id: 'Bellows Design',
            name: 'Bellows Design',
            description: '-2% Smelting Fuel Cost per level.',
            baseCost: { [ResourceEnum.Stone]: 400, [ResourceEnum.Timber]: 300 },
            growthFactor: 1.6,
            requirement: { building: 'Bloomery', level: 1 },
            type: 'Infinite'
        }
    },
    StonePit: {
        'Deep Prospecting': {
            id: 'Deep Prospecting',
            name: 'Deep Prospecting',
            description: 'Advanced mining techniques allow Stone Pits to refine ores from deeper deposits.',
            baseCost: { [ResourceEnum.Stone]: 500 },
            durationSeconds: 120,
            requiredTownLevel: 5,
            type: 'One-Off'
        },
        'Deep Prospecting_Infinite': {
            id: 'Deep Prospecting_Infinite',
            name: 'Efficiency Mining',
            description: '+5% Mine Output per level.',
            baseCost: { [ResourceEnum.Stone]: 1000, [ResourceEnum.Food]: 500 },
            growthFactor: 1.6,
            requirement: { building: 'StonePit', level: 10 },
            type: 'Infinite'
        }
    },

    Sawpit: {
        'Wagon Reinforce': {
            id: 'Wagon Reinforce',
            name: 'Wagon Reinforce',
            description: '+15% Transport Capacity per level.',
            baseCost: { [ResourceEnum.Planks]: 1000, [ResourceEnum.IronIngot]: 500 },
            growthFactor: 1.6,
            requirement: { building: 'Sawpit', level: 5 },
            type: 'Infinite'
        }
    },

    // --- LIBRARY & UNIVERSITY (Advanced Studies) ---
    Library: {
        'Sanitation Works': {
            id: 'Sanitation Works',
            name: 'Sanitation Works',
            description: 'Reduces population spawn timer. Each level reduces wait time by 10%.',
            baseCost: { [ResourceEnum.Food]: 800, [ResourceEnum.Stone]: 300 },
            growthFactor: 1.6,
            requirement: { building: 'Library', level: 1 },
            type: 'Infinite'
        },
        'Medical Alchemy': {
            id: 'Medical Alchemy',
            name: 'Medical Alchemy',
            description: 'Improves medical knowledge; reduces population spawn timer and improves survival. Scholars accelerate this research.',
            baseCost: { [ResourceEnum.Knowledge]: 200, [ResourceEnum.Food]: 1200 },
            growthFactor: 1.7,
            requirement: { building: 'Library', level: 2 },
            type: 'Infinite'
        },
        'Open Borders Policy': {
            id: 'Open Borders Policy',
            name: 'Open Borders Policy',
            description: 'Allows refugees to settle when nearby battle wrecks are salvaged. 20% chance per wreck to gain refugees.',
            baseCost: { [ResourceEnum.Gold]: 300, [ResourceEnum.Knowledge]: 150 },
            durationSeconds: 60,
            requirement: { building: 'Library', level: 1 },
            type: 'One-Off'
        },
        'Trading Hub': {
            id: 'Trading Hub',
            name: 'Trading Hub',
            description: 'Enables wagons and trade hubs.',
            baseCost: { [ResourceEnum.Gold]: 40, [ResourceEnum.Timber]: 60 },
            durationSeconds: 40,
            type: 'One-Off'
        },
        'Cartography': {
            id: 'Cartography',
            name: 'Cartography',
            description: '+10% Movement Speed per level.',
            baseCost: { [ResourceEnum.Food]: 600, [ResourceEnum.Timber]: 300 },
            growthFactor: 1.5,
            requirement: { building: 'Library', level: 1 },
            type: 'Infinite'
        },
        'Barter Ledger': {
            id: 'Barter Ledger',
            name: 'Barter Ledger',
            description: 'Unlocks P2P Market Hub.',
            baseCost: { [ResourceEnum.Planks]: 5000, [ResourceEnum.IronIngot]: 2000 },
            requirement: { building: 'Library', level: 5 },
            type: 'One-Off'
        },
        'Scavenging': {
            id: 'Scavenging',
            name: 'Scavenging',
            description: '+5% Battlefield Salvage per level.',
            baseCost: { [ResourceEnum.Food]: 800, [ResourceEnum.Stone]: 400 },
            growthFactor: 1.6,
            requirement: { building: 'Library', level: 3 },
            type: 'Infinite'
        }
    },
    University: {
        'Advanced Studies': {
            id: 'Advanced Studies',
            name: 'Advanced Studies',
            description: 'Unlocks higher tier technology trees.',
            baseCost: { [ResourceEnum.Gold]: 120 },
            durationSeconds: 90,
            type: 'One-Off'
        },
        'Mercenary Guards': {
            id: 'Mercenary Guards',
            name: 'Mercenary Guards',
            description: '+5% Trade Cart Defense per level.',
            baseCost: { [ResourceEnum.Gold]: 500, [ResourceEnum.Food]: 1000 },
            growthFactor: 1.7,
            requirement: { building: 'University', level: 1 },
            type: 'Infinite'
        },
        'Sovereign Command': {
            id: 'Sovereign Command',
            name: 'Sovereign Command',
            description: '+1 Active Army Slot per level.',
            baseCost: { [ResourceEnum.Gold]: 2000, [ResourceEnum.Food]: 5000 },
            growthFactor: 1.8,
            requirement: { building: 'University', level: 5 },
            type: 'Infinite'
        },
        'Citadel Masonry': {
            id: 'Citadel Masonry',
            name: 'Citadel Masonry',
            description: 'Unlocks permanent Citadel Upgrades.',
            baseCost: { [ResourceEnum.Stone]: 20000, [ResourceEnum.Steel]: 5000 },
            requirement: { building: 'University', level: 10 },
            type: 'One-Off'
        }
    },

    // --- STABLE RESEARCH ---
    Stable: {
        'Selective Breeding': {
            id: 'Selective Breeding',
            name: 'Selective Breeding',
            description: 'Reduces Breeding Time by 10%/lvl.',
            baseCost: { [ResourceEnum.Food]: 5000, [ResourceEnum.Gold]: 1000 },
            growthFactor: 1.6,
            requirement: { building: 'Stable', level: 1 },
            type: 'Infinite'
        },
        'Heavy Stirrups': {
            id: 'Heavy Stirrups',
            name: 'Heavy Stirrups',
            description: 'Unlocks "Knight" heavy cavalry recruitment.',
            baseCost: { [ResourceEnum.IronIngot]: 2000, [ResourceEnum.Planks]: 1000 },
            requirement: { building: 'Stable', level: 5 },
            type: 'One-Off'
        }
    },

    // (Barracks research removed — Barracks is handled via buildings/units)
};

// Flattened version for easy lookup by techId
export const ALL_RESEARCH = Object.values(RESEARCH_DEFS).reduce((acc, category) => {
    return { ...acc, ...category };
}, {});

export function getResearchDef(techId) {
    return ALL_RESEARCH[techId] || null;
}