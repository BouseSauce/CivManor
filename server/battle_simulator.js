#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { UNIT_CONFIG } from '../src/core/config/units.js';
import { ResourceEnum, UnitTypeEnum } from '../src/core/constants/enums.js';

/**
 * BATTLE SIMULATOR V2
 * Handles Class-based combat, Rock-Paper-Scissors-Siege logic, 
 * Research buffs, and OGame-style Salvage mechanics.
 */

const CLASSES = {
    INFANTRY: 'Infantry',
    CAVALRY: 'Cavalry',
    RANGED: 'Ranged',
    SIEGE: 'Siege',
    LOGISTICS: 'Logistics',
    SPECIAL: 'Special'
};

const MULTIPLIERS = {
    ADVANTAGE: 2.0,
    DISADVANTAGE: 0.5,
    NEUTRAL: 1.0
};

/**
 * Returns the damage multiplier for an attacker class vs a defender class.
 */
function getCombatMultiplier(attackerClass, defenderClass, attackerUnitId) {
    // Cavalry counters Ranged
    if (attackerClass === CLASSES.CAVALRY && defenderClass === CLASSES.RANGED) return MULTIPLIERS.ADVANTAGE;
    if (attackerClass === CLASSES.RANGED && defenderClass === CLASSES.CAVALRY) return MULTIPLIERS.DISADVANTAGE;

    // Ranged counters Infantry
    if (attackerClass === CLASSES.RANGED && defenderClass === CLASSES.INFANTRY) return MULTIPLIERS.ADVANTAGE;
    if (attackerClass === CLASSES.INFANTRY && defenderClass === CLASSES.RANGED) return MULTIPLIERS.DISADVANTAGE;

    // Infantry counters Siege
    if (attackerClass === CLASSES.INFANTRY && defenderClass === CLASSES.SIEGE) return MULTIPLIERS.ADVANTAGE;
    if (attackerClass === CLASSES.SIEGE && defenderClass === CLASSES.INFANTRY) return MULTIPLIERS.DISADVANTAGE;

    // Siege counters everything (high base dmg) but vulnerable to Infantry and Cavalry
    if ((attackerClass === CLASSES.INFANTRY || attackerClass === CLASSES.CAVALRY) && defenderClass === CLASSES.SIEGE) return MULTIPLIERS.ADVANTAGE;
    if (attackerClass === CLASSES.SIEGE && (defenderClass === CLASSES.INFANTRY || defenderClass === CLASSES.CAVALRY)) return MULTIPLIERS.DISADVANTAGE;

    // Special Case: Spearmen (Infantry) vs Cavalry
    if (attackerUnitId === UnitTypeEnum.Spearmen && defenderClass === CLASSES.CAVALRY) return 1.5;

    return MULTIPLIERS.NEUTRAL;
}

/**
 * Calculates salvage for a stack of killed units.
 */
function calculateSalvage(unitId, count, scavengingLevel) {
    const unitDef = UNIT_CONFIG[unitId];
    if (!unitDef || !unitDef.cost) return {};

    const baseRate = 0.30;
    const bonusRate = scavengingLevel * 0.05;
    const totalRate = baseRate + bonusRate;

    const salvage = {};
    for (const [res, amt] of Object.entries(unitDef.cost)) {
        salvage[res] = Math.floor(amt * count * totalRate);
    }
    return salvage;
}

/**
 * Main simulation function.
 */
export function simulateBattle(opts = {}) {
    const seed = opts.seed || Date.now();
    const maxRounds = 9;

    const attackerResearch = opts.attackerResearch || {};
    const defenderResearch = opts.defenderResearch || {};

    // Initialize armies: [{ id: 'Militia', count: 100 }]
    let attackerArmy = JSON.parse(JSON.stringify(opts.attackerArmy || []));
    let defenderArmy = JSON.parse(JSON.stringify(opts.defenderArmy || []));

    const log = [];
    const salvagePool = {};

    for (let round = 1; round <= maxRounds; round++) {
        if (attackerArmy.length === 0 || defenderArmy.length === 0) break;

        const roundLog = {
            round,
            attackerRemaining: {},
            defenderRemaining: {},
            attackerLosses: {},
            defenderLosses: {},
            damageDealt: { attacker: 0, defender: 0 }
        };

        // Group by class for targeting and HP calculation
        const getArmyStats = (army) => {
            const byClass = {};
            const hpByClass = {};
            army.forEach(u => {
                const def = UNIT_CONFIG[u.id];
                if (!byClass[def.class]) byClass[def.class] = [];
                byClass[def.class].push({ ...u, ...def });
                hpByClass[def.class] = (hpByClass[def.class] || 0) + (def.hp * u.count);
            });
            const totalHp = Object.values(hpByClass).reduce((a, b) => a + b, 0);
            return { byClass, hpByClass, totalHp };
        };

        const attStats = getArmyStats(attackerArmy);
        const defStats = getArmyStats(defenderArmy);

        // Calculate Damage from Attacker to Defender
        const defenderDamageTakenByClass = {};
        Object.entries(attStats.byClass).forEach(([attCls, attUnits]) => {
            attUnits.forEach(u => {
                let attackPower = u.attack * u.count;
                // Infantry Drills: +5% Attack per level for INFANTRY
                if (attCls === CLASSES.INFANTRY) {
                    const drillsLevel = attackerResearch['Infantry Drills'] || 0;
                    attackPower *= (1 + drillsLevel * 0.05);
                }

                // Distribute damage across enemy classes based on their HP share
                Object.keys(defStats.byClass).forEach(defCls => {
                    const weight = defStats.hpByClass[defCls] / defStats.totalHp;
                    const mult = getCombatMultiplier(attCls, defCls, u.id);
                    const dmg = attackPower * weight * mult;
                    defenderDamageTakenByClass[defCls] = (defenderDamageTakenByClass[defCls] || 0) + dmg;
                    roundLog.damageDealt.attacker += dmg;
                });
            });
        });

        // Calculate Damage from Defender to Attacker
        const attackerDamageTakenByClass = {};
        Object.entries(defStats.byClass).forEach(([defCls, defUnits]) => {
            defUnits.forEach(u => {
                let attackPower = u.attack * u.count;
                if (defCls === CLASSES.INFANTRY) {
                    const drillsLevel = defenderResearch['Infantry Drills'] || 0;
                    attackPower *= (1 + drillsLevel * 0.05);
                }

                Object.keys(attStats.byClass).forEach(attCls => {
                    const weight = attStats.hpByClass[attCls] / attStats.totalHp;
                    const mult = getCombatMultiplier(defCls, attCls, u.id);
                    const dmg = attackPower * weight * mult;
                    attackerDamageTakenByClass[attCls] = (attackerDamageTakenByClass[attCls] || 0) + dmg;
                    roundLog.damageDealt.defender += dmg;
                });
            });
        });

        // Apply Mercenary Guards to Defender (+5% Defense = reduction in damage taken)
        const mercGuardsLevel = defenderResearch['Mercenary Guards'] || 0;
        const defDmgReduction = 1 / (1 + mercGuardsLevel * 0.05);
        Object.keys(defenderDamageTakenByClass).forEach(cls => {
            defenderDamageTakenByClass[cls] *= defDmgReduction;
        });

        // Resolve casualties (No Overkill Waste)
        const resolveCasualties = (army, damageByClass, research) => {
            const newArmy = [];
            const losses = {};
            army.forEach(u => {
                const def = UNIT_CONFIG[u.id];
                const dmg = damageByClass[def.class] || 0;
                const totalHp = u.count * def.hp;
                const remainingHp = Math.max(0, totalHp - dmg);
                const remainingCount = Math.ceil(remainingHp / def.hp);
                const lostCount = u.count - remainingCount;

                if (lostCount > 0) {
                    losses[u.id] = lostCount;
                    const scavengingLevel = research['Scavenging'] || 0;
                    const unitSalvage = calculateSalvage(u.id, lostCount, scavengingLevel);
                    for (const [res, amt] of Object.entries(unitSalvage)) {
                        salvagePool[res] = (salvagePool[res] || 0) + amt;
                    }
                }

                if (remainingCount > 0) {
                    newArmy.push({ id: u.id, count: remainingCount });
                }
            });
            return { newArmy, losses };
        };

        const attRes = resolveCasualties(attackerArmy, attackerDamageTakenByClass, attackerResearch);
        const defRes = resolveCasualties(defenderArmy, defenderDamageTakenByClass, defenderResearch);

        attackerArmy = attRes.newArmy;
        defenderArmy = defRes.newArmy;

        roundLog.attackerLosses = attRes.losses;
        roundLog.defenderLosses = defRes.losses;
        attackerArmy.forEach(u => roundLog.attackerRemaining[u.id] = u.count);
        defenderArmy.forEach(u => roundLog.defenderRemaining[u.id] = u.count);

        log.push(roundLog);
    }

    const winner = attackerArmy.length > 0 ? (defenderArmy.length > 0 ? 'Draw' : 'Attacker') : (defenderArmy.length > 0 ? 'Defender' : 'Draw');
    const insights = generateInsights(opts, log, winner);

    return {
        winner,
        rounds: log.length,
        attackerRemaining: attackerArmy,
        defenderRemaining: defenderArmy,
        salvagePool,
        insights,
        log
    };
}

/**
 * Generates strategy insights based on army composition and combat results.
 */
function generateInsights(opts, log, winner) {
    if (log.length === 0) return "No combat occurred.";

    const attackerArmy = opts.attackerArmy || [];
    const defenderArmy = opts.defenderArmy || [];

    const getComposition = (army) => {
        const counts = { classes: {}, units: {} };
        army.forEach(u => {
            const def = UNIT_CONFIG[u.id];
            counts.classes[def.class] = (counts.classes[def.class] || 0) + u.count;
            counts.units[u.id] = (counts.units[u.id] || 0) + u.count;
        });
        return counts;
    };

    const attComp = getComposition(attackerArmy);
    const defComp = getComposition(defenderArmy);

    let insight = "";
    if (winner === 'Attacker') {
        insight = "The Attacker's offensive pressure broke the defensive lines.";
    } else if (winner === 'Defender') {
        insight = "The Defender successfully held their ground against the assault.";
    } else {
        insight = "The battle resulted in a bloody stalemate after 9 rounds.";
    }

    // Specific tactical insights
    const tacticalInsights = [];

    if (attComp.classes[CLASSES.RANGED] > (attComp.classes[CLASSES.INFANTRY] || 0) && defComp.classes[CLASSES.CAVALRY] > 0) {
        tacticalInsights.push("The Attacker's heavy use of Ranged units was punished by the Defender's Cavalry.");
    } else if (defComp.classes[CLASSES.RANGED] > (defComp.classes[CLASSES.INFANTRY] || 0) && attComp.classes[CLASSES.CAVALRY] > 0) {
        tacticalInsights.push("The Defender's Ranged units were vulnerable to the Attacker's Cavalry charges.");
    }

    if (attComp.classes[CLASSES.SIEGE] > 0 && defComp.classes[CLASSES.INFANTRY] > 0) {
        tacticalInsights.push("The Attacker's Siege engines were effectively countered by the Defender's Infantry.");
    }

    if (attComp.classes[CLASSES.CAVALRY] > 0 && defComp.units[UnitTypeEnum.Spearmen] > 0) {
        tacticalInsights.push("The Attacker's Cavalry was held back by the Defender's Spearmen.");
    }

    if (tacticalInsights.length > 0) {
        insight += " " + tacticalInsights.join(" ");
    }

    return insight;
}

/**
 * Formats the battle result into a Markdown report.
 */
export function formatMarkdownReport(result) {
    let md = `# Battle Report\n\n`;
    md += `**Winner:** ${result.winner}\n`;
    md += `**Rounds:** ${result.rounds}\n\n`;

    md += `## Strategy Insights\n${result.insights}\n\n`;

    md += `## Forces Remaining\n`;
    md += `### Attacker\n`;
    if (result.attackerRemaining.length === 0) md += `None\n`;
    else result.attackerRemaining.forEach(u => md += `- ${u.id}: ${u.count}\n`);

    md += `\n### Defender\n`;
    if (result.defenderRemaining.length === 0) md += `None\n`;
    else result.defenderRemaining.forEach(u => md += `- ${u.id}: ${u.count}\n`);

    md += `\n## Salvage Report\n`;
    const salvageEntries = Object.entries(result.salvagePool);
    if (salvageEntries.length === 0) {
        md += `No salvage recovered.\n`;
    } else {
        md += `Total resources recovered from the wreckage:\n`;
        salvageEntries.forEach(([res, amt]) => md += `- ${amt} ${res}\n`);
    }

    md += `\n## Round Log\n`;
    md += `| Round | Attacker Loss | Defender Loss | Attacker Remaining | Defender Remaining |\n`;
    md += `|-------|---------------|---------------|--------------------|--------------------|\n`;
    result.log.forEach(r => {
        const attLoss = Object.entries(r.attackerLosses).map(([id, count]) => `${id}: ${count}`).join(', ') || '0';
        const defLoss = Object.entries(r.defenderLosses).map(([id, count]) => `${id}: ${count}`).join(', ') || '0';
        const attRem = Object.entries(r.attackerRemaining).map(([id, count]) => `${id}: ${count}`).join(', ') || '0';
        const defRem = Object.entries(r.defenderRemaining).map(([id, count]) => `${id}: ${count}`).join(', ') || '0';
        md += `| ${r.round} | ${attLoss} | ${defLoss} | ${attRem} | ${defRem} |\n`;
    });

    return md;
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('battle_simulator.js')) {
    // Test Case: Spearmen vs Knights
    const testAttacker = [
        { id: UnitTypeEnum.Knights, count: 50 }
    ];
    const testDefender = [
        { id: UnitTypeEnum.Spearmen, count: 100 }
    ];

    const result = simulateBattle({
        attackerArmy: testAttacker,
        defenderArmy: testDefender,
        attackerResearch: { 'Infantry Drills': 0 },
        defenderResearch: { 'Mercenary Guards': 0, 'Scavenging': 5 }
    });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    fs.writeFileSync(path.join(outDir, `battle_v2_${ts}.json`), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(outDir, `battle_v2_${ts}.md`), formatMarkdownReport(result));

    console.log(`Battle simulation complete. Winner: ${result.winner}`);
    console.log(`Report saved to data/battle_v2_${ts}.md`);
}
