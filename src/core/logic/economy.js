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
export function calculateApproval(pop, capacity, foodVariety, taxRate, hasFirewood, prevApproval = null) {
    let approval = 50; // Base approval

    // 1. Homelessness Penalty (scaled and much less punishing)
    // Scale penalty based on overflow ratio so small overflows aren't devastating.
    if (pop > capacity) {
        const overflow = pop - capacity;
        const ratio = capacity > 0 ? (overflow / capacity) : 1;
        // Scale penalty to a maximum of 25 (previously a flat 50).
        const penalty = Math.min(25, Math.ceil(ratio * 25));
        approval -= penalty;
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

    // Compute raw clamped value before applying rate-limiting
    let clamped = Math.max(0, Math.min(100, Math.floor(approval)));

    // 5. Rate limit adjustment: if previous approval provided, limit change to +/-2 per recalculation
    if (typeof prevApproval === 'number' && !isNaN(prevApproval)) {
        const delta = clamped - prevApproval;
        if (delta > 2) clamped = prevApproval + 2;
        else if (delta < -2) clamped = prevApproval - 2;
        // ensure still within 0-100
        clamped = Math.max(0, Math.min(100, Math.floor(clamped)));
    }

    return clamped;
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
    // New rule: if approval >= 50%, population grows. Growth scales per 10% above 50%.
    // - Base growth: 1% at 50%
    // - For each full 10% above 50 add +1% (e.g., 60% -> 2%, 70% -> 3%, ...)
    // - Minimum growth is +1 person per tick when growth applies.
    if (approval >= 50) {
        const extraTens = Math.floor((approval - 50) / 10); // 0 for 50-59, 1 for 60-69, etc.
        const growthRate = 0.01 * (1 + Math.max(0, extraTens));
        const growth = Math.max(1, Math.floor(pop * growthRate));
        newPop += growth;
    } else if (approval < 25) {
        // Decline unchanged: 2% leaving
        const decline = Math.max(1, Math.floor(pop * 0.02));
        newPop -= decline;
    }

    return {
        newPop,
        consumedFood,
        starvationDeaths
    };
}
