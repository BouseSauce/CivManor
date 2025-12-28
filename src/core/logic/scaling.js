import { BUILDING_CONFIG } from '../config/buildings.js';
import { RESEARCH_DEFS, ALL_RESEARCH } from '../config/research.js';
import { ResourceEnum } from '../constants/enums.js';

/**
 * Calculates the cost to upgrade a building to the next level.
 * Implements Universal Formula + T3 Tools Bottleneck.
 * 
 * @param {string} buildingId - The ID of the building (e.g., 'Bloomery')
 * @param {number} currentLevel - The current level of the building
 * @returns {Object} - Dictionary of resource costs
 */
export function calculateUpgradeCost(buildingId, currentLevel) {
    const config = BUILDING_CONFIG[buildingId];
    if (!config) throw new Error(`Building ${buildingId} not found in config.`);

    const nextLevel = currentLevel + 1;
    const gf = config.growthFactor;
    const cost = {};

    // If a building provides explicit per-level override for the target level, use it directly
    if (config.upgradeCostOverrides && config.upgradeCostOverrides[nextLevel]) {
        Object.entries(config.upgradeCostOverrides[nextLevel]).forEach(([res, amt]) => { cost[res] = Math.floor(amt); });
        return cost;
    }

    // 1. Universal Formula: Cost(L+1) = Base * GF^L
    // Note: currentLevel is L. If current is 0, we want cost for level 1.
    // Formula says GF^L. If L=0, GF^0 = 1. Correct.
    
    for (const [res, amount] of Object.entries(config.baseCost)) {
        cost[res] = Math.floor(amount * Math.pow(gf, currentLevel));
    }

    // 2. Tools bottleneck removed — the game no longer uses a separate 'Tools' resource.

    // 3. Rule of Two: Enforce a maximum of 2 resources per building cost.
    // If more than 2, we prune the least expensive one (lowest total amount).
    const resourceKeys = Object.keys(cost);
    if (resourceKeys.length > 2) {
        const sortedKeys = resourceKeys.sort((a, b) => cost[b] - cost[a]);
        // Keep only the top 2
        const prunedCost = {};
        prunedCost[sortedKeys[0]] = cost[sortedKeys[0]];
        prunedCost[sortedKeys[1]] = cost[sortedKeys[1]];
        return prunedCost;
    }

    return cost;
}

/**
 * Calculates the cost for the next level of a research.
 * Formula: Cost(L+1) = BaseCost * (GrowthFactor ^ CurrentLevel)
 * 
 * @param {string} techId - The ID of the research
 * @param {number} currentLevel - The current level of the research
 * @returns {Object} - Dictionary of resource costs
 */
export function calculateResearchCost(techId, currentLevel) {
    const def = ALL_RESEARCH[techId];
    if (!def) throw new Error(`Research ${techId} not found in config.`);

    const cost = {};
    const gf = def.growthFactor || 1.0;
    const baseCost = def.baseCost || {};

    for (const [res, amount] of Object.entries(baseCost)) {
        cost[res] = Math.floor(amount * Math.pow(gf, currentLevel));
    }

    // Knowledge Cost for Level 10+
    // "For any research above Level 10, I recommend adding a 'Knowledge Cost' column in your Excel. 
    // A good rule of thumb is BaseKnowledge = 500 with a 1.5 growth factor starting at level 10."
    if (currentLevel >= 10) {
        const baseKnowledge = 500;
        const knowledgeGF = 1.5;
        const knowledgeCost = Math.floor(baseKnowledge * Math.pow(knowledgeGF, currentLevel - 10));
        cost[ResourceEnum.Knowledge] = (cost[ResourceEnum.Knowledge] || 0) + knowledgeCost;
    }

    return cost;
}

/**
 * Calculates the time to research the next level.
 * Formula: Time (min) = ((TotalResourceCost) / 500) * 1.5 ^ (CurrentLevel)
 * 
 * @param {string} techId - The ID of the research
 * @param {number} currentLevel - The current level of the research
 * @param {Object} cost - The cost object for the next level
 * @returns {number} - Research time in seconds
 */
export function calculateResearchTime(techId, currentLevel, cost) {
    const def = RESEARCH_DEFS[techId];
    if (!def) return 60;

    // If it's a one-off and has a fixed duration, use it
    if (def.type === 'One-Off' && def.durationSeconds) {
        return def.durationSeconds;
    }

    const totalCost = Object.values(cost).reduce((sum, val) => sum + val, 0);
    const timeMinutes = (totalCost / 500) * Math.pow(1.5, currentLevel);
    
    // Ensure a minimum time of 10 seconds
    return Math.max(10, Math.floor(timeMinutes * 60));
}

/**
 * Calculates the build time for the next level of a building.
 * Formula: Time = (TotalRawValue * 0.1) + RefiningPenalty
 * 
 * @param {string} buildingId - The ID of the building
 * @param {number} currentLevel - The current level of the building
 * @returns {number} - Build time in seconds
 */
export function calculateBuildTime(buildingId, currentLevel) {
    const config = BUILDING_CONFIG[buildingId];
    if (!config) return 60; // Default fallback

    // 1. Get Cost for Next Level
    const cost = calculateUpgradeCost(buildingId, currentLevel);
    
    // 2. Define TRV and Penalties
    const RESOURCE_TRV = {
        [ResourceEnum.Timber]: 1,
        [ResourceEnum.Stone]: 1,
        [ResourceEnum.Food]: 1,
        [ResourceEnum.Planks]: 4,
        [ResourceEnum.IronIngot]: 8,
        [ResourceEnum.Steel]: 40,
        [ResourceEnum.GoldIngot]: 100,
        [ResourceEnum.Knowledge]: 0
    };

    const REFINING_PENALTY = {
        [ResourceEnum.Planks]: 0.5,
        [ResourceEnum.IronIngot]: 2,
        [ResourceEnum.Steel]: 10,
        [ResourceEnum.GoldIngot]: 5
    };

    // 3. Calculate TRV and Penalty
    let totalTRV = 0;
    let totalPenalty = 0;
    
    for (const [res, amount] of Object.entries(cost)) {
        const trv = RESOURCE_TRV[res] || 1;
        const penalty = REFINING_PENALTY[res] || 0;
        
        totalTRV += amount * trv;
        totalPenalty += amount * penalty;
    }
    
    // 4. Formula: Time = (TRV * 0.1) + Penalty
    // Minimum 10 seconds
    const timeSeconds = (totalTRV * 0.1) + totalPenalty;
    
    return Math.max(10, Math.floor(timeSeconds));
}
