import { BUILDING_CONFIG } from '../config/buildings.js';
import { ResourceEnum } from '../constants/enums.js';

/**
 * Calculates the cost to upgrade a building to the next level.
 * Implements Universal Formula + T3 Tools Bottleneck.
 * 
 * @param {string} buildingId - The ID of the building (e.g., 'DeepMine')
 * @param {number} currentLevel - The current level of the building
 * @returns {Object} - Dictionary of resource costs
 */
export function calculateUpgradeCost(buildingId, currentLevel) {
    const config = BUILDING_CONFIG[buildingId];
    if (!config) throw new Error(`Building ${buildingId} not found in config.`);

    const nextLevel = currentLevel + 1;
    const gf = config.growthFactor;
    const cost = {};

    // 1. Universal Formula: Cost(L+1) = Base * GF^L
    // Note: currentLevel is L. If current is 0, we want cost for level 1.
    // Formula says GF^L. If L=0, GF^0 = 1. Correct.
    
    for (const [res, amount] of Object.entries(config.baseCost)) {
        cost[res] = Math.floor(amount * Math.pow(gf, currentLevel));
    }

    // 2. T3 Tools Bottleneck
    // If Industry (GF 1.6 or 1.4 in this context, usually Industry/Processing) AND Level >= 10
    // The prompt says "Industry building (GF=1.6/1.4)".
    const isIndustryOrProcessing = gf === 1.6 || gf === 1.4;
    
    if (isIndustryOrProcessing && currentLevel >= 10) {
        // Cost_Tools(L+1) = Tools_Base * 1.6^(L-9)
        // We need a Tools_Base. Let's assume a base of 10 for now as it wasn't specified.
        const toolsBase = 10; 
        const toolsCost = Math.floor(toolsBase * Math.pow(1.6, currentLevel - 9));
        
        if (!cost[ResourceEnum.Tools]) {
            cost[ResourceEnum.Tools] = 0;
        }
        cost[ResourceEnum.Tools] += toolsCost;
    }

    return cost;
}
