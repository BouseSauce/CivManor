import { AreaState, processTick } from '../src/core/gameLoop.js';
import { BUILDING_CONFIG, computeTotalLevelCost } from '../src/core/config/buildings.js';
import { UnitTypeEnum } from '../src/core/constants/enums.js';

function canAfford(cost, resources) {
  for (const k of Object.keys(cost || {})) {
    const need = cost[k] || 0;
    const have = resources[k] || 0;
    if (have < need) return false;
  }
  return true;
}

function deduct(cost, resources) {
  Object.keys(cost || {}).forEach(k => {
    resources[k] = (resources[k] || 0) - (cost[k] || 0);
  });
}

function autoUpgradeOnce(state) {
  // Priority: production buildings first
  const priority = Object.keys(BUILDING_CONFIG).sort((a,b) => {
    const pa = BUILDING_CONFIG[a].workforceCap || 0;
    const pb = BUILDING_CONFIG[b].workforceCap || 0;
    return pb - pa; // larger workforce first
  });

  for (const k of priority) {
    const cur = Number(state.buildings[k] || 0);
    const next = cur + 1;
    const cost = computeTotalLevelCost(k, next);
    if (!cost) continue;
    if (canAfford(cost, state.resources)) {
      deduct(cost, state.resources);
      state.buildings[k] = next;
      state.idleReasons = state.idleReasons || {};
      console.log(`Upgraded ${k} to level ${next} at cost ${JSON.stringify(cost)}`);
      return true; // one upgrade per call
    }
  }
  return false;
}

function assignWorkers(state) {
  let remaining = state.units[UnitTypeEnum.Villager] || state.population || 0;
  state.assignments = {};
  Object.entries(BUILDING_CONFIG).forEach(([k,cfg]) => {
    if (!cfg) return;
    const cap = Number(cfg.workforceCap || 0);
    if (cap <= 0) return;
    const level = Number(state.buildings[k] || 0);
    if (level <= 0) return; // closed
    const want = cap; // workforceCap does not scale per level in config
    const take = Math.min(remaining, want);
    if (take > 0) state.assignments[k] = take;
    remaining -= take;
  });
}

(async function() {
  try {
    const state = new AreaState('DaySim');

    // Start: only Tier-1 buildings at level 1
    Object.entries(BUILDING_CONFIG).forEach(([k,cfg]) => {
      if (cfg && Number(cfg.tier) === 1) state.buildings[k] = 1;
      else state.buildings[k] = 0;
    });

    // Ensure starting villagers from starter settings (10)
    state.population = Math.max(10, state.population || 10);
    state.units[UnitTypeEnum.Villager] = state.population;

    // Initial assignment
    assignWorkers(state);

    console.log('Simulation start:', { population: state.population, buildings: state.buildings });

    const totalSeconds = 24 * 3600;
    for (let t = 1; t <= totalSeconds; t++) {
      // Try upgrading once per minute to avoid rapid multi-upgrades
      if (t % 60 === 0) {
        // attempt repeated upgrades until none affordable this minute
        let did = false;
        do {
          did = autoUpgradeOnce(state);
        } while (did);
        // reassign workers after upgrades
        assignWorkers(state);
      }

      processTick(state, 1, { allowOres: true, allowGold: true });

      // Log hourly
      if (t % 3600 === 0) {
        const h = t / 3600;
        console.log(`Hour ${h}: Food=${(state.resources.Food||0).toFixed(2)}, Timber=${(state.resources.Timber||0).toFixed(2)}, Ore=${(state.resources.Ore||state.resources.IronOre||0).toFixed(2)}, Pop=${state.population}, Buildings=${JSON.stringify(state.buildings)}`);
      }
    }

    console.log('\n--- 24h Simulation End ---');
    console.log('Final population:', state.population);
    console.log('Final buildings:', state.buildings);
    console.log('Final resources snapshot:');
    Object.entries(state.resources).forEach(([k,v]) => { if (v && v !== 0) console.log(`  ${k}: ${Number(v).toFixed(4)}`); });
    console.log('Idle reasons:', state.idleReasons || {});
  } catch (err) {
    console.error('Simulation failed:', err);
    process.exit(1);
  }
})();
