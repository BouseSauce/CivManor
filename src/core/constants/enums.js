/**
 * Resource Types including T1-T4 and Food types.
 */
export const ResourceEnum = {
    // T1 - Basic
    Timber: 'Timber',
    Stone: 'Stone',
    // Note: `Ore` resource removed; use `Stone` (raw) and `IronIngot` (refined).
    Coal: 'Coal',
    
    // Food (Raw & Processed)
    Food: 'Food',
    // Legacy granular types (kept for migration/backcompat)
    Berries: 'Food',
    Meat: 'Food',
    Fish: 'Food',
    Bread: 'Food',
    Hides: 'Hides',
    Leather: 'Leather',

    // T2 - Processed
    Planks: 'Planks',
    IronIngot: 'IronIngot',
    Steel: 'Steel',
    
    // T3 - Advanced
    Tools: 'Tools',
    SimpleSpear: 'SimpleSpear',
    Horse: 'Horse',
    
    // T4 - Luxury/Special
    Knowledge: 'Knowledge',
    Gold: 'Gold',
    // T5 related
    GoldOre: 'GoldOre',
    GoldIngot: 'GoldIngot',

    // Horses and Captives (special resources / units)
    Horses: 'Horses',
    Captives: 'Captives',
    Villager: 'Villager'
};

/**
 * Unit Types for Military and Civilian units.
 */
export const UnitTypeEnum = {
    Villager: 'Villager',
    Militia: 'Militia',
    Spearmen: 'Spearmen',
    Knights: 'Knights',
    Trebuchet: 'Trebuchet',
    TradeCart: 'TradeCart',
    Scout: 'Scout',
    // Additional military units
    ManAtArms: 'ManAtArms',
    ImperialGuard: 'ImperialGuard',
    Archer: 'Archer',
    SupplyWagon: 'SupplyWagon',
    Mangonel: 'Mangonel',
    Spy: 'Spy'
    ,
    Scholar: 'Scholar'
};
