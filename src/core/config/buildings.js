import { ResourceEnum } from '../constants/enums.js';

/**
 * Centralized BUILDING_CONFIG used by backend and frontend UI.
 * Each building contains metadata used for rendering and calculating costs.
 */
export const BUILDING_CONFIG = {
    // --- Tier 1: Survival & Basic Industry ---
    LoggingCamp: {
        id: 'LoggingCamp', name: 'Logging Camp', displayName: 'Logging Camp', icon: 'fa-solid fa-tree', tier: 1, resourceTier: 'T1',
        category: 'Gathering', tags: ['gathering','resources','timber'],
        description: 'Produces Timber and provides basic firewood.',
        growthFactor: 1.5, baseBuildTimeMinutes: 5,
        baseCost: { [ResourceEnum.Timber]: 20, [ResourceEnum.Stone]: 0 },
        unlocks: ['Timber']
    },
    Farmhouse: {
        id: 'Farmhouse', name: 'Farmhouse', displayName: 'Farmhouse', icon: 'fa-solid fa-wheat-awn', tier: 1, resourceTier: 'T1',
        category: 'Gathering', tags: ['gathering','food'],
        description: 'Core food production building.',
        growthFactor: 1.5, baseBuildTimeMinutes: 10,
        baseCost: { [ResourceEnum.Timber]: 40, [ResourceEnum.Stone]: 10 },
        unlocks: ['Bread'],
        relatedTechs: ['Agriculture']
    },
    // --- Early Food: Foraging & Hunting ---
    ForagersHut: {
        id: 'ForagersHut', name: 'Foragers Hut', displayName: 'Foragers Hut', icon: 'fa-solid fa-leaf', tier: 1, resourceTier: 'Food',
        category: 'Gathering', tags: ['gathering','food'],
        description: 'Assign villagers to gather berries and simple wild foods.',
        growthFactor: 1.5, baseBuildTimeMinutes: 6,
        baseCost: { [ResourceEnum.Timber]: 30, [ResourceEnum.Stone]: 5 },
        unlocks: ['Berries']
    },
    HuntingLodge: {
        id: 'HuntingLodge', name: 'Hunting Lodge', displayName: 'Hunting Lodge', icon: 'fa-solid fa-dog', tier: 1, resourceTier: 'Food',
        category: 'Gathering', tags: ['gathering','food','meat'],
        description: 'Assign villagers to hunt game for meat; higher yield but requires more workers. Advanced hunting techniques unlock hides at higher lodge levels.',
        growthFactor: 1.5, baseBuildTimeMinutes: 8,
        baseCost: { [ResourceEnum.Timber]: 40, [ResourceEnum.Stone]: 10 },
        // Meat is available immediately; hides are unlocked once Hunting Lodge reaches level 5
        unlocks: ['Meat'],
        // levelUnlocks maps resource -> minimum building level required to unlock that resource
        levelUnlocks: { Hides: 5 }
    },
    StonePit: {
        id: 'StonePit', name: 'Stone Pit', displayName: 'Stone Pit', icon: 'fa-solid fa-mountain', tier: 1, resourceTier: 'T1',
        category: 'Gathering', tags: ['gathering','stone','resources'],
        description: 'Small surface quarry where villagers extract stone. Lower output than a Deep Mine but available early.',
        growthFactor: 1.5, baseBuildTimeMinutes: 8,
        baseCost: { [ResourceEnum.Timber]: 40, [ResourceEnum.Stone]: 5 },
        unlocks: ['Stone']
    },

    // --- Tier 2: Settlement & Logistics ---
    Storehouse: {
        id: 'Storehouse', name: 'Storehouse', displayName: 'Storehouse', icon: 'fa-solid fa-warehouse', tier: 2, resourceTier: 'Capacity',
        category: 'Economy', tags: ['economy','storage'],
        description: 'Increases storage capacity for all resources.',
        growthFactor: 1.5, baseBuildTimeMinutes: 20,
        baseCost: { [ResourceEnum.Timber]: 100, [ResourceEnum.Stone]: 50 },
        unlocks: []
    },
    Granary: {
        id: 'Granary', name: 'Granary', displayName: 'Granary', icon: 'fa-solid fa-jar-wheat', tier: 2, resourceTier: 'Food',
        category: 'Economy', tags: ['economy','storage','food'],
        description: 'Increases food capacity to stabilize population.',
        growthFactor: 1.5, baseBuildTimeMinutes: 20,
        baseCost: { [ResourceEnum.Timber]: 80, [ResourceEnum.Stone]: 20 },
        unlocks: []
    },
    TownHall: {
        id: 'TownHall', name: 'Town Hall', displayName: 'Camp Ground', icon: 'fa-solid fa-landmark', tier: 2, resourceTier: 'Admin',
        category: 'Economy', tags: ['economy','admin','housing','research'],
        // Dynamic role: acts as the settlement 'Town' and provides housing capacity + research hub.
        description: 'The central settlement building — increases housing capacity and enables civic research.',
        growthFactor: 1.5, baseBuildTimeMinutes: 60,
        baseCost: { [ResourceEnum.Timber]: 500, [ResourceEnum.Stone]: 500 },
        unlocks: ['Administration'],
        // Settlement-level related techs (e.g., early civic/production techs)
        // Make Basic Tools available from the Settlement (TownHall)
        relatedTechs: ['CivicManagement','Administration','Basic Tools'],
        // Leveled display names for settlement growth (index = level)
        levelNames: [
            'Camp Ground',      // level 0 (not built)
            'Settlement',       // level 1
            'Small Village',    // level 2
            'Village',          // level 3
            'Small Town',       // level 4
            'Town',             // level 5
            'City'              // level 6+
        ],
        // Housing capacity explicitly defined per level (index = level). Defaults chosen to approximate previous linear progression.
        // Format: [level0, level1, level2, ...]
        housingByLevel: [5, 20, 35, 50, 65, 80, 95],
        // Research slots unlocked by Town level (index = level). Level 0 has 0 slots, early levels unlock 1 slot, higher levels unlock more.
        researchSlotsByLevel: [0, 1, 1, 2, 2, 3, 4]
    },
    TradeBroker: {
        id: 'TradeBroker', name: 'Trade Broker', displayName: 'Trade Broker', icon: 'fa-solid fa-handshake', tier: 2, resourceTier: 'Special',
        category: 'Economy', tags: ['economy','trade'],
        description: 'Enables external trade and the Trade Cart unit.',
        growthFactor: 1.5, baseBuildTimeMinutes: 30,
        baseCost: { [ResourceEnum.Timber]: 150, [ResourceEnum.Gold]: 20 },
        unlocks: ['TradeCart']
    },
    WagonWorkshop: {
        id: 'WagonWorkshop', name: 'Wagon Workshop', displayName: 'Wagon Workshop', icon: 'fa-solid fa-cart-flatbed', tier: 2, resourceTier: 'T2',
        category: 'Industry', tags: ['industry','transport','trade'],
        description: 'Produces wagons and Trade Carts.',
        growthFactor: 1.5, baseBuildTimeMinutes: 25,
        baseCost: { [ResourceEnum.Timber]: 120, [ResourceEnum.Stone]: 40 },
        unlocks: ['TradeCart']
    },

    // --- Tier 1/T2 Processing ---
    Sawpit: {
        id: 'Sawpit', name: 'Sawpit', displayName: 'Sawpit', icon: 'fa-solid fa-screwdriver-wrench', tier: 2, resourceTier: 'T2',
        category: 'Industry', tags: ['industry','processing','timber'],
        description: 'Converts Timber into Planks (T2).',
        growthFactor: 1.5, baseBuildTimeMinutes: 25,
        baseCost: { [ResourceEnum.Timber]: 150, [ResourceEnum.Stone]: 50 },
        unlocks: ['Planks'],
        relatedTechs: ['Basic Tools']
    },
    Tannery: {
        id: 'Tannery', name: 'Tannery', displayName: 'Tannery', icon: 'fa-solid fa-shirt', tier: 2, resourceTier: 'T2',
        category: 'Industry', tags: ['industry','processing','leather'],
        description: 'Processes hides into leather used for components.',
        growthFactor: 1.5, baseBuildTimeMinutes: 30,
        baseCost: { [ResourceEnum.Timber]: 80, [ResourceEnum.Stone]: 30 },
        unlocks: ['Leather'],
        relatedTechs: ['Basic Tools']
    },
    Smithy: {
        id: 'Smithy', name: 'Smithy', displayName: 'Smithy', icon: 'fa-solid fa-fire-burner', tier: 2, resourceTier: 'T2',
        category: 'Industry', tags: ['industry','military','weapons'],
        description: 'Produces simple military components (Spears, Bows). Upgrading unlocks advanced outputs.',
        growthFactor: 1.5, baseBuildTimeMinutes: 40,
        baseCost: { [ResourceEnum.Timber]: 300, [ResourceEnum.IronOre]: 100 },
        unlocks: ['SimpleSpear'],
        relatedTechs: ['Basic Tools']
    },

    // --- Tier 3: Industrial Bottleneck ---
    DeepMine: {
        id: 'DeepMine', name: 'Deep Mine', displayName: 'Deep Mine', icon: 'fa-solid fa-gem', tier: 3, resourceTier: 'T3',
        category: 'Gathering', tags: ['gathering','mining','iron'],
        description: 'Extracts Iron Ore and Coal. High-level upgrades require Tools.',
        growthFactor: 1.5, baseBuildTimeMinutes: 40,
        baseCost: { [ResourceEnum.Timber]: 200, [ResourceEnum.Stone]: 100 },
        unlocks: ['IronOre','Coal'],
        relatedTechs: ['Mining Operations']
    },
    Bloomery: {
        id: 'Bloomery', name: 'Bloomery', displayName: 'Bloomery', icon: 'fa-solid fa-fire', tier: 3, resourceTier: 'T3',
        category: 'Industry', tags: ['industry','smelting'],
        description: 'Smelts Iron Ore into usable ingots.',
        growthFactor: 1.5, baseBuildTimeMinutes: 50,
        baseCost: { [ResourceEnum.Timber]: 200, [ResourceEnum.Stone]: 120 },
        unlocks: ['Ingots'],
        relatedTechs: ['Smelting']
    },

    // --- Tier 4: Imperial & Warfare ---
    University: {
        id: 'University', name: 'University', displayName: 'University', icon: 'fa-solid fa-graduation-cap', tier: 4, resourceTier: 'T4',
        category: 'Industry', tags: ['industry','research','knowledge'],
        description: 'Generates Knowledge; required for advanced T4 techs.',
        growthFactor: 1.5, baseBuildTimeMinutes: 120,
        baseCost: { [ResourceEnum.Timber]: 500, [ResourceEnum.Stone]: 400, [ResourceEnum.Gold]: 100 },
        unlocks: ['Knowledge']
    },
    BlastFurnace: {
        id: 'BlastFurnace', name: 'Blast Furnace', displayName: 'Blast Furnace', icon: 'fa-solid fa-industry', tier: 4, resourceTier: 'T4',
        category: 'Industry', tags: ['industry','smelting','steel'],
        description: 'Converts ingots into Steel (T4).',
        growthFactor: 1.5, baseBuildTimeMinutes: 90,
        baseCost: { [ResourceEnum.Timber]: 400, [ResourceEnum.Stone]: 300, [ResourceEnum.Gold]: 50 },
        unlocks: ['Steel'],
        relatedTechs: ['Advanced Metallurgy']
    },
    SiegeWorkshop: {
        id: 'SiegeWorkshop', name: 'Siege Workshop', displayName: 'Siege Workshop', icon: 'fa-solid fa-chess-rook', tier: 4, resourceTier: 'Warfare',
        category: 'Military', tags: ['military','warfare','siege'],
        description: 'Constructs siege weapons (Trebuchet) and advanced components.',
        growthFactor: 1.5, baseBuildTimeMinutes: 80,
        baseCost: { [ResourceEnum.Timber]: 400, [ResourceEnum.Stone]: 200 },
        unlocks: ['Trebuchet'],
        relatedTechs: ['Geometry & Physics']
    },
    DiplomaticQuarter: {
        id: 'DiplomaticQuarter', name: 'Diplomatic Quarter', displayName: 'Diplomatic Quarter', icon: 'fa-solid fa-scroll', tier: 4, resourceTier: 'Special',
        category: 'Economy', tags: ['economy','diplomacy'],
        description: 'Enables alliances, pacts and diplomatic actions.',
        growthFactor: 1.5, baseBuildTimeMinutes: 75,
        baseCost: { [ResourceEnum.Timber]: 300, [ResourceEnum.Stone]: 300, [ResourceEnum.Gold]: 50 },
        unlocks: [],
        relatedTechs: ['Diplomacy']
    }
};

// (No automatic normalization of baseCost — timber/stone values remain as declared)

/**
 * BUILDING_PREREQS links buildings to either building-level prerequisites or technology prerequisites.
 * Tech names are free-form strings representing research topics.
 */
export const BUILDING_PREREQS = {
    Farmhouse: { tech: 'Agriculture' },
    Sawpit: { tech: 'Basic Tools', buildings: { LoggingCamp: 3 } },
    Bloomery: { tech: 'Smelting', buildings: { DeepMine: 2 } },
    Smithy: { tech: 'Basic Tools', buildings: { Bloomery: 1, Sawpit: 1 } },
    University: { tech: 'Advanced Studies', buildings: { TownHall: 5 } },
    SiegeWorkshop: { tech: 'Geometry & Physics', buildings: { Smithy: 5, University: 2 } },
    SpyAgency: { tech: 'Feudal Code', buildings: { TownHall: 3 } },
    TradeBroker: { tech: 'The Wheel' },
    WagonWorkshop: { tech: 'The Wheel' },
    DeepMine: { tech: 'Mining Operations' },
    BlastFurnace: { tech: 'Advanced Metallurgy', buildings: { Bloomery: 3 } },
    Tannery: { tech: 'Basic Tools' }
};

// Ensure every building has an explicit prereq entry. By default buildings are considered locked unless
// an entry exists that allows building (either empty or with `allowedAtStart: true`). Add common defaults.
const _ensure = (obj, key, val) => { if (!obj[key]) obj[key] = val; };

_ensure(BUILDING_PREREQS, 'LoggingCamp', { allowedAtStart: true });
_ensure(BUILDING_PREREQS, 'Farmhouse', { allowedAtStart: true });
_ensure(BUILDING_PREREQS, 'ForagersHut', { allowedAtStart: true });
_ensure(BUILDING_PREREQS, 'HuntingLodge', { allowedAtStart: true });
_ensure(BUILDING_PREREQS, 'StonePit', { allowedAtStart: true });
_ensure(BUILDING_PREREQS, 'Storehouse', { buildings: { TownHall: 1 }, population: 15 });
_ensure(BUILDING_PREREQS, 'Granary', { buildings: { Farmhouse: 1 }, population: 12 });
// Allow TownHall to be built without prereqs (user requested removal of requirements)
_ensure(BUILDING_PREREQS, 'TownHall', { allowedAtStart: true });
_ensure(BUILDING_PREREQS, 'TradeBroker', BUILDING_PREREQS['TradeBroker'] || { tech: 'The Wheel' });
_ensure(BUILDING_PREREQS, 'WagonWorkshop', BUILDING_PREREQS['WagonWorkshop'] || { tech: 'The Wheel' });
_ensure(BUILDING_PREREQS, 'Sawpit', BUILDING_PREREQS['Sawpit']);
_ensure(BUILDING_PREREQS, 'Tannery', BUILDING_PREREQS['Tannery']);
_ensure(BUILDING_PREREQS, 'Smithy', BUILDING_PREREQS['Smithy']);
_ensure(BUILDING_PREREQS, 'DeepMine', BUILDING_PREREQS['DeepMine']);
_ensure(BUILDING_PREREQS, 'Bloomery', BUILDING_PREREQS['Bloomery']);
_ensure(BUILDING_PREREQS, 'BlastFurnace', BUILDING_PREREQS['BlastFurnace']);
_ensure(BUILDING_PREREQS, 'University', BUILDING_PREREQS['University']);
_ensure(BUILDING_PREREQS, 'SiegeWorkshop', BUILDING_PREREQS['SiegeWorkshop']);
_ensure(BUILDING_PREREQS, 'DiplomaticQuarter', { buildings: { TownHall: 4 }, tech: 'Diplomacy' });
