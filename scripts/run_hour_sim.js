import { AreaState, processTick } from '../src/core/gameLoop.js';
import { BUILDING_CONFIG } from '../src/core/config/buildings.js';
import { UnitTypeEnum } from '../src/core/constants/enums.js';

(async function() {
  try {
    const state = new AreaState('HourSim');

    // Set only Tier-1 buildings to level 1 (realistic starter footprint)
    Object.entries(BUILDING_CONFIG).forEach(([k, cfg]) => {
      if (cfg && Number(cfg.tier) === 1) state.buildings[k] = 1;
      else state.buildings[k] = 0;
    });

    // Determine total workforce capacity and assign villagers to fully occupy
    let totalNeeded = 0;
    const perBuildingNeed = {};
    Object.entries(BUILDING_CONFIG).forEach(([k, cfg]) => {
      const cap = Number(cfg.workforceCap || 0);
      if (cap > 0) {
        perBuildingNeed[k] = cap;
        totalNeeded += cap;
      }
    });

    // Ensure population covers workforce; if not, grow population to match
    state.population = Math.max(10, totalNeeded);
    state.units[UnitTypeEnum.Villager] = state.population;

    // Assign workers building-by-building until we exhaust villagers
    let remaining = state.population;
    state.assignments = {};
    Object.keys(perBuildingNeed).forEach(k => {
      if (remaining <= 0) return;
      const take = Math.min(remaining, perBuildingNeed[k]);
      state.assignments[k] = take;
      remaining -= take;
    });

    console.log('Simulation start: population=', state.population, 'totalWorkerSlots=', totalNeeded);
    console.log('Initial resources:', state.resources);

    // Run 3600 one-second ticks, logging every minute
    const minutes = 60;
    for (let t = 1; t <= 3600; t++) {
      processTick(state, 1, { allowOres: true, allowGold: true });
      if (t % 60 === 0) {
        const m = t / 60;
        console.log(`Minute ${m}: Food=${(state.resources.Food||0).toFixed(2)}, Timber=${(state.resources.Timber||0).toFixed(2)}, Ore=${(state.resources.Ore||state.resources.IronOre||0).toFixed(2)}, Planks=${(state.resources.Planks||0).toFixed(2)}, IronIngot=${(state.resources.IronIngot||0).toFixed(2)}, Coal=${(state.resources.Coal||0).toFixed(2)}, Steel=${(state.resources.Steel||0).toFixed(2)}, Pop=${state.population}`);
      }
    }

    console.log('\n--- Simulation End ---');
    console.log('Final population:', state.population);
    console.log('Final resources snapshot:');
    Object.entries(state.resources).forEach(([k,v]) => {
      if (v && v !== 0) console.log(`  ${k}: ${Number(v).toFixed(4)}`);
    });
    console.log('Idle reasons:', state.idleReasons || {});
  } catch (err) {
    console.error('Simulation failed:', err);
    process.exit(1);
  }
})();
