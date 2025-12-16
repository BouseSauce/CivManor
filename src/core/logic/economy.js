import { FOOD_SUSTENANCE_VALUES } from '../config/food.js';

// Base sustenance per villager per second.
// Set so each villager consumes ~20 food units per hour: 20 / 3600 seconds.
export const SUSTENANCE_PER_POP_PER_SECOND = 20 / 3600;

/**
 * Calculates Approval Score (0-100%).
 * 
 * @param {number} pop - Current population
 * @param {number} capacity - Housing capacity
 * @param {number} foodVariety - Count of distinct food types available
 * @param {number} taxRate - Current tax rate (0.0 to 1.0)
 * @param {boolean} hasFirewood - If firewood requirement is met
 * @returns {number} - Approval percentage (0-100)
 */
export function calculateApproval(pop, capacity, foodVariety, taxRate, hasFirewood) {
    let approval = 50; // Base approval

    // 1. Homelessness Penalty
    if (pop > capacity) {
        approval -= 50; // Severe penalty
    }

    // 2. Food Variety Bonus (e.g., +5 per type)
    approval += (foodVariety * 5);

    // 3. Tax Penalty (Linear or Exponential)
    // Example: 10% tax = -5 approval, 50% tax = -25 approval
    approval -= (taxRate * 100 * 0.5);

    // 4. Firewood
    if (!hasFirewood) {
        approval -= 20; // Freezing penalty
    } else {
        approval += 5; // Comfort bonus
    }

    // Clamp 0-100
    return Math.max(0, Math.min(100, Math.floor(approval)));
}

/**
 * Processes population changes based on food and approval.
 * 
 * @param {number} pop - Current population
 * @param {Object} foodStocks - Dictionary of food resources { [ResourceEnum.Meat]: 100, ... }
 * @param {number} approval - Current approval score (0-100)
 * @returns {Object} - { newPop, consumedFood, starvationDeaths }
 */
export function processPopulationTick(pop, foodStocks, approval) {
    // 1. Calculate Total Sustenance Needed
    // Each villager consumes `SUSTENANCE_PER_POP_PER_SECOND` sustenance units per tick (tick = 1s)
    const sustenanceNeeded = pop * SUSTENANCE_PER_POP_PER_SECOND;
    let sustenanceAvailable = 0;
    
    // Calculate available sustenance from stocks
    for (const [type, amount] of Object.entries(foodStocks)) {
        const value = FOOD_SUSTENANCE_VALUES[type] || 0;
        sustenanceAvailable += amount * value;
    }

    let newPop = pop;
    let starvationDeaths = 0;
    const consumedFood = {}; // Track what was eaten

    // 2. Starvation Logic
    if (sustenanceAvailable < sustenanceNeeded) {
        // 5% Starvation Death Penalty
        starvationDeaths = Math.floor(pop * 0.05);
        newPop -= starvationDeaths;
        
        // Consume ALL food
        for (const type of Object.keys(foodStocks)) {
            consumedFood[type] = foodStocks[type];
        }
    } else {
        // Consume required food
        // Logic: Eat highest value food first? Or balanced? 
        // Simple logic: Eat from first available until full.
        let needed = sustenanceNeeded;
        
        for (const [type, amount] of Object.entries(foodStocks)) {
            if (needed <= 0) break;
            
            const value = FOOD_SUSTENANCE_VALUES[type] || 0;
            if (value === 0) continue;

            const amountNeeded = needed / value;
            
            if (amount >= amountNeeded) {
                consumedFood[type] = amountNeeded;
                needed = 0;
            } else {
                consumedFood[type] = amount;
                needed -= (amount * value);
            }
        }
    }

    // 3. Growth/Decline based on Approval
    if (approval > 75) {
        // Growth
        const growth = Math.max(1, Math.floor(pop * 0.02)); // 2% growth
        newPop += growth;
    } else if (approval < 25) {
        // Decline
        const decline = Math.max(1, Math.floor(pop * 0.02)); // 2% leaving
        newPop -= decline;
    }

    return {
        newPop,
        consumedFood,
        starvationDeaths
    };
}
