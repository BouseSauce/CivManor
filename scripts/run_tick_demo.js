import { AreaState, processTick } from '../src/core/gameLoop.js';
import { BUILDING_CONFIG } from '../src/core/config/buildings.js';
import { ResourceEnum } from '../src/core/constants/enums.js';

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

    console.log('--- BEFORE ---');
    console.log('Population:', state.population, 'TownHall Lvl:', state.buildings['TownHall']);
    console.log('Resources:', JSON.stringify(state.resources, null, 2));

    // Compute capacities for display
    const computeCaps = (res) => {
      const shLevel = state.buildings['Storehouse'] || 0;
      const cfg = BUILDING_CONFIG['Storehouse'] || {};
      const base = (cfg.storageBase && cfg.storageBase[res]) || 0;
      const mult = (typeof cfg.storageMultiplier === 'number') ? cfg.storageMultiplier : 1.0;
      return Math.floor(base * Math.pow(mult, shLevel));
    };

    console.log('Capacities:', {
      Timber: computeCaps(ResourceEnum.Timber),
      Stone: computeCaps(ResourceEnum.Stone),
      Food: computeCaps(ResourceEnum.Food)
    });

    // Run one big tick of 3600 seconds (1 hour)
    processTick(state, 3600, { allowGold: true, allowOres: true });

    console.log('\n--- AFTER 1 HOUR TICK ---');
    console.log('Population:', state.population);
    console.log('Resources:', JSON.stringify(state.resources, null, 2));

  } catch (e) {
    console.error('Demo run failed:', e);
    process.exit(1);
  }
})();
