import { ResourceEnum, UnitTypeEnum } from './constants/enums.js';
import { BUILDING_CONFIG } from './config/buildings.js';
import { calculateApproval, processPopulationTick } from './logic/economy.js';
import { calculateUpgradeCost } from './logic/scaling.js';

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
 * (Simplified logic for demo purposes)
 */
function calculateProduction(state) {
    const production = {};
    // Production rates are defined per-second and then scaled by the tick `seconds` passed
    // Default per-second rates (tweakable): these are base outputs per building level or per assigned worker
    const RATES = {
        // LoggingCamp: produce only when villagers are assigned (per-worker rate)
        timberPerWorkerPerSecond: 0.06, // 0.06 Timber / sec per assigned villager per LoggingCamp level
        stonePerLevelPerSecond: 0.25,   // 0.25 Stone / sec per DeepMine level
        // StonePit (quarry): produces stone per assigned villager (per-worker rate)
        stonePitPerWorkerPerSecond: 0.05, // 0.05 Stone / sec per assigned villager per StonePit level
        breadPerLevelPerSecond: 0.12,   // 0.12 Bread / sec per Farmhouse level
        berriesPerWorkerPerSecond: 0.06,// 0.06 Berries / sec per Foragers worker * building level
        meatPerWorkerPerSecond: 0.08,   // 0.08 Meat / sec per Hunting worker * building level
        hidesPerWorkerPerSecond: 0.03   // 0.03 Hides / sec per Hunting worker * building level
    };

    const seconds = state.__lastTickSeconds || 1; // fallback if not provided

    // Logging Camp -> Timber (only when villagers are assigned)
    const loggingLevel = state.buildings['LoggingCamp'] || 0;
    const loggingAssigned = state.assignments['LoggingCamp'] || 0;
    if (loggingLevel > 0 && loggingAssigned > 0) {
        // scale by building level and assigned workers
        production[ResourceEnum.Timber] = (production[ResourceEnum.Timber] || 0) + (RATES.timberPerWorkerPerSecond * loggingLevel * loggingAssigned * seconds);
    }

    // Deep Mine -> Stone
    const mineLevel = state.buildings['DeepMine'] || 0;
    if (mineLevel > 0) {
        production[ResourceEnum.Stone] = (production[ResourceEnum.Stone] || 0) + (mineLevel * RATES.stonePerLevelPerSecond * seconds);
    }

    // Stone Pit -> Surface Stone (early-game quarry) (requires assigned villagers)
    const stonePitLevel = state.buildings['StonePit'] || 0;
    const stonePitAssigned = state.assignments['StonePit'] || 0;
    if (stonePitLevel > 0 && stonePitAssigned > 0) {
        production[ResourceEnum.Stone] = (production[ResourceEnum.Stone] || 0) + (stonePitLevel * RATES.stonePitPerWorkerPerSecond * stonePitAssigned * seconds);
    }

    // Farmhouse -> Bread
    const farmLevel = state.buildings['Farmhouse'] || 0;
    if (farmLevel > 0) {
        production[ResourceEnum.Bread] = (production[ResourceEnum.Bread] || 0) + (farmLevel * RATES.breadPerLevelPerSecond * seconds);
    }

    // ForagersHut -> Berries (per assigned villager)
    const foragersLevel = state.buildings['ForagersHut'] || 0;
    const foragersAssigned = state.assignments['ForagersHut'] || 0;
    if (foragersLevel > 0 && foragersAssigned > 0) {
        // scale by building level and assigned workers
        production[ResourceEnum.Berries] = (production[ResourceEnum.Berries] || 0) + (RATES.berriesPerWorkerPerSecond * foragersLevel * foragersAssigned * seconds);
        // small chance for random meat bonus scaled per tick (still coarse-grained)
        if (Math.random() < 0.02 * Math.min(1, foragersAssigned / 10)) {
            production[ResourceEnum.Meat] = (production[ResourceEnum.Meat] || 0) + 1;
        }
    }

    // HuntingLodge -> Meat (per assigned villager)
    const huntingLevel = state.buildings['HuntingLodge'] || 0;
    const huntingAssigned = state.assignments['HuntingLodge'] || 0;
    if (huntingLevel > 0 && huntingAssigned > 0) {
        production[ResourceEnum.Meat] = (production[ResourceEnum.Meat] || 0) + (RATES.meatPerWorkerPerSecond * huntingLevel * huntingAssigned * seconds);
        production[ResourceEnum.Hides] = (production[ResourceEnum.Hides] || 0) + (RATES.hidesPerWorkerPerSecond * huntingLevel * huntingAssigned * seconds);
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
        state.hasFirewood
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
        const nowMs = Date.now();
        // Process any completed items at front of queue (server authoritative)
        while (state.queue.length > 0 && state.queue[0].completesAt && state.queue[0].completesAt <= nowMs) {
            const item = state.queue[0];
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

    // Demo duration (seconds): set to a short but visible duration for progress display
    const demoDuration = 60;
    const now = Date.now();

    state.queue.push({
        type: 'Building',
        id: buildingId,
        name: `${config.name} Lvl ${currentLevel + 1}`,
        totalTime: demoDuration,
        startedAt: now,
        completesAt: now + (demoDuration * 1000)
    });

    return { success: true, message: "Construction Started" };
}
