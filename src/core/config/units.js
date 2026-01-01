import { ResourceEnum, UnitTypeEnum } from '../constants/enums.js';

// Unit configuration table used by recruitment, UI and combat logic.
export const UNIT_CONFIG = {
    [UnitTypeEnum.Militia]: {
        id: UnitTypeEnum.Militia,
        name: 'Militia',
        tier: 1,
        class: 'Infantry',
        icon: 'fa-fist-raised',
        populationCost: 1,
        cost: { [ResourceEnum.Food]: 20, [ResourceEnum.Timber]: 10 },
        attack: 1.0,
        defense: 1.0,
        hp: 40,
        trainingTime: 20,
        requiredBuilding: 'Barracks',
        requiredBuildingLevel: 1,
        description: 'Basic early-game infantry. Cheap and quick to train.'
    },

    [UnitTypeEnum.Spearmen]: {
        id: UnitTypeEnum.Spearmen,
        name: 'Spearmen',
        tier: 2,
        class: 'Infantry',
        icon: 'fa-fist-raised',
        populationCost: 1,
        cost: { [ResourceEnum.Food]: 30, [ResourceEnum.Timber]: 20 },
        attack: 1.5,
        defense: 2.5,
        hp: 60,
        trainingTime: 40,
        requiredBuilding: 'Barracks',
        requiredBuildingLevel: 3,
        description: 'Anti-cavalry infantry. Effective against mounted units.'
    },

    [UnitTypeEnum.ManAtArms]: {
        id: UnitTypeEnum.ManAtArms,
        name: 'Man-at-Arms',
        tier: 2,
        class: 'Infantry',
        icon: 'fa-fist-raised',
        populationCost: 1,
        cost: { [ResourceEnum.Timber]: 10, [ResourceEnum.IronIngot]: 25 },
        attack: 2.0,
        defense: 4.0,
        hp: 80,
        trainingTime: 60,
        requiredBuilding: 'Barracks',
        requiredBuildingLevel: 5,
        description: 'Standard heavy frontline.'
    },

    [UnitTypeEnum.ImperialGuard]: {
        id: UnitTypeEnum.ImperialGuard,
        name: 'Imperial Guard',
        tier: 5,
        class: 'Infantry',
        icon: 'fa-fist-raised',
        populationCost: 1,
        cost: { [ResourceEnum.Food]: 50, [ResourceEnum.Steel]: 10 },
        attack: 5.0,
        defense: 10.0,
        hp: 250,
        trainingTime: 600,
        requiredBuilding: 'Barracks',
        requiredBuildingLevel: 15,
        requiredResearch: 'Infantry Drills',
        description: 'Elite; highest defense in game.'
    },

    [UnitTypeEnum.Archer]: {
        id: UnitTypeEnum.Archer,
        name: 'Archer',
        tier: 2,
        class: 'Ranged',
        icon: 'fa-bow-arrow',
        populationCost: 1,
        cost: { [ResourceEnum.Timber]: 30, [ResourceEnum.IronIngot]: 10 },
        attack: 1.5,
        defense: 3.0,
        hp: 50,
        trainingTime: 45,
        requiredBuilding: 'ArcheryRange',
        requiredBuildingLevel: 1,
        description: 'Ranged support; low defense.'
    },

    [UnitTypeEnum.Scout]: {
        id: UnitTypeEnum.Scout,
        name: 'Scout',
        tier: 2,
        class: 'Special',
        icon: 'fa-eye',
        populationCost: 1,
        cost: { [ResourceEnum.Food]: 40, [ResourceEnum.Timber]: 20 },
        attack: 0.5,
        defense: 0.5,
        hp: 20,
        speed: 4.0,
        trainingTime: 30,
        requiredBuilding: 'Watchtower',
        requiredBuildingLevel: 1,
        description: 'Fast unit used for scouting nearby areas.'
    },

    [UnitTypeEnum.Spy]: {
        id: UnitTypeEnum.Spy,
        name: 'Spy',
        tier: 3,
        class: 'Special',
        icon: 'fa-user-secret',
        populationCost: 1,
        cost: { [ResourceEnum.Knowledge]: 50, [ResourceEnum.Food]: 100 },
        attack: 0.5,
        defense: 0.5,
        hp: 30,
        speed: 5.0,
        trainingTime: 120,
        requiredBuilding: 'Watchtower',
        requiredBuildingLevel: 20,
        description: 'Infiltration specialist. Used to gather intelligence.'
    },

    [UnitTypeEnum.Knights]: {
        id: UnitTypeEnum.Knights,
        name: 'Knight',
        tier: 4,
        class: 'Cavalry',
        icon: 'fa-horse',
        populationCost: 1,
        cost: { [ResourceEnum.Steel]: 30, [ResourceEnum.Horses]: 1 },
        attack: 4.0,
        defense: 8.0,
        hp: 160,
        speed: 2.5,
        trainingTime: 240,
        requiredBuilding: 'Stable',
        requiredBuildingLevel: 5,
        requiredResearch: 'Alloy Mixing',
        requiredResearchLevel: 5,
        description: 'Flanking; high attack/speed.'
    },

    [UnitTypeEnum.CargoWagon]: {
        id: UnitTypeEnum.CargoWagon,
        name: 'Cargo Wagon',
        tier: 2,
        class: 'Logistics',
        icon: 'fa-cart-flatbed',
        populationCost: 1,
        cost: { [ResourceEnum.Planks]: 20, [ResourceEnum.Timber]: 50 },
        attack: 0.1,
        defense: 0.5,
        hp: 50,
        carryCapacity: 500,
        speed: 1.0,
        trainingTime: 60,
        requiredBuilding: 'Sawpit',
        requiredBuildingLevel: 1,
        requiredResearch: 'The Wheel',
        description: 'Basic transport wagon. Carries 500 resources.'
    },

    [UnitTypeEnum.LargeCargoWagon]: {
        id: UnitTypeEnum.LargeCargoWagon,
        name: 'Large Cargo Wagon',
        tier: 3,
        class: 'Logistics',
        icon: 'fa-truck-ramp-box',
        populationCost: 2,
        cost: { [ResourceEnum.Planks]: 100, [ResourceEnum.IronIngot]: 50 },
        attack: 0.2,
        defense: 1.0,
        hp: 150,
        carryCapacity: 2500,
        speed: 0.8,
        trainingTime: 180,
        requiredBuilding: 'Sawpit',
        requiredBuildingLevel: 5,
        requiredResearch: 'Logistics',
        requiredResearchLevel: 8,
        description: 'Heavy transport wagon. Carries 2,500 resources.'
    },

    [UnitTypeEnum.ClaimCart]: {
        id: UnitTypeEnum.ClaimCart,
        name: 'Claim Cart',
        tier: 4,
        class: 'Special',
        icon: 'fa-flag',
        populationCost: 5,
        cost: { [ResourceEnum.Planks]: 500, [ResourceEnum.Steel]: 100, [ResourceEnum.Knowledge]: 500 },
        attack: 0.0,
        defense: 1.0,
        hp: 100,
        speed: 0.5,
        trainingTime: 1200,
        requiredBuilding: 'TownHall',
        requiredBuildingLevel: 5,
        requiredResearch: 'Sovereignty',
        description: 'A specialized cart used to establish authority over new territories. Extremely expensive and slow to produce.'
    },

    [UnitTypeEnum.Mangonel]: {
        id: UnitTypeEnum.Mangonel,
        name: 'Mangonel',
        tier: 3,
        class: 'Siege',
        icon: 'fa-meteor',
        populationCost: 3,
        cost: { [ResourceEnum.Steel]: 40, [ResourceEnum.Planks]: 200 },
        attack: 10.0,
        defense: 20.0,
        hp: 140,
        trainingTime: 300,
        requiredBuilding: 'SiegeWorkshop',
        requiredBuildingLevel: 1,
        description: 'Anti-infantry (splash damage).'
    },

    [UnitTypeEnum.Trebuchet]: {
        id: UnitTypeEnum.Trebuchet,
        name: 'Trebuchet',
        tier: 4,
        class: 'Siege',
        icon: 'fa-meteor',
        populationCost: 5,
        cost: { [ResourceEnum.Stone]: 200, [ResourceEnum.Steel]: 50 },
        attack: 15.0,
        defense: 30.0,
        hp: 220,
        trainingTime: 600,
        requiredBuilding: 'SiegeWorkshop',
        requiredBuildingLevel: 5,
        description: 'Anti-structure (Wall breaker).'
    },

    [UnitTypeEnum.Scholar]: {
        id: UnitTypeEnum.Scholar,
        name: 'Scholar',
        tier: 1,
        class: 'Civilian',
        icon: 'fa-graduation-cap',
        populationCost: 1,
        cost: { [ResourceEnum.Food]: 5 },
        attack: 0.1,
        defense: 0.1,
        hp: 10,
        trainingTime: 120,
        // Scholars are trained at Library (or University) rather than the Town Hall
        requiredBuilding: 'Library',
        requiredBuildingLevel: 1,
        description: 'Educated civilian: provides research bonuses but consumes a villager slot.'
    }
};

export function getUnitConfig(unitId) {
    return UNIT_CONFIG[unitId] || null;
}

export const ALL_UNITS = Object.keys(UNIT_CONFIG).map(k => UNIT_CONFIG[k]);
