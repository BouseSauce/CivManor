/**
 * Espionage Logic Engine
 * Handles Intel Depth calculations and Proximity Detection Radius.
 */

/**
 * Calculates the depth of information gathered based on the difference between 
 * attacker's Spy Level and defender's Counter-Spy Level.
 * 
 * @param {number} attackerLevel - The Spy Level of the player gathering intel.
 * @param {number} defenderLevel - The Spy Level of the player being spied on.
 * @returns {string} The tier of intel gathered.
 */
export function calculateIntelDepth(attackerLevel, defenderLevel) {
    const deltaL = attackerLevel - defenderLevel;

    if (deltaL < 0) {
        return 'FAILED'; // Infiltration Failed. Spy is captured/killed.
    } else if (deltaL === 0 || deltaL === 1) {
        return 'BASIC'; // Basic Intel. Shows Resource Stockpiles only.
    } else if (deltaL >= 2 && deltaL < 4) {
        return 'STANDARD'; // Standard Intel. Shows Resource Stockpiles + Building Levels.
    } else if (deltaL >= 4) {
        return 'FULL'; // Full Intel. Shows Resources + Buildings + Exact Unit counts/types.
    }
    
    return 'FAILED';
}

/**
 * Determines the detection radius based on the Shadow Guild level.
 * 
 * @param {number} guildLevel - The level of the Shadow Guild building.
 * @returns {number} The radius in tiles (hexes).
 */
export function getDetectionRadius(guildLevel) {
    if (guildLevel <= 0) return 0;
    if (guildLevel <= 5) return 0.5; // Detects armies passing through the player's hex (0.5 means same hex)
    if (guildLevel <= 10) return 1;  // Detects movement within a 1-tile radius.
    return 2;                        // Detects movement within a 2-tile radius.
}

/**
 * Categorizes army size based on unit count.
 * 
 * @param {number} unitCount - Total number of units in the army.
 * @returns {string} Size label (Small, Medium, Large).
 */
export function getArmySizeLabel(unitCount) {
    if (unitCount < 50) return 'Small';
    if (unitCount <= 200) return 'Medium';
    return 'Large';
}

/**
 * Calculates the effective Spy Level of an area.
 * Base Level = Shadow Guild Level
 * Bonus = Assigned Spies (e.g., +1 level per 2 spies)
 * 
 * @param {number} guildLevel - Level of the Shadow Guild.
 * @param {number} assignedSpies - Number of Spies assigned to the building.
 * @returns {number} Total effective Spy Level.
 */
export function calculateEffectiveSpyLevel(guildLevel, assignedSpies) {
    if (guildLevel <= 0) return 0;
    const spyBonus = Math.floor(assignedSpies / 2);
    return guildLevel + spyBonus;
}
