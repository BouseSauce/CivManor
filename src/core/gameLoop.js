import { ResourceEnum, UnitTypeEnum } from './constants/enums.js';
import { BUILDING_CONFIG } from './config/buildings.js';
import { calculateApproval, processPopulationTick } from './logic/economy.js';
import { calculateUpgradeCost, calculateBuildTime } from './logic/scaling.js';

/**
 * Represents the state of a single Area (e.g., a Village or City).
 */
export class AreaState {
    constructor(name, maxCapacity = 100) {
        this.name = name;
        this.tickCount = 0;

        // Resources
        this.resources = {};
        Object.values(ResourceEnum).forEach(r => this.resources[r] = 0);
        
        // Initial Resources
        this.resources[ResourceEnum.Timber] = 500;
        this.resources[ResourceEnum.Stone] = 200;
        // Note: 'Food' is represented by specific types (Berries, Meat, Fish, Bread)
        this.resources[ResourceEnum.Berries] = 200;
        this.resources[ResourceEnum.Meat] = 50;
        this.resources[ResourceEnum.Gold] = 0;

        // Population & Economy
        this.population = 50;
        this.housingCapacity = maxCapacity;
        this.taxRate = 0.0; // 10%
        this.approval = 100;
        this.hasFirewood = true;

        // Buildings (Level 0 by default)
        this.buildings = {};
        Object.keys(BUILDING_CONFIG).forEach(id => this.buildings[id] = 0);
        
        // Units
        this.units = {};
        Object.values(UnitTypeEnum).forEach(u => this.units[u] = 0);

        // Initialize villagers as available villagers equal to population
        this.units[UnitTypeEnum.Villager] = this.population;

        // Worker assignments: buildingId -> number assigned
        this.assignments = {};

        // Construction Queue
        // Array of { type: 'Building'|'Unit', id: string, timeRemaining: number, totalTime: number, name: string }
        this.queue = [];
    }
}

/**
 * Calculates resource production based on building levels.
 * Implements Exponential Scaling: Production = Base * Level * 1.1^Level
 */
function calculateProduction(state) {
    const production = {};
    // Base production rates per second (per worker or per building)
    const RATES = {
        timberPerWorkerPerSecond: 0.06,
        stonePerLevelPerSecond: 0.25,
        stonePitPerWorkerPerSecond: 0.05,
        breadPerLevelPerSecond: 0.12,
        berriesPerWorkerPerSecond: 0.06,
        meatPerWorkerPerSecond: 0.08,
        hidesPerWorkerPerSecond: 0.03
    };

    const seconds = state.__lastTickSeconds || 1;

    // Helper: Production = (Base * Workers) * Level * 1.1^Level
    const getOutput = (baseRate, level, workers = 1) => {
        if (level <= 0) return 0;
        return (baseRate * workers) * level * Math.pow(1.1, level) * seconds;
    };

    // Logging Camp -> Timber
    const loggingLevel = state.buildings['LoggingCamp'] || 0;
    const loggingAssigned = state.assignments['LoggingCamp'] || 0;
    if (loggingLevel > 0 && loggingAssigned > 0) {
        production[ResourceEnum.Timber] = (production[ResourceEnum.Timber] || 0) + getOutput(RATES.timberPerWorkerPerSecond, loggingLevel, loggingAssigned);
    }

    // Deep Mine -> Stone
    const mineLevel = state.buildings['DeepMine'] || 0;
    if (mineLevel > 0) {
        production[ResourceEnum.Stone] = (production[ResourceEnum.Stone] || 0) + getOutput(RATES.stonePerLevelPerSecond, mineLevel, 1);
    }

    // Stone Pit -> Stone
    const stonePitLevel = state.buildings['StonePit'] || 0;
    const stonePitAssigned = state.assignments['StonePit'] || 0;
    if (stonePitLevel > 0 && stonePitAssigned > 0) {
        production[ResourceEnum.Stone] = (production[ResourceEnum.Stone] || 0) + getOutput(RATES.stonePitPerWorkerPerSecond, stonePitLevel, stonePitAssigned);
    }

    // Farmhouse -> Bread
    const farmLevel = state.buildings['Farmhouse'] || 0;
    if (farmLevel > 0) {
        production[ResourceEnum.Bread] = (production[ResourceEnum.Bread] || 0) + getOutput(RATES.breadPerLevelPerSecond, farmLevel, 1);
    }

    // ForagersHut -> Berries
    const foragersLevel = state.buildings['ForagersHut'] || 0;
    const foragersAssigned = state.assignments['ForagersHut'] || 0;
    if (foragersLevel > 0 && foragersAssigned > 0) {
        production[ResourceEnum.Berries] = (production[ResourceEnum.Berries] || 0) + getOutput(RATES.berriesPerWorkerPerSecond, foragersLevel, foragersAssigned);
        // Random meat bonus
        if (Math.random() < 0.02 * Math.min(1, foragersAssigned / 10)) {
            production[ResourceEnum.Meat] = (production[ResourceEnum.Meat] || 0) + 1;
        }
    }

    // HuntingLodge -> Meat
    const huntingLevel = state.buildings['HuntingLodge'] || 0;
    const huntingAssigned = state.assignments['HuntingLodge'] || 0;
    if (huntingLevel > 0 && huntingAssigned > 0) {
        production[ResourceEnum.Meat] = (production[ResourceEnum.Meat] || 0) + getOutput(RATES.meatPerWorkerPerSecond, huntingLevel, huntingAssigned);
        if (huntingLevel >= 5) {
            production[ResourceEnum.Hides] = (production[ResourceEnum.Hides] || 0) + getOutput(RATES.hidesPerWorkerPerSecond, huntingLevel, huntingAssigned);
        }
    }

    return production;
}

/**
 * The Main Game Loop Function.
 * Executes one "Tick" of the simulation.
 */
export function processTick(state, seconds = 1) {
    state.tickCount += (seconds || 1);
    // expose last tick seconds for production calculations
    state.__lastTickSeconds = (seconds || 1);
    console.log(`\n--- TICK ${state.tickCount} [${state.name}] (dt=${seconds}s) ---`);

    // 1. Resource Production
    const production = calculateProduction(state);
    for (const [res, amount] of Object.entries(production)) {
        state.resources[res] += amount;
        // console.log(`Produced ${amount} ${res}`);
    }

    // 2. Calculate Approval
    // Determine food variety (count of food types with > 0 stock)
    const foodTypes = [ResourceEnum.Berries, ResourceEnum.Meat, ResourceEnum.Fish, ResourceEnum.Bread];
    const foodVariety = foodTypes.filter(t => state.resources[t] > 0).length;

    state.approval = calculateApproval(
        state.population,
        state.housingCapacity,
        foodVariety,
        state.taxRate,
        state.hasFirewood,
        state.approval // pass previous approval so changes are rate-limited
    );

    // 3. Process Population (Consumption & Growth)
    const foodStocks = {};
    foodTypes.forEach(t => foodStocks[t] = state.resources[t]);

    const prevPopulation = state.population;
    const popResult = processPopulationTick(state.population, foodStocks, state.approval);

    // Update State
    state.population = popResult.newPop;

    // Keep civilian Villager unit count in sync with population.
    // If population increased, add villagers; if decreased, remove villagers and clamp assignments.
    const prevVillagers = state.units[UnitTypeEnum.Villager] || 0;
    const popDelta = state.population - prevPopulation;
    state.units[UnitTypeEnum.Villager] = Math.max(0, (state.units[UnitTypeEnum.Villager] || 0) + popDelta);

    // If population dropped and total assigned workers now exceed villagers, reduce assignments to fit.
    let totalAssigned = Object.values(state.assignments || {}).reduce((a,b) => a + b, 0);
    if (totalAssigned > state.units[UnitTypeEnum.Villager]) {
        let excess = totalAssigned - state.units[UnitTypeEnum.Villager];
        // Greedy reduction: iterate assignments and decrement until excess resolved
        const keys = Object.keys(state.assignments || {});
        let ki = 0;
        while (excess > 0 && keys.length > 0) {
            const k = keys[ki % keys.length];
            const cur = state.assignments[k] || 0;
            if (cur > 0) {
                state.assignments[k] = cur - 1;
                excess--; 
            }
            ki++;
            // If we've looped many times and nothing to reduce, break to avoid infinite loop
            if (ki > 10000) break;
        }
        // Remove zero entries
        Object.keys(state.assignments).forEach(k => { if ((state.assignments[k] || 0) <= 0) delete state.assignments[k]; });
    }
    
    // Deduct consumed food
    for (const [type, amount] of Object.entries(popResult.consumedFood)) {
        state.resources[type] -= amount;
    }

    // 4. Process Queue
    if (state.queue.length > 0) {
        // Process queue items by decrementing ticks
        // We only process the first item in the queue (sequential build)
        const item = state.queue[0];
        
        // Initialize ticksRemaining if missing (migration/safety)
        if (typeof item.ticksRemaining === 'undefined') {
             // Fallback: try to estimate from completesAt or just set to 1 to finish quickly
             item.ticksRemaining = 1;
        }

        item.ticksRemaining -= (seconds || 1); // seconds here is actually ticks passed

        if (item.ticksRemaining <= 0) {
            if (item.type === 'Building') {
                state.buildings[item.id] = (state.buildings[item.id] || 0) + 1;
                console.log(`Construction Complete: ${item.name} -> Lvl ${state.buildings[item.id]}`);
                // If we upgraded TownHall, recompute housing capacity
                if (item.id === 'TownHall') {
                    try {
                        const cfg = BUILDING_CONFIG['TownHall'];
                        const lvl = state.buildings['TownHall'] || 0;
                        if (cfg) {
                            if (Array.isArray(cfg.housingByLevel) && cfg.housingByLevel.length > 0) {
                                const idx = Math.min(lvl, cfg.housingByLevel.length - 1);
                                state.housingCapacity = cfg.housingByLevel[idx];
                            } else if (typeof cfg.housingBase !== 'undefined' && typeof cfg.housingPerLevel !== 'undefined') {
                                state.housingCapacity = cfg.housingBase + (lvl * cfg.housingPerLevel);
                            }
                            console.log(`Housing capacity updated -> ${state.housingCapacity}`);
                        }
                    } catch (e) { /* ignore */ }
                }
            } else if (item.type === 'Unit') {
                state.units[item.id] = (state.units[item.id] || 0) + (item.count || 0);
                console.log(`Recruitment Complete: ${item.name}`);
            }
            state.queue.shift();
        }
    }

    // Ensure housing capacity tracks TownHall level (in case of load / manual changes)
    try {
        const thLvl = state.buildings['TownHall'] || 0;
        const thCfg = BUILDING_CONFIG['TownHall'];
        if (thCfg) {
            if (Array.isArray(thCfg.housingByLevel) && thCfg.housingByLevel.length > 0) {
                state.housingCapacity = thCfg.housingByLevel[Math.min(thLvl, thCfg.housingByLevel.length - 1)];
            } else if (typeof thCfg.housingBase !== 'undefined' && typeof thCfg.housingPerLevel !== 'undefined') {
                state.housingCapacity = thCfg.housingBase + (thLvl * thCfg.housingPerLevel);
            }
        }
    } catch (e) { /* ignore */ }

    // Log Results
    console.log(`Population: ${state.population} (Approval: ${state.approval}%)`);
    if (popResult.starvationDeaths > 0) {
        console.log(`WARNING: ${popResult.starvationDeaths} died of starvation!`);
    }
    if (state.population > popResult.newPop && popResult.starvationDeaths === 0) {
        console.log(`Population declined due to low approval.`);
    } else if (state.population < popResult.newPop) {
        console.log(`Population grew!`);
    }

    console.log(`Resources: Timber: ${state.resources.Timber}, Bread: ${state.resources.Bread}, Meat: ${state.resources.Meat}`);

    // cleanup transient tick helper
    delete state.__lastTickSeconds;
}

// --- DEMO EXECUTION ---
// Only run if executed directly (not imported)
// In a real app, this would be triggered by a timer or server loop.

/*
const demoState = new AreaState("Iron Forge");

// Setup some initial buildings
demoState.buildings['LoggingCamp'] = 5;
demoState.buildings['Farmhouse'] = 2;

// Run 5 Ticks
for (let i = 0; i < 5; i++) {
    processTick(demoState);
}
*/

/**
 * Starts construction of a building.
 * @param {AreaState} state 
 * @param {string} buildingId 
 */
export function startConstruction(state, buildingId) {
    const config = BUILDING_CONFIG[buildingId];
    if (!config) return { success: false, message: "Invalid Building" };

    const currentLevel = state.buildings[buildingId] || 0;
    const cost = calculateUpgradeCost(buildingId, currentLevel);

    // Check Resources
    for (const [res, amount] of Object.entries(cost)) {
        if ((state.resources[res] || 0) < amount) {
            return { success: false, message: `Insufficient ${res}` };
        }
    }

    // Deduct Resources
    for (const [res, amount] of Object.entries(cost)) {
        state.resources[res] -= amount;
    }

    // Calculate Build Time (in ticks)
    // calculateBuildTime returns "seconds" in standard speed, which maps 1:1 to ticks
    const buildTicks = calculateBuildTime(buildingId, currentLevel);
    const now = Date.now();

    // Determine a level-aware display name (prefer displayName or levelNames when present)
    let levelDisplayName = config.displayName || config.name;
    try {
        if (config.levelNames && Array.isArray(config.levelNames)) {
            const idx = Math.min(currentLevel + 1, Math.max(0, config.levelNames.length - 1));
            levelDisplayName = config.levelNames[Math.max(0, Math.min(currentLevel + 1, config.levelNames.length - 1))] || levelDisplayName;
        }
    } catch (e) { /* ignore */ }

    state.queue.push({
        type: 'Building',
        id: buildingId,
        name: `${levelDisplayName} Lvl ${currentLevel + 1}`,
        totalTicks: buildTicks,
        totalTime: buildTicks, // seconds/ticks (kept for API compatibility)
        ticksRemaining: buildTicks,
        timeRemaining: buildTicks,
        completesAt: now + (buildTicks * 1000),
        startedAt: now // Keep for record keeping if needed
    });

    return { success: true, message: "Construction Started" };
}
