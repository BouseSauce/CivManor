import { ResourceEnum } from '../constants/enums.js';

/**
 * RESEARCH_DEFS grouped by assigned building.
 * 'One-Off' techs are permanent unlocks.
 * 'Infinite' techs scale in cost and benefit per level.
 */
export const RESEARCH_DEFS = {
    // --- PILLAR 1: VITALITY (Growth & Governance) ---
    TownHall: {
        'Basic Sanitation': {
            id: 'Basic Sanitation',
            name: 'Basic Sanitation',
            description: '+2% Pop Growth Speed per level. Lvl 3: Unlocks "Refugee Discovery".',
            baseCost: { [ResourceEnum.Food]: 500, [ResourceEnum.Stone]: 200 },
            growthFactor: 1.7,
            requirement: { building: 'TownHall', level: 1 },
            type: 'Infinite',
            maxLevel: 10
        },
        'Literacy': {
            id: 'Literacy',
            name: 'Literacy',
            description: 'Unlocks Scholars & Knowledge Pool.',
            baseCost: { [ResourceEnum.Food]: 1000, [ResourceEnum.Knowledge]: 100 },
            durationSeconds: 60,
            requirement: { tech: 'Basic Sanitation', level: 5 },
            type: 'One-Off'
        },
        'Bureaucracy': {
            id: 'Bureaucracy',
            name: 'Bureaucracy',
            description: 'Lvl 5: Unlocks Taxation (Gold from Pop).',
            baseCost: { [ResourceEnum.Food]: 1500, [ResourceEnum.Knowledge]: 200 },
            growthFactor: 1.8,
            requirement: { tech: 'Literacy', level: 1 },
            type: 'Infinite',
            maxLevel: 15
        },
        'Sovereign Command': {
            id: 'Sovereign Command',
            name: 'Sovereign Command',
            description: '+1 Active Army Slot per level.',
            baseCost: { [ResourceEnum.Food]: 5000, [ResourceEnum.Steel]: 500 },
            growthFactor: 2.0,
            requirement: { tech: 'Bureaucracy', level: 10 },
            type: 'Infinite',
            maxLevel: 5
        },
        'Tenements': {
            id: 'Tenements',
            name: 'Tenements',
            description: 'Aggressive urban housing. +15% Pop Growth Speed per level.',
            baseCost: { [ResourceEnum.Timber]: 2000, [ResourceEnum.Stone]: 1000, [ResourceEnum.Knowledge]: 500 },
            growthFactor: 2.5,
            requirement: { tech: 'Bureaucracy', level: 5 },
            type: 'Infinite'
        },
        'Sovereignty': {
            id: 'Sovereignty',
            name: 'Sovereignty',
            description: 'Unlocks the Claim Cart, allowing expansion into new territories.',
            baseCost: { [ResourceEnum.Food]: 10000, [ResourceEnum.Steel]: 1000, [ResourceEnum.Knowledge]: 2000 },
            durationSeconds: 3600,
            requirement: { tech: 'Bureaucracy', level: 10, building: 'TownHall', level: 5 },
            type: 'One-Off'
        }
    },

    // --- PILLAR 2: STRUCTURE (Logistics & Industrial) ---
    LoggingCamp: {
        'Plank Refinement': {
            id: 'Plank Refinement',
            name: 'Plank Refinement',
            description: 'Unlocks the Sawpit for refining Timber into Planks.',
            baseCost: { [ResourceEnum.Timber]: 500, [ResourceEnum.Stone]: 200 },
            durationSeconds: 60,
            requirement: { building: 'LoggingCamp', level: 5 },
            type: 'One-Off'
        }
    },
    StonePit: {
        'Metallurgy': {
            id: 'Metallurgy',
            name: 'Metallurgy',
            description: 'Unlocks the Bloomery for refining Stone into Iron Ingots.',
            baseCost: { [ResourceEnum.Stone]: 1000, [ResourceEnum.Timber]: 500 },
            durationSeconds: 90,
            requirement: { building: 'StonePit', level: 5 },
            type: 'One-Off'
        }
    },
    Sawpit: {
        'The Wheel': {
            id: 'The Wheel',
            name: 'The Wheel',
            description: 'Unlocks Cargo Wagon (Basic).',
            baseCost: { [ResourceEnum.Timber]: 500, [ResourceEnum.Stone]: 200 },
            durationSeconds: 45,
            requirement: { building: 'Sawpit', level: 1 },
            type: 'One-Off'
        },
        'Logistics': {
            id: 'Logistics',
            name: 'Logistics',
            description: 'Lvl 8: Unlocks Large Cargo Wagon.',
            baseCost: { [ResourceEnum.Planks]: 1000, [ResourceEnum.Food]: 500 },
            growthFactor: 1.6,
            requirement: { tech: 'The Wheel', level: 1 },
            type: 'Infinite',
            maxLevel: 20
        }
    },
    Library: {
        'Chemistry': {
            id: 'Chemistry',
            name: 'Chemistry',
            description: 'Lvl 4: Unlocks Charcoal Kilns.',
            baseCost: { [ResourceEnum.Knowledge]: 300, [ResourceEnum.Food]: 1000 },
            growthFactor: 1.7,
            requirement: { tech: 'Literacy', level: 1 },
            type: 'Infinite',
            maxLevel: 12
        },
        'Architecture': {
            id: 'Architecture',
            name: 'Architecture',
            description: 'Lvl 5: Unlocks Stone Walls (Fortification).',
            baseCost: { [ResourceEnum.Stone]: 2000, [ResourceEnum.Knowledge]: 500 },
            growthFactor: 1.8,
            requirement: { tech: 'Chemistry', level: 2 },
            type: 'Infinite',
            maxLevel: 10
        }
    },

    // --- PILLAR 3: MIGHT (Defense & Espionage) ---
    Bloomery: {
        'Steel Refining': {
            id: 'Steel Refining',
            name: 'Steel Refining',
            description: 'Lvl 5: Unlocks Blast Furnace.',
            baseCost: { [ResourceEnum.IronIngot]: 1000, [ResourceEnum.Coal]: 500 },
            growthFactor: 1.7,
            requirement: { tech: 'Metallurgy', level: 1 },
            type: 'Infinite',
            maxLevel: 20
        }
    },
    Watchtower: {
        'Espionage': {
            id: 'Espionage',
            name: 'Espionage',
            description: 'Lvl 4: See Unit Types in alerts.',
            baseCost: { [ResourceEnum.Knowledge]: 500, [ResourceEnum.Food]: 2000 },
            growthFactor: 1.7,
            requirement: { tech: 'Literacy', level: 1 },
            type: 'Infinite',
            maxLevel: 15
        }
    },
    Stable: {
        'Alloy Mixing': {
            id: 'Alloy Mixing',
            name: 'Alloy Mixing',
            description: 'Lvl 5: Unlocks Knights (Heavy Cavalry).',
            baseCost: { [ResourceEnum.Steel]: 1000, [ResourceEnum.Knowledge]: 1000 },
            growthFactor: 1.9,
            requirement: { tech: 'Metallurgy', level: 8 },
            type: 'Infinite',
            maxLevel: 10
        }
    }
};

// Flattened version for easy lookup by techId
export const ALL_RESEARCH = Object.values(RESEARCH_DEFS).reduce((acc, category) => {
    return { ...acc, ...category };
}, {});

export function getResearchDef(techId) {
    return ALL_RESEARCH[techId] || null;
}