import { AreaState, processTick } from '../src/core/gameLoop.js';
import { BUILDING_CONFIG } from '../src/core/config/buildings.js';
import { ResourceEnum } from '../src/core/constants/enums.js';

function fmt(n) {
  if (typeof n === 'number') return Math.round(n*100)/100;
  return n;
}

(async function main(){
  try {
    const state = new AreaState('Demo');
    // Setup demo buildings and assignments
    state.buildings['LoggingCamp'] = 3;
    state.assignments['LoggingCamp'] = 4;
    state.buildings['Farm'] = 2;
    state.assignments['Farm'] = 3;
    state.buildings['StonePit'] = 1;
    state.assignments['StonePit'] = 2;
    state.buildings['Storehouse'] = 2;
    state.buildings['TownHall'] = 2;

    // Seed some starting resources
    state.resources[ResourceEnum.Timber] = 200;
    state.resources[ResourceEnum.Stone] = 100;
    state.resources[ResourceEnum.Food] = 150;
    state.resources[ResourceEnum.Gold] = 10;

    console.log('Demo multi-tick: 24 hourly ticks (1 hour each)');
    console.log('Initial: Pop', state.population, 'TownHall L', state.buildings['TownHall']);
    const computeCaps = (res) => {
      const shLevel = state.buildings['Storehouse'] || 0;
      const cfg = BUILDING_CONFIG['Storehouse'] || {};
      const base = (cfg.storageBase && cfg.storageBase[res]) || 0;
      const mult = (typeof cfg.storageMultiplier === 'number') ? cfg.storageMultiplier : 1.0;
      return Math.floor(base * Math.pow(mult, shLevel));
    };
    console.log('Capacities: Timber', computeCaps(ResourceEnum.Timber), 'Stone', computeCaps(ResourceEnum.Stone), 'Food', computeCaps(ResourceEnum.Food));

    const hours = 24;
    for (let h = 1; h <= hours; h++) {
      const before = { ...state.resources };
      const beforePop = state.population;
      processTick(state, 3600, { allowGold: true, allowOres: true });
      const after = state.resources;
      const delta = {};
      Object.keys(after).forEach(k => { delta[k] = (after[k] || 0) - (before[k] || 0); });

      console.log(`\nHour ${h} — Pop ${state.population} (Δ ${state.population - beforePop})`);
      console.log(' + Timber', fmt(delta.Timber), ' Stone', fmt(delta.Stone), ' Food', fmt(delta.Food), ' Gold', fmt(delta.Gold));
      // Show totals (rounded)
      console.log(' Totals: Timber', fmt(after.Timber), ' Stone', fmt(after.Stone), ' Food', fmt(after.Food), ' Gold', fmt(after.Gold));

      // If any resource reached capacity, print a note
      ['Timber','Stone','Food'].forEach(r => {
        const cap = computeCaps(r);
        if (typeof cap === 'number' && after[r] >= cap) {
          console.log(`  NOTE: ${r} hit capacity (${fmt(after[r])} / ${cap})`);
        }
      });

      // If population grows significantly, mention
      if (state.population - beforePop >= 3) console.log('  Population surged this hour.');
    }

    console.log('\nDemo complete.');
  } catch (e) {
    console.error('Multi demo run failed:', e);
    process.exit(1);
  }
})();
