import { ResourceEnum } from '../constants/enums.js';

/**
 * BUILDING_CONFIG defines the core stats, costs, and progression scaling for every 
 * structure in the game. It is used to calculate costs, production, and prerequisites.
 */
export const BUILDING_CONFIG = {
    TownHall: {
        id: 'TownHall', name: 'Town Hall', displayName: 'Town Hall', tier: 1,
        category: 'Economy',
        tags: ['core', 'economy'],
        description: 'The heart of your settlement. Increases total population capacity and allows for basic food gathering.',
        growthFactor: 1.8,
        baseCost: { [ResourceEnum.Timber]: 200, [ResourceEnum.Stone]: 150 },
        workforceCap: 10,
        baseOutput: { populationCap: 50, foodPerHour: 350 },
        housingByLevel: [0, 50, 100, 200, 400, 800, 1500, 3000, 6000, 12000, 25000],
        requirement: null,
        allowsScholars: true,
        nameEvolution: [
            { maxLevel: 10, name: 'Settlement Hall', icon: 'fa-warehouse' },
            { maxLevel: 20, name: 'Colonial Estate', icon: 'fa-landmark' },
            { maxLevel: 999, name: 'Imperial Manor', icon: 'fa-chess-rook' }
        ]
    },

    LoggingCamp: {
        id: 'LoggingCamp', name: 'Logging Camp', displayName: 'Logging Camp', tier: 1,
        category: 'Extraction',
        tags: ['extraction', 'gathering', 'timber'],
        description: 'Harvests nearby forests to produce Timber for construction.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Timber]: 50, [ResourceEnum.Stone]: 20 },
        workforceCap: 2,
        baseOutput: { timberPerHour: 60 },
        requirement: null
    },
    StonePit: {
        id: 'StonePit', name: 'Stone Pit', displayName: 'Stone Pit', tier: 1,
        category: 'Extraction',
        icon: 'fa-hammer',
        tags: ['extraction', 'gathering', 'stone'],
        description: 'A basic quarry for extracting Stone.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Timber]: 100, [ResourceEnum.Stone]: 50 },
        workforceCap: 3,
        baseOutput: { stonePerHour: 80 },
        requirement: null
    },
    
    Storehouse: {
        id: 'Storehouse', name: 'Storehouse', displayName: 'Storehouse', tier: 1,
        category: 'Economy',
        tags: ['economy', 'storage'],
        description: 'Increases the maximum storage capacity for all resource types.',
        growthFactor: 1.6,
        baseCost: { [ResourceEnum.Timber]: 150, [ResourceEnum.Stone]: 75 },
        workforceCap: 0,
        storageBase: {
            [ResourceEnum.Timber]: 2500,
            [ResourceEnum.Stone]: 2000,
            [ResourceEnum.Food]: 2500,
            [ResourceEnum.Bread]: 2500,
            [ResourceEnum.Planks]: 1200,
            [ResourceEnum.IronIngot]: 1000,
            [ResourceEnum.Coal]: 1000,
            [ResourceEnum.Steel]: 800,
            [ResourceEnum.Knowledge]: 200
        },
        storageMultiplier: 1.5,
        baseOutput: {},
        requirement: null
    },

    Barracks: {
        id: 'Barracks', name: 'Barracks', displayName: 'Barracks', tier: 1,
        category: 'Military',
        tags: ['military', 'warfare'],
        description: 'A training ground for your military. Allows for the recruitment of Militia and Spearmen.',
        growthFactor: 1.4,
        baseCost: { [ResourceEnum.Timber]: 150, [ResourceEnum.Stone]: 100 },
        workforceCap: 5,
        baseOutput: { special: 'Recruits Militia and Spearmen' },
        requirement: { building: 'TownHall', level: 1 }
    },

    Sawpit: {
        id: 'Sawpit', name: 'Sawpit', displayName: 'Sawpit', tier: 2,
        category: 'Industry',
        tags: ['industry', 'processing', 'planks'],
        description: 'Refines raw Timber into Planks, a necessary material for Tier 2+ structures.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Timber]: 500, [ResourceEnum.Stone]: 200 },
        workforceCap: 3,
        baseOutput: { ratio: 4, planksPerHour: 18 },
        requirement: { tech: 'Plank Refinement', level: 1 }
    },
    Bloomery: {
        id: 'Bloomery', name: 'Bloomery', displayName: 'Bloomery', tier: 2,
        category: 'Industry',
        icon: 'fa-fire-burner',
        tags: ['industry', 'processing', 'iron'],
        description: 'Extracts Iron from stone using heat and labor.',
        growthFactor: 1.6,
        baseCost: { [ResourceEnum.Timber]: 800, [ResourceEnum.Stone]: 400 },
        workforceCap: 5,
        baseOutput: { ratio: 4, ingotPerHour: 7.2 },
        requirement: { tech: 'Metallurgy', level: 1 }
    },
    Library: {
        id: 'Library', name: 'Library', displayName: 'Library', tier: 2,
        category: 'Economy',
        tags: ['economy', 'research', 'knowledge'],
        description: 'Employs Scholars to generate Knowledge, used to unlock new technologies.',
        growthFactor: 1.6,
        baseCost: { [ResourceEnum.Timber]: 1000, [ResourceEnum.Stone]: 500 },
        workforceCap: 2,
        baseOutput: { scholars: 2 },
        requirement: { building: 'TownHall', level: 8 }
    },

    Watchtower: {
        id: 'Watchtower', name: 'Watchtower', displayName: 'Watchtower', tier: 2,
        category: 'Military',
        icon: 'fa-tower-observation',
        tags: ['military', 'espionage', 'intel'],
        description: 'A tall vantage point for sentries. Trains Scouts and Spies (Lvl 20). Increases Spy Level and detection radius.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Planks]: 200, [ResourceEnum.IronIngot]: 50 },
        workforceCap: 3,
        baseOutput: { spyLevel: 1, special: 'Trains Scouts and Spies' },
        requirement: { building: 'TownHall', level: 5 }
    },

    ArcheryRange: {
        id: 'ArcheryRange', name: 'Archery Range', displayName: 'Archery Range', tier: 2,
        category: 'Military',
        tags: ['military', 'warfare'],
        description: 'Advanced military building for training Archers and Skirmishers.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Timber]: 400, [ResourceEnum.Planks]: 200 },
        workforceCap: 3,
        baseOutput: { special: 'Recruits Archers and Skirmishers' },
        requirement: { building: 'TownHall', level: 5 }
    },

    SiegeWorkshop: {
        id: 'SiegeWorkshop', name: 'Siege Workshop', displayName: 'Siege Workshop', tier: 3,
        category: 'Military',
        tags: ['military', 'warfare', 'siege'],
        description: 'Constructs heavy siege engines for destroying fortifications.',
        growthFactor: 1.6,
        baseCost: { [ResourceEnum.Planks]: 1000, [ResourceEnum.IronIngot]: 500 },
        workforceCap: 5,
        baseOutput: { special: 'Recruits Mangonels and Trebuchets' },
        requirement: { building: 'Barracks', level: 10 }
    },

    CharcoalKiln: {
        id: 'CharcoalKiln', name: 'Charcoal Kiln', displayName: 'Charcoal Kiln', tier: 3,
        category: 'Industry',
        tags: ['industry', 'processing', 'coal'],
        description: 'Burns Planks in a low-oxygen environment to produce Coal, essential for Steel production.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Planks]: 800 },
        workforceCap: 3,
        baseOutput: { ratio: 4, coalPerHour: 36 },
        requirement: { building: 'Bloomery', level: 5 }
    },

    University: {
        id: 'University', name: 'University', displayName: 'University', tier: 4,
        category: 'Economy',
        tags: ['economy', 'research', 'knowledge'],
        description: 'The pinnacle of learning. Generates vast amounts of Knowledge and unlocks Tier 5 technologies.',
        growthFactor: 1.3,
        baseCost: { [ResourceEnum.Planks]: 5000, [ResourceEnum.IronIngot]: 2000 },
        workforceCap: 5,
        baseOutput: { scholars: 5 },
        requirement: { building: 'TownHall', level: 15 }
    },
    SteelWorks: {
        id: 'SteelWorks', name: 'Steel Works', displayName: 'Steel Works', tier: 4,
        category: 'Industry',
        tags: ['industry', 'processing', 'steel'],
        description: 'Combines Iron Ingots and Coal to create Steel, the strongest metal in the realm.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Planks]: 8000, [ResourceEnum.IronIngot]: 4000 },
        workforceCap: 12,
        baseOutput: { ratio: 4, steelPerHour: 3.6 },
        requirement: { building: 'Bloomery', level: 10 }
    },
    UrbanDistrict: {
        id: 'UrbanDistrict', name: 'Urban District', displayName: 'Urban District', tier: 4,
        category: 'Economy',
        tags: ['economy', 'housing'],
        description: 'A sprawling city zone that provides a percentage-based bonus to the total population cap.',
        growthFactor: 1.9,
        baseCost: { [ResourceEnum.Planks]: 10000 },
        workforceCap: 0,
        baseOutput: { popCapMultiplierPercent: 10 },
        requirement: { building: 'TownHall', level: 15 }
    },

    // GoldShaft and RoyalMint removed per game design decision.
    CitadelWatch: {
        id: 'CitadelWatch', name: 'Citadel Watch', displayName: 'Citadel Watch', tier: 5,
        category: 'Military',
        tags: ['military', 'warfare'],
        description: 'An expansive surveillance tower that allows for scouting multiple global regions at once.',
        growthFactor: 1.5,
        baseCost: { [ResourceEnum.Stone]: 50000, [ResourceEnum.Steel]: 10000 },
        workforceCap: 0,
        baseOutput: { special: 'Multi-Region Scouting' },
        requirement: { quest: 'Great Ruin' }
    },

    Stable: {
        id: 'Stable', name: 'Stable', displayName: 'Stable', tier: 2,
        category: 'Military',
        tags: ['military', 'warfare'],
        description: 'Breeds and houses Horses. Allows for the recruitment of Knights.',
        growthFactor: 1.2,
        baseCost: { [ResourceEnum.Planks]: 2000, [ResourceEnum.Stone]: 1000 },
        workforceCap: 2,
        baseOutput: { special: 'Recruits Knights' },
        requirement: { items: { Horse: 1 } }
    }
};

/**
 * Calculates the exponential cost for a building based on its level.
 * @param {string} buildingKey - The unique ID of the building.
 * @param {number} level - The level being purchased.
 * @returns {Object|null} An object containing resource names and their calculated costs.
 */
export function computeTotalLevelCost(buildingKey, level = 1) {
    const cfg = BUILDING_CONFIG[buildingKey];
    if (!cfg) return null;
    const gf = Number(cfg.growthFactor || 1);
    const base = cfg.baseCost || {};
    const multiplier = Math.pow(gf, Math.max(0, level - 1));
    const out = {};
    Object.keys(base).forEach(r => { out[r] = Math.ceil((base[r] || 0) * multiplier); });
    return out;
}

/**
 * Calculates the resource production or extraction rate for a building.
 * Scaling follows a linear level multiplier combined with a 10% efficiency bonus per level.
 * @param {string} buildingKey - The unique ID of the building.
 * @param {number} level - The current level of the building.
 * @returns {Object|null} Calculated output values (e.g., timberPerHour).
 */
export function computeTotalProductionExtraction(buildingKey, level = 1) {
    const cfg = BUILDING_CONFIG[buildingKey];
    if (!cfg) return null;
    const baseOut = cfg.baseOutput || {};
    const scale = Math.pow(1.1, Math.max(0, level - 1));
    const out = {};
    Object.keys(baseOut).forEach(k => {
        const v = baseOut[k];
        if (k === 'ratio') {
            out[k] = v; // Ratio is a base conversion factor, not scaled by level
            return;
        }
        if (typeof v === 'number') {
            out[k] = Number((v * level * scale).toFixed(4));
        } else {
            out[k] = v;
        }
    });
    return out;
}

/**
 * Computes the output of a processing building (like a Sawpit or Bloomery).
 * The conversion ratio is a fixed base value configured per building.
 * Building level no longer changes the conversion efficiency — level
 * may still affect production rates elsewhere, but not the raw->refined ratio.
 * @param {number} inputAvailable - The amount of raw material provided.
 * @param {number} ratio - The conversion ratio (e.g., 5 raw to 1 refined).
 * @param {number} level - The level of the processing building (unused for ratio).
 * @returns {number} The amount of refined resource producible from input.
 */
export function computeProcessingOutput(inputAvailable, ratio, level = 1) {
    const raw = (inputAvailable / ratio);
    return Number(raw);
}