import { AreaState, processTick } from '../src/core/gameLoop.js';
import { BUILDING_CONFIG } from '../src/core/config/buildings.js';
import { ResourceEnum, UnitTypeEnum } from '../src/core/constants/enums.js';

function computeMaxWorkers(cfg, level) {
  if (!cfg) return Math.max(1, Math.floor(3 + (level * 1.5)));
  if (cfg.workerCapacity) return cfg.workerCapacity * level;
  return Math.max(1, Math.floor(3 + (level * 1.5)));
}

function fmt(n) { return (typeof n === 'number') ? Math.round(n*100)/100 : n; }

(async function main(){
  const state = new AreaState('AssignDemo');
  // Give a larger population for assignment
  state.population = 80;
  state.units[UnitTypeEnum.Villager] = 80;

  // Building levels
  state.buildings['Farm'] = 4;
  state.buildings['LoggingCamp'] = 4;
  state.buildings['StonePit'] = 3;
  state.buildings['DeepMine'] = 2;
  state.buildings['Storehouse'] = 2; // storage
  state.buildings['TownHall'] = 2;

  // Starting resources
  state.resources[ResourceEnum.Timber] = 300;
  state.resources[ResourceEnum.Stone] = 200;
  state.resources[ResourceEnum.Food] = 400;
  state.resources[ResourceEnum.Gold] = 5;

  // Assign villagers by priority until we run out or reach max per building
  const order = ['Farm','LoggingCamp','StonePit','DeepMine'];
  let remaining = state.units[UnitTypeEnum.Villager] || 0;
  order.forEach(bid => {
    const lvl = state.buildings[bid] || 0;
    const cfg = BUILDING_CONFIG[bid];
    const max = computeMaxWorkers(cfg, lvl);
    const take = Math.min(max, remaining);
    if (take > 0) state.assignments[bid] = take;
    remaining -= take;
  });

  // Print assignment and capacities
  console.log('--- BEFORE 1 HOUR TICK ---');
  console.log('Population:', state.population, 'Villagers:', state.units[UnitTypeEnum.Villager]);
  console.log('Assignments:', JSON.stringify(state.assignments, null, 2));
  console.log('Resources before:', JSON.stringify({ Timber: state.resources.Timber, Stone: state.resources.Stone, Food: state.resources.Food, Gold: state.resources.Gold }, null, 2));

  const computeCap = (res) => {
    const shLevel = state.buildings['Storehouse'] || 0;
    const shCfg = (BUILDING_CONFIG['Storehouse'] || {});
    const base = (shCfg.storageBase && shCfg.storageBase[res]) || 0;
    const mult = (typeof shCfg.storageMultiplier === 'number') ? shCfg.storageMultiplier : 1.0;
    return Math.floor(base * Math.pow(mult, shLevel));
  };
  console.log('Capacities: Timber', computeCap(ResourceEnum.Timber), 'Stone', computeCap(ResourceEnum.Stone), 'Food', computeCap(ResourceEnum.Food));

  // Run one hour
  processTick(state, 3600, { allowGold: true, allowOres: true });

  console.log('\n--- AFTER 1 HOUR TICK ---');
  console.log('Population:', state.population);
  console.log('Resources after:', JSON.stringify({ Timber: fmt(state.resources.Timber), Stone: fmt(state.resources.Stone), Food: fmt(state.resources.Food), Gold: fmt(state.resources.Gold) }, null, 2));

  console.log('\nDeltas:', JSON.stringify({ Timber: fmt(state.resources.Timber - 300), Stone: fmt(state.resources.Stone - 200), Food: fmt(state.resources.Food - 400), Gold: fmt(state.resources.Gold - 5) }, null, 2));

})();
