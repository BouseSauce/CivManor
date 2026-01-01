import { UnitTypeEnum } from '../constants/enums.js';

/**
 * Targeting Hierarchy: Lower index = Higher priority target.
 * Trebuchets -> Militia -> Spearmen -> Knights (Villagers are civilian)
 */
const TARGET_PRIORITY = [
    UnitTypeEnum.Trebuchet,
    // Villagers are civilian units and should not be primary military targets or included in recruitment lists
    UnitTypeEnum.Militia,
    UnitTypeEnum.Spearmen,
    UnitTypeEnum.Knights,
    UnitTypeEnum.SupplyCart,
    UnitTypeEnum.Scout
];

/**
 * Sorts a list of units based on the fixed priority hierarchy.
 * @param {Array} unitList - Array of unit objects { type, hp, ... }
 * @returns {Array} - Sorted array
 */
export function determineTargetingOrder(unitList) {
    return unitList.sort((a, b) => {
        const indexA = TARGET_PRIORITY.indexOf(a.type);
        const indexB = TARGET_PRIORITY.indexOf(b.type);
        // If not in list, put at end
        const safeA = indexA === -1 ? 999 : indexA;
        const safeB = indexB === -1 ? 999 : indexB;
        return safeA - safeB;
    });
}

/**
 * Calculates the net damage for a round.
 * D_Net = A_Enemy - D_Total
 * 
 * @param {number} attackerTotalAttack 
 * @param {number} defenderTotalDefense 
 * @returns {number} - Net damage to be dealt
 */
export function calculateNetDamage(attackerTotalAttack, defenderTotalDefense) {
    const net = attackerTotalAttack - defenderTotalDefense;
    return Math.max(0, net); // Damage cannot be negative
}

/**
 * Simulates a single battle round.
 * 
 * @param {Array} attackers - Array of unit objects { id, type, attack, defense, hp, maxHp }
 * @param {Array} defenders - Array of unit objects
 * @returns {Object} - { attackers, defenders, log }
 */
export function simulateBattleRound(attackers, defenders) {
    // 1. Calculate Totals
    const attAttack = attackers.reduce((sum, u) => sum + u.attack, 0);
    const attDefense = attackers.reduce((sum, u) => sum + u.defense, 0);
    
    const defAttack = defenders.reduce((sum, u) => sum + u.attack, 0);
    const defDefense = defenders.reduce((sum, u) => sum + u.defense, 0);

    // 2. Calculate Net Damage
    const damageToDefenders = calculateNetDamage(attAttack, defDefense);
    const damageToAttackers = calculateNetDamage(defAttack, attDefense);

    // 3. Apply Damage (Targeting Hierarchy)
    const applyDamage = (units, damage) => {
        const sortedUnits = determineTargetingOrder([...units]); // Copy and sort
        let remainingDamage = damage;
        const survivors = [];
        const destroyed = [];

        for (const unit of sortedUnits) {
            if (remainingDamage <= 0) {
                survivors.push(unit);
                continue;
            }

            if (remainingDamage >= unit.hp) {
                remainingDamage -= unit.hp;
                destroyed.push(unit);
            } else {
                unit.hp -= remainingDamage;
                remainingDamage = 0;
                survivors.push(unit);
            }
        }
        return { survivors, destroyed };
    };

    const defResult = applyDamage(defenders, damageToDefenders);
    const attResult = applyDamage(attackers, damageToAttackers);

    return {
        attackers: attResult.survivors,
        defenders: defResult.survivors,
        damageToAttackers,
        damageToDefenders,
        attackersLost: attResult.destroyed,
        defendersLost: defResult.destroyed
    };
}

/**
 * Resolves a full battle until one side is defeated or max rounds reached.
 * 
 * @param {Array} attackers 
 * @param {Array} defenders 
 * @param {number} maxRounds 
 * @returns {Object} - { winner: 'attacker'|'defender'|'draw', attackers, defenders, log }
 */
export function resolveBattle(attackers, defenders, maxRounds = 50) {
    let currentAttackers = [...attackers];
    let currentDefenders = [...defenders];
    const log = [];

    for (let round = 1; round <= maxRounds; round++) {
        if (currentAttackers.length === 0 || currentDefenders.length === 0) break;

        const result = simulateBattleRound(currentAttackers, currentDefenders);
        currentAttackers = result.attackers;
        currentDefenders = result.defenders;

        log.push({
            round,
            damageToAttackers: result.damageToAttackers,
            damageToDefenders: result.damageToDefenders,
            attackersLost: result.attackersLost.length,
            defendersLost: result.defendersLost.length
        });
    }

    let winner = 'draw';
    if (currentAttackers.length > 0 && currentDefenders.length === 0) winner = 'attacker';
    else if (currentDefenders.length > 0 && currentAttackers.length === 0) winner = 'defender';

    return {
        winner,
        attackers: currentAttackers,
        defenders: currentDefenders,
        log
    };
}

/**
 * Simulates the full battle (max 6 rounds).
 */
export function simulateBattle(attackers, defenders) {
    const MAX_ROUNDS = 6;
    const battleLog = [];
    
    let currentAttackers = attackers;
    let currentDefenders = defenders;

    for (let round = 1; round <= MAX_ROUNDS; round++) {
        if (currentAttackers.length === 0 || currentDefenders.length === 0) break;

        const result = simulateBattleRound(currentAttackers, currentDefenders);
        
        currentAttackers = result.attackers;
        currentDefenders = result.defenders;
        
        battleLog.push({
            round,
            damageToAtt: result.damageToAttackers,
            damageToDef: result.damageToDefenders,
            attLost: result.attackersLost.length,
            defLost: result.defendersLost.length
        });
    }

    let winner = 'Draw';
    if (currentAttackers.length === 0 && currentDefenders.length > 0) winner = 'Defender';
    if (currentDefenders.length === 0 && currentAttackers.length > 0) winner = 'Attacker';
    // If both survive after 6 rounds, Defender wins (or Draw as per prompt "Defender wins (or it's a draw)")
    if (currentAttackers.length > 0 && currentDefenders.length > 0) winner = 'Defender';

    return {
        winner,
        roundsPlayed: battleLog.length,
        remainingAttackers: currentAttackers,
        remainingDefenders: currentDefenders,
        log: battleLog
    };
}
