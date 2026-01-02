import { ResourceEnum, UnitTypeEnum } from './constants/enums.js';
import { BUILDING_CONFIG, computeProcessingOutput, computeTotalProductionExtraction, computeTotalLevelCost } from './config/buildings.js';
import { calculateApproval, processPopulationTick } from './logic/economy.js';
import { calculateUpgradeCost, calculateBuildTime, calculateStorageCapacity } from './logic/scaling.js';
import { PRODUCTION_RATES, PRODUCTION_GROWTH, WORKER_EXP, PRODUCTION_GLOBAL_MULTIPLIER } from './config/production_fixed.js';
import { resolveBattle } from './logic/military.js';
import { UNIT_CONFIG } from './config/units.js';

/**
 * Represents the state of a single Area (e.g., a Village or City).
 */
export class AreaState {
    constructor(name, maxCapacity = 100) {
        this.name = name;
        this.ownerId = null;
        this.tickCount = 0;

        // Resources
        this.resources = {};
        Object.values(ResourceEnum).forEach(r => this.resources[r] = 0);
        
        // Initial Resources
        this.resources[ResourceEnum.Timber] = 500;
        this.resources[ResourceEnum.Stone] = 400;
        // Note: Food is now a unified resource (Food) alongside Fish and Bread
        this.resources[ResourceEnum.Food] = 250;

        // Population & Economy
        this.population = 30;
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

        // Missions (Attacks, Trades, etc.)
        this.missions = [];

        // Proximity Alerts (Incoming attacks detected by Watchtower)
        this.proximityAlerts = [];
        
        // Scouted Missions (Data revealed by scouts)
        // missionId -> { units, ownerId, originName }
        this.scoutedMissions = {};

        // Construction Queue
        // Array of { type: 'Building'|'Unit', id: string, timeRemaining: number, totalTime: number, name: string }
        this.queue = [];

        // Active Spies (Spies from other players in this area)
        // Array of { ownerId, depth, ticksRemaining }
        this.activeSpies = [];
    }
}

/**
 * Calculates resource production based on building levels.
 * Implements Exponential Scaling: Production = Base * Level * 1.1^Level
 */
function calculateProduction(state, ctx = {}) {
    const production = {};
    const producers = []; // { buildingId, resource, amount }
    // Base production rates per second (per worker or per building)
    const RATES = PRODUCTION_RATES;
    const seconds = state.__lastTickSeconds || 1;

    // Helper: Production with compounding growth per level.
    // Each level multiplies the previous level's output by PRODUCTION_GROWTH (e.g., 1.2).
    // Use growth^(level-1) so level 1 yields baseRate, level 2 yields baseRate * growth, etc.
    const getOutput = (baseRate, level, workers = 1) => {
        if (level <= 0 || workers <= 0) return 0;
        const workerFactor = Math.pow(Math.max(1, workers), WORKER_EXP);
        const levelMultiplier = Math.pow(PRODUCTION_GROWTH, Math.max(0, level - 1));
        return baseRate * workerFactor * levelMultiplier * seconds * (PRODUCTION_GLOBAL_MULTIPLIER || 1);
    };

    // Town Hall -> Food (Settlement Hall gathering)
    const townHallLevel = state.buildings['TownHall'] || 0;
    const townHallAssigned = state.assignments['TownHall'] || 0;
    if (townHallLevel > 0 && townHallAssigned > 0) {
        const amt = getOutput(RATES.townHallFoodPerWorkerPerSecond || 0.025, townHallLevel, townHallAssigned);
        production[ResourceEnum.Food] = (production[ResourceEnum.Food] || 0) + amt;
        producers.push({ buildingId: 'TownHall', resource: ResourceEnum.Food, amount: amt, assigned: townHallAssigned });
    }

    // Logging Camp -> Timber
    const loggingLevel = state.buildings['LoggingCamp'] || 0;
    const loggingAssigned = state.assignments['LoggingCamp'] || 0;
    if (loggingLevel > 0 && loggingAssigned > 0) {
        const amt = getOutput(RATES.timberPerWorkerPerSecond, loggingLevel, loggingAssigned);
        production[ResourceEnum.Timber] = (production[ResourceEnum.Timber] || 0) + amt;
        producers.push({ buildingId: 'LoggingCamp', resource: ResourceEnum.Timber, amount: amt, assigned: loggingAssigned });
    }

    // Watchtower -> Knowledge (Intelligence gathering)
    const watchtowerLevel = state.buildings['Watchtower'] || 0;
    const watchtowerAssigned = state.assignments['Watchtower'] || 0;
    if (watchtowerLevel > 0 && watchtowerAssigned > 0) {
        const amt = getOutput(RATES.intelPerWorkerPerSecond || 0.05, watchtowerLevel, watchtowerAssigned);
        production[ResourceEnum.Knowledge] = (production[ResourceEnum.Knowledge] || 0) + amt;
        producers.push({ buildingId: 'Watchtower', resource: ResourceEnum.Knowledge, amount: amt, assigned: watchtowerAssigned });
    }

    // Barracks -> Knowledge (Military training/intel)
    const barracksLevel = state.buildings['Barracks'] || 0;
    const barracksAssigned = state.assignments['Barracks'] || 0;
    if (barracksLevel > 0 && barracksAssigned > 0) {
        const amt = getOutput(RATES.militaryIntelPerWorkerPerSecond || 0.02, barracksLevel, barracksAssigned);
        production[ResourceEnum.Knowledge] = (production[ResourceEnum.Knowledge] || 0) + amt;
        producers.push({ buildingId: 'Barracks', resource: ResourceEnum.Knowledge, amount: amt, assigned: barracksAssigned });
    }

    // Stone Pit -> Stone
    const stonePitLevel = state.buildings['StonePit'] || 0;
    const stonePitAssigned = state.assignments['StonePit'] || 0;
    if (stonePitLevel > 0 && stonePitAssigned > 0) {
        let baseRate = RATES.stonePitPerWorkerPerSecond || 0.1;
        
        const amt = getOutput(baseRate, stonePitLevel, stonePitAssigned);
        production[ResourceEnum.Stone] = (production[ResourceEnum.Stone] || 0) + amt;
        producers.push({ buildingId: 'StonePit', resource: ResourceEnum.Stone, amount: amt, assigned: stonePitAssigned });
    }

    // Farmhouse -> Food (unified food resource)
    const farmhouseLevel = state.buildings['Farmhouse'] || 0;
    const farmhouseAssigned = state.assignments['Farmhouse'] || 0;
    if (farmhouseLevel > 0 && farmhouseAssigned > 0) {
        const amt = getOutput(RATES.foodPerWorkerPerSecond, farmhouseLevel, farmhouseAssigned);
        production[ResourceEnum.Food] = (production[ResourceEnum.Food] || 0) + amt;
        producers.push({ buildingId: 'Farmhouse', resource: ResourceEnum.Food, amount: amt, assigned: farmhouseAssigned });
    }

    // Farm -> Food (combines previous foraging & hunting outputs)
    const farmLevel = state.buildings['Farm'] || 0;
    const farmAssigned = state.assignments['Farm'] || 0;
    if (farmLevel > 0 && farmAssigned > 0) {
        const amt = getOutput(RATES.foodPerWorkerPerSecond, farmLevel, farmAssigned);
        production[ResourceEnum.Food] = (production[ResourceEnum.Food] || 0) + amt;
        producers.push({ buildingId: 'Farm', resource: ResourceEnum.Food, amount: amt, assigned: farmAssigned });
    }

    // Sawpit -> Planks (converts Timber -> Planks)
    const sawLevel = state.buildings['Sawpit'] || 0;
    const sawAssigned = state.assignments['Sawpit'] || 0;
    if (sawLevel > 0 && sawAssigned > 0) {
        const cfg = BUILDING_CONFIG['Sawpit'];
        const ratio = cfg?.baseOutput?.ratio || 4.0;
        const potentialPlanks = getOutput(RATES.planksPerWorkerPerSecond, sawLevel, sawAssigned);
        const availableTimber = state.resources[ResourceEnum.Timber] || 0;
        const maxByInput = computeProcessingOutput(availableTimber, ratio, sawLevel);
        const planksProduced = Math.floor(Math.min(potentialPlanks, maxByInput) * 1000000) / 1000000;
        const timberConsumed = Math.floor(planksProduced * ratio * 1000000) / 1000000;
        if (planksProduced > 0) {
            production[ResourceEnum.Timber] = (production[ResourceEnum.Timber] || 0) - timberConsumed;
            production[ResourceEnum.Planks] = (production[ResourceEnum.Planks] || 0) + planksProduced;
            producers.push({ buildingId: 'Sawpit', resource: ResourceEnum.Planks, amount: planksProduced, assigned: sawAssigned });
            producers.push({ buildingId: 'Sawpit', resource: ResourceEnum.Timber, amount: -timberConsumed, assigned: sawAssigned });
        }
    }

    // Charcoal Kiln -> Coal (converts Planks -> Coal)
    const kilnLevel = state.buildings['CharcoalKiln'] || 0;
    const kilnAssigned = state.assignments['CharcoalKiln'] || 0;
    if (kilnLevel > 0 && kilnAssigned > 0) {
        const cfg = BUILDING_CONFIG['CharcoalKiln'];
        const ratio = cfg?.baseOutput?.ratio || 4.0;
        const potentialCoal = getOutput(RATES.coalPerWorkerPerSecond, kilnLevel, kilnAssigned);
        const availablePlanks = state.resources[ResourceEnum.Planks] || 0;
        const maxByInput = computeProcessingOutput(availablePlanks, ratio, kilnLevel);
        const coalProduced = Math.floor(Math.min(potentialCoal, maxByInput) * 1000000) / 1000000;
        const planksConsumed = Math.floor(coalProduced * ratio * 1000000) / 1000000;
        if (coalProduced > 0) {
            production[ResourceEnum.Planks] = (production[ResourceEnum.Planks] || 0) - planksConsumed;
            production[ResourceEnum.Coal] = (production[ResourceEnum.Coal] || 0) + coalProduced;
            producers.push({ buildingId: 'CharcoalKiln', resource: ResourceEnum.Coal, amount: coalProduced, assigned: kilnAssigned });
            producers.push({ buildingId: 'CharcoalKiln', resource: ResourceEnum.Planks, amount: -planksConsumed, assigned: kilnAssigned });
        }
    }

    // Bloomery -> IronIngot
    // Primary path: consumes IronOre (5 Ore + 2 Timber per Ingot)
    // Secondary path: can additionally consume Stone when Ore is insufficient
    // Stone conversion uses a configurable ratio (stones per ingot). The Bloomery
    // will prefer Ore first and then use Stone to fulfill remaining potential output.
    const bloomLevel = state.buildings['Bloomery'] || 0;
    const bloomAssigned = state.assignments['Bloomery'] || 0;
    if (bloomLevel > 0 && bloomAssigned > 0) {
        const cfg = BUILDING_CONFIG['Bloomery'];
        const potentialIngots = getOutput(RATES.ingotPerWorkerPerSecond, bloomLevel, bloomAssigned);
        const availableStone = state.resources[ResourceEnum.Stone] || 0;
        const availableTimber2 = state.resources[ResourceEnum.Timber] || 0;

        // Inputs: stone primary (4 Stone -> 1 Ingot), timber (2 Timber -> 1 Ingot)
        const stoneToIngotRatio = cfg?.baseOutput?.ratio || 4.0;
        const maxByStone = computeProcessingOutput(availableStone, stoneToIngotRatio, bloomLevel);
        const maxByTimber = computeProcessingOutput(availableTimber2, 2.0, bloomLevel);

        // Total raw-material capacity limited by timber as well
        const ingotsProduced = Math.floor(Math.min(potentialIngots, maxByStone, maxByTimber) * 1000000) / 1000000;
        if (ingotsProduced > 0) {
            const stoneConsumed = ingotsProduced * stoneToIngotRatio;
            const timberConsumed = ingotsProduced * 2.0;

            if (stoneConsumed > 0) production[ResourceEnum.Stone] = (production[ResourceEnum.Stone] || 0) - stoneConsumed;
            production[ResourceEnum.Timber] = (production[ResourceEnum.Timber] || 0) - timberConsumed;
            production[ResourceEnum.IronIngot] = (production[ResourceEnum.IronIngot] || 0) + ingotsProduced;

            producers.push({ buildingId: 'Bloomery', resource: ResourceEnum.IronIngot, amount: ingotsProduced, assigned: bloomAssigned });
            if (stoneConsumed > 0) producers.push({ buildingId: 'Bloomery', resource: ResourceEnum.Stone, amount: -stoneConsumed, assigned: bloomAssigned });
            producers.push({ buildingId: 'Bloomery', resource: ResourceEnum.Timber, amount: -timberConsumed, assigned: bloomAssigned });
        }
    }

    // SteelWorks -> Steel (consumes IronIngot + Coal per Steel)
    const swLevel = state.buildings['SteelWorks'] || state.buildings['BlastFurnace'] || 0;
    const swAssigned = state.assignments['SteelWorks'] || state.assignments['BlastFurnace'] || 0;
    if (swLevel > 0 && swAssigned > 0) {
        const cfg = BUILDING_CONFIG['SteelWorks'];
        const ratio = cfg?.baseOutput?.ratio || 4.0;
        const potentialSteel = getOutput(RATES.steelPerWorkerPerSecond, swLevel, swAssigned);
        const availableIngots = state.resources[ResourceEnum.IronIngot] || 0;
        const availableCoal = state.resources[ResourceEnum.Coal] || 0;
        const maxByIngots = computeProcessingOutput(availableIngots, ratio, swLevel);
        const maxByCoal = computeProcessingOutput(availableCoal, ratio, swLevel);
        const steelProduced = Math.floor(Math.min(potentialSteel, maxByIngots, maxByCoal) * 1000000) / 1000000;
        if (steelProduced > 0) {
            const ingotsConsumed = steelProduced * ratio;
            const coalConsumed = steelProduced * ratio;
            production[ResourceEnum.IronIngot] = (production[ResourceEnum.IronIngot] || 0) - ingotsConsumed;
            production[ResourceEnum.Coal] = (production[ResourceEnum.Coal] || 0) - coalConsumed;
            production[ResourceEnum.Steel] = (production[ResourceEnum.Steel] || 0) + steelProduced;
            producers.push({ buildingId: 'SteelWorks', resource: ResourceEnum.Steel, amount: steelProduced, assigned: swAssigned });
            producers.push({ buildingId: 'SteelWorks', resource: ResourceEnum.IronIngot, amount: -ingotsConsumed, assigned: swAssigned });
            producers.push({ buildingId: 'SteelWorks', resource: ResourceEnum.Coal, amount: -coalConsumed, assigned: swAssigned });
        }
    }

    return { production, producers };
}

/**
 * The Main Game Loop Function.
 * Executes one "Tick" of the simulation.
 */
export function processTick(state, seconds = 1, ctx = {}) {
    state.tickCount += (seconds || 1);
    // expose last tick seconds for production calculations
    state.__lastTickSeconds = (seconds || 1);
    console.log(`\n--- TICK ${state.tickCount} [${state.name}] (dt=${seconds}s) ---`);

    // Migration helper: consolidate legacy food keys into unified `Food` resource
    try {
        const canonical = ResourceEnum.Food || 'Food';
        const legacyKeys = ['Bread','Berries','Meat','Fish'];
        legacyKeys.forEach(k => {
            if (state.resources && Object.prototype.hasOwnProperty.call(state.resources, k)) {
                const v = Number(state.resources[k] || 0);
                if (!isNaN(v) && v > 0) {
                    state.resources[canonical] = (state.resources[canonical] || 0) + v;
                }
                delete state.resources[k];
            }
        });
    } catch (e) { /* ignore migration errors */ }

    // 1. Resource Production (apply capacity limits)
    const { production, producers } = calculateProduction(state, ctx);
    
    // Reset storage-related idle reasons; we will re-apply them if storage is still full.
    if (state.idleReasons) {
        Object.keys(state.idleReasons).forEach(bId => {
            if (state.idleReasons[bId] === 'Storage Limit') {
                delete state.idleReasons[bId];
            }
        });
    }

    // Helper: compute capacity for a resource based on Storehouse level and ctx flags
    const getCapacityFor = (res) => {
        try {
            const shLevel = state.buildings['Storehouse'] || 0;
            return calculateStorageCapacity(res, shLevel);
        } catch (e) { return Infinity; }
    };

    // Group producers by resource to apply caps
    const producersByResource = {};
    (producers || []).forEach(p => { 
        producersByResource[p.resource] = producersByResource[p.resource] || []; 
        producersByResource[p.resource].push(p); 
    });

    for (const [res, list] of Object.entries(producersByResource)) {
        // Skip storage checks for non-storable resources like populationCap
        if (res === 'populationCap' || res === 'housingCapacity') {
            const total = list.reduce((s, p) => s + (p.amount || 0), 0);
            if (state.resources[res] !== undefined) state.resources[res] += total;
            continue;
        }

        let cur = state.resources[res] || 0;
        const cap = getCapacityFor(res);
        
        if (cap === Infinity) {
            const total = list.reduce((s, p) => s + (p.amount || 0), 0);
            state.resources[res] = cur + total;
            continue;
        }

        let space = Math.max(0, cap - cur);
        
        // Sort producers: consumers first (to create space), then producers
        const sortedList = [...list].sort((a, b) => (a.amount || 0) - (b.amount || 0));

        for (const p of sortedList) {
            const amount = p.amount || 0;
            if (amount <= 0) {
                // Consumption or zero: always allowed
                cur += amount;
                space -= amount;
                continue;
            }

            // Production
            const take = Math.min(space, amount);
            cur += take;
            space -= take;

            if (take < amount) {
                // Building is storage-limited for this resource
                state.idleReasons = state.idleReasons || {};
                if (p.buildingId && (state.assignments[p.buildingId] || 0) > 0) {
                    state.idleReasons[p.buildingId] = 'Storage Limit';
                }
            }
        }

        state.resources[res] = cur;
    }

    // 2. Calculate Approval
    // Determine food variety (only unified Food is considered)
    const foodTypes = [ResourceEnum.Food];
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
    const thLevel = state.buildings['TownHall'] || 0;
    const captives = state.resources[ResourceEnum.Captives] || 0;

    // --- RESEARCH BUFFS: Population & Housing ---
    // Basic Sanitation: +2% Pop Growth Speed per level
    // Hardwood Framing: +5% Housing Capacity per level
    let growthMult = 1.0;
    let housingMult = 1.0;
    // Note: We need access to user tech levels here. 
    // gameLoop.js runs on both client and server, but 'users' map is server-only.
    // We'll rely on 'state.techLevels' if available (injected by server) or default to 1.0
    if (state.techLevels) {
        const sanLvl = state.techLevels['Basic Sanitation'] || 0;
        if (sanLvl > 0) growthMult += (sanLvl * 0.02);

        const frameLvl = state.techLevels['Hardwood Framing'] || 0;
        if (frameLvl > 0) housingMult += (frameLvl * 0.05);
    }

    const effectiveHousingCap = Math.floor(state.housingCapacity * housingMult);

    const popResult = processPopulationTick(state.population, foodStocks, state.approval, thLevel, effectiveHousingCap, captives, seconds, state, growthMult);

    // Update State
    state.population = popResult.newPop;

    // Apply captive morbidity
    if (popResult.captiveDeaths && popResult.captiveDeaths > 0) {
        state.resources[ResourceEnum.Captives] = Math.max(0, (state.resources[ResourceEnum.Captives] || 0) - popResult.captiveDeaths);
    }

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
        // consumedFood keys may still reference legacy Meat/Berries during migration; map them to Food
        if (type === ResourceEnum.Berries || type === ResourceEnum.Meat) {
            state.resources[ResourceEnum.Food] = (state.resources[ResourceEnum.Food] || 0) - amount;
        } else {
            state.resources[type] = (state.resources[type] || 0) - amount;
        }
    }

    // Apply starvation deaths to units if any
    if (popResult.starvationDeaths && popResult.starvationDeaths > 0) {
        // Remove villagers equal to starvationDeaths (clamp)
        const villagers = state.units[UnitTypeEnum.Villager] || 0;
        const toRemove = Math.min(villagers, popResult.starvationDeaths);
        state.units[UnitTypeEnum.Villager] = Math.max(0, villagers - toRemove);
    }

    // 4. Process Queue
    if (state.queue.length > 0) {
        // Process queue items by decrementing ticks
        // We only process the first item in the queue (sequential build)
        const item = state.queue[0];
        
        // Initialize ticksRemaining if missing (migration/safety)
        if (typeof item.ticksRemaining === 'undefined') {
             // Fallback: try to use timeRemaining or totalTime before defaulting to 1
             item.ticksRemaining = item.timeRemaining ?? item.totalTime ?? item.totalTicks ?? 1;
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
                // Special-case: converting villagers into non-working units like Scholars
                try {
                    if (item.id === UnitTypeEnum.Scholar) {
                        const qty = (item.count || 0);
                        state.units[UnitTypeEnum.Scholar] = (state.units[UnitTypeEnum.Scholar] || 0) + qty;
                        // Consume villagers (convert). Clamp to available villagers.
                        const villagers = state.units[UnitTypeEnum.Villager] || 0;
                        const toConvert = Math.min(villagers, qty);
                        state.units[UnitTypeEnum.Villager] = Math.max(0, villagers - toConvert);
                        console.log(`Scholar Conversion Complete: converted ${toConvert} villagers into Scholars`);
                    } else {
                        state.units[item.id] = (state.units[item.id] || 0) + (item.count || 0);
                        console.log(`Recruitment Complete: ${item.name}`);
                    }
                } catch (e) {
                    // Fallback: ensure unit is added if UnitTypeEnum isn't available
                    state.units[item.id] = (state.units[item.id] || 0) + (item.count || 0);
                    console.log(`Recruitment Complete: ${item.name}`);
                }
            }
            state.queue.shift();
        }
    }

    // 5. Process Missions
    if (state.missions && state.missions.length > 0) {
        // ... existing mission logic ...
    }

    // 6. Process Active Spies
    if (state.activeSpies && state.activeSpies.length > 0) {
        for (let i = state.activeSpies.length - 1; i >= 0; i--) {
            const spy = state.activeSpies[i];
            spy.ticksRemaining -= (seconds || 1);
            
            // Chance of detection/death per tick
            // Base 1% chance per tick to be caught, reduced by spy depth (deeper = riskier)
            const riskFactor = spy.depth === 'FULL' ? 0.02 : (spy.depth === 'STANDARD' ? 0.01 : 0.005);
            if (Math.random() < riskFactor) {
                console.log(`Spy from ${spy.ownerId} was caught and killed in ${state.name}`);
                if (typeof ctx.onSpyCaught === 'function') {
                    ctx.onSpyCaught(spy, state);
                }
                state.activeSpies.splice(i, 1);
                continue;
            }

            if (spy.ticksRemaining <= 0) {
                console.log(`Spy from ${spy.ownerId} has finished their mission in ${state.name}`);
                state.activeSpies.splice(i, 1);
            }
        }
    }

    // Ensure housing capacity tracks all housing buildings
    try {
        let totalHousing = 0;
        Object.entries(state.buildings).forEach(([id, lvl]) => {
            if (lvl <= 0) return;
            const cfg = BUILDING_CONFIG[id];
            if (!cfg) return;

            if (Array.isArray(cfg.housingByLevel) && cfg.housingByLevel.length > 0) {
                totalHousing += cfg.housingByLevel[Math.min(lvl, cfg.housingByLevel.length - 1)];
            } else if (typeof cfg.housingBase !== 'undefined' && typeof cfg.housingPerLevel !== 'undefined') {
                totalHousing += cfg.housingBase + (lvl * cfg.housingPerLevel);
            } else if (cfg.baseOutput && cfg.baseOutput.populationCap) {
                // Fallback for buildings that just have a flat populationCap in baseOutput
                // We assume it scales linearly or is a flat bonus
                totalHousing += cfg.baseOutput.populationCap * lvl;
            }
        });
        if (totalHousing > 0) {
            state.housingCapacity = totalHousing;
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

    // Resource changes are no longer logged here to keep server output concise.

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

    // Enforce Queue Limit: Max 3 items in the building queue (including active)
    const buildingQueue = (state.queue || []).filter(it => it.type === 'Building');
    if (buildingQueue.length >= 3) {
        return { success: false, message: "Building queue is full (max 3)" };
    }

    const currentLevel = state.buildings[buildingId] || 0;
    const cost = calculateUpgradeCost(buildingId, currentLevel);

    // Idempotency: if this building is already queued for construction, treat as success
    // to avoid double-deducting resources when the client accidentally submits twice.
    try {
        if (Array.isArray(state.queue) && state.queue.some(q => q.type === 'Building' && q.id === buildingId)) {
            return { success: true, message: 'Already queued' };
        }
    } catch (e) { /* ignore and continue */ }

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
