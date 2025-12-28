import { FOOD_SUSTENANCE_VALUES } from '../config/food.js';
import { WORLD_CONFIG } from '../config/worlds.js';

// Population growth multiplier: can be tuned via WORLD_CONFIG.popGrowth or env var POP_MULT
export const POP_GROWTH_MULTIPLIER = (WORLD_CONFIG && typeof WORLD_CONFIG.popGrowth === 'number') ? WORLD_CONFIG.popGrowth : ((typeof process !== 'undefined' && process.env.POP_MULT) ? Number(process.env.POP_MULT) : 5.0);

// Base sustenance per villager per second.
// Set so each villager consumes ~20 food units per hour: 20 / 3600 seconds.
export const SUSTENANCE_PER_POP_PER_SECOND = 1 / 3600; // 1 food per citizen per hour

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
export function calculateApproval(pop, capacity, foodVariety, taxRate, hasFirewood, prevApproval = null, rationLevel = 2) {
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

    // 5. Ration Level Impact
    if (rationLevel === 0) approval -= 50;
    else if (rationLevel === 1) approval -= 10;
    else if (rationLevel === 3) approval += 10;

    // Compute raw clamped value before applying rate-limiting
    let clamped = Math.max(0, Math.min(100, Math.floor(approval)));

    // 6. Rate limit adjustment: if previous approval provided, limit change to +/-2 per recalculation
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
 * Calculates gold income per second from taxation.
 * Simple formula: Gold/sec = population * taxRate * (GOLD_PER_POP_PER_HOUR / 3600)
 * Tune `GOLD_PER_POP_PER_HOUR` to adjust yield.
 */
export function calculateTaxIncome(pop, taxRate, townHallLevel = 0) {
    const GOLD_PER_POP_PER_HOUR = 0.5; // baseline gold per pop per hour at 0 town hall
    // Town Hall increases tax efficiency: +10% gold per TH level
    const thMultiplier = 1 + (Math.max(0, townHallLevel) * 0.10);
    const perSecond = (GOLD_PER_POP_PER_HOUR * thMultiplier) / 3600;
    return (pop || 0) * (taxRate || 0) * perSecond;
}

/**
 * Processes population changes based on food and approval.
 * 
 * @param {number} pop - Current population
 * @param {Object} foodStocks - Dictionary of food resources { [ResourceEnum.Meat]: 100, ... }
 * @param {number} approval - Current approval score (0-100)
 * @param {number} townHallLevel - Level of Town Hall
 * @param {number} housingCap - Current housing capacity
 * @param {number} captives - Count of captives
 * @param {number} seconds - Seconds passed since last tick
 * @param {Object} stateObj - State object to store fractional growth
 * @param {number} growthMultiplier - Multiplier for population growth (default 1.0)
 * @returns {Object} - { newPop, consumedFood, starvationDeaths }
 */
export function processPopulationTick(pop, foodStocks, approval, townHallLevel = 1, housingCap = 100, captives = 0, seconds = 1, stateObj = null, growthMultiplier = 1.0, rationLevel = 2) {
    // 1. Calculate Total Sustenance Needed
    // Each villager consumes `SUSTENANCE_PER_POP_PER_SECOND` sustenance units per tick (tick = 1s)
    const baseNeed = (pop * SUSTENANCE_PER_POP_PER_SECOND) + (captives * (0.5 / 3600));
    
    let targetMultiplier = 1.0;
    if (rationLevel === 0) targetMultiplier = 0;
    else if (rationLevel === 1) targetMultiplier = 0.5;
    else if (rationLevel === 3) targetMultiplier = 2.0;

    const sustenanceNeeded = baseNeed * targetMultiplier;
    
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
    if (rationLevel === 0) {
        // Force starvation as if 0 food was eaten, but calculate deaths based on full need
        const deathsPerHour = 0.01; // 1% per hour
        starvationDeaths = Math.floor(pop * deathsPerHour * (seconds / 3600));
        newPop -= starvationDeaths;
    } else if (sustenanceAvailable <= 0) {
        // No food at all: apply starvation death at 1% per hour scaled to tick seconds
        const deathsPerHour = 0.01; // 1% per hour
        starvationDeaths = Math.floor(pop * deathsPerHour * (seconds / 3600));
        newPop -= starvationDeaths;
        // nothing to consume
    } else if (sustenanceAvailable < sustenanceNeeded) {
        // Partial food: consume what we have and apply proportional starvation
        // Compute fraction of need met
        const fraction = sustenanceAvailable / Math.max(1, sustenanceNeeded);
        // Proportional deaths scaled: up to 1% per hour when fully unfed
        const deathsPerHour = 0.01 * (1 - fraction);
        starvationDeaths = Math.floor(pop * deathsPerHour * (seconds / 3600));
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

        // 3. Growth based on Town Hall level & Approval
        // Formula: Growth = (BaseRate * TownHallLvl) * ApprovalModifier
        // BaseRate = 0.1 citizens per TownHall level (per hour)
        const baseRatePerHour = 0.1 * Math.max(0, townHallLevel);
        const approvalModifier = Math.max(0, Math.min(100, approval)) / 100.0;
        // Apply research-derived timer multiplier:
        // New spawn timer = BaseTimer / (1 + (ResearchLevel * 0.1)) => growth rate multiplies by (1 + ResearchLevel*0.1)
        let researchTimerMultiplier = 1.0;
        try {
            if (stateObj && stateObj.techLevels) {
                const sanLvl = stateObj.techLevels['Sanitation Works'] || 0;
                const basicSanLvl = stateObj.techLevels['Basic Sanitation'] || 0;
                const medLvl = stateObj.techLevels['Medical Alchemy'] || 0;
                const fertLvl = stateObj.techLevels['Fertility Festivals'] || 0;
                
                const total = (sanLvl * 0.1) + (medLvl * 0.1) + (basicSanLvl * 0.02) + (fertLvl * 0.25);
                if (total > 0) researchTimerMultiplier = 1 + total;
            }
        } catch (e) { /* ignore */ }

        let growthPerHour = baseRatePerHour * approvalModifier * POP_GROWTH_MULTIPLIER * growthMultiplier * researchTimerMultiplier;
        
        // Ration Level Growth Modifiers
        if (rationLevel === 1) growthPerHour = 0; // Half rations = 0 growth
        else if (rationLevel === 3) growthPerHour *= 2; // Double rations = double growth

        // If the area has sufficient sustenance, ensure a minimum growth rate so players see progress.
        try {
            if (sustenanceAvailable >= sustenanceNeeded && rationLevel >= 2) {
                const MIN_GROWTH_PER_HOUR = 5; // ensure at least +5 villagers per hour when fed
                growthPerHour = Math.max(growthPerHour, MIN_GROWTH_PER_HOUR);
            }
        } catch (e) { /* ignore */ }
        const growth = growthPerHour * (seconds / 3600);
        // Accumulate fractional growth across ticks using stateObj._popGrowRemainder if provided
        let remainder = 0;
        if (stateObj && typeof stateObj._popGrowRemainder === 'number') remainder = stateObj._popGrowRemainder || 0;
        const total = remainder + growth;
        const growthInt = Math.floor(total);
        if (growthInt > 0) newPop += growthInt;
        const newRemainder = total - growthInt;
        if (stateObj) stateObj._popGrowRemainder = newRemainder;

        // If approval is 0, apply a small emigration rate (1% per hour)
        if (approval <= 0) {
            const emigPerHour = 0.01;
            const emig = Math.floor(pop * emigPerHour * (seconds / 3600));
            newPop = Math.max(0, newPop - emig);
        }

        // Enforce housing cap
        if (housingCap > 0 && newPop > housingCap) {
            // clamp population to housing cap (no overgrowth beyond cap)
            newPop = housingCap;
        }

    // Captive morbidity: 2% death per hour (reduced by tech elsewhere)
    const captiveDeaths = Math.floor(captives * 0.02 * (seconds / 3600));

    return {
        newPop,
        consumedFood,
        starvationDeaths,
        captiveDeaths,
        growthPerHour
    };
}
