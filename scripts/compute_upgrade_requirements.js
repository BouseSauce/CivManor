import { BUILDING_CONFIG } from '../src/core/config/buildings.js';
import { calculateUpgradeCost, calculateBuildTime } from '../src/core/logic/scaling.js';
import { ResourceEnum } from '../src/core/constants/enums.js';
import { AreaState, processTick } from '../src/core/gameLoop.js';

function addCosts(acc, cost) {
  Object.entries(cost || {}).forEach(([res, amt]) => {
    acc[res] = (acc[res] || 0) + amt;
  });
}

function fmt(n) { return typeof n === 'number' ? Math.round(n*100)/100 : n; }

(async function main(){
  // Target level
  const TARGET = 5;
  const buildings = Object.keys(BUILDING_CONFIG);

  const totalCosts = {};
  let totalTimeSeconds = 0;

  buildings.forEach(bid => {
    let cur = 0; // assume starting at level 0
    for (let L = cur; L < TARGET; L++) {
      const cost = calculateUpgradeCost(bid, L);
      addCosts(totalCosts, cost);
      const t = calculateBuildTime(bid, L);
      totalTimeSeconds += t;
    }
  });

  console.log('=== Upgrade requirements to bring ALL buildings to level', TARGET, '===');
  console.log('Total build time (seconds):', totalTimeSeconds, ' (hours:', (totalTimeSeconds/3600).toFixed(2), ')');
  console.log('Total resource costs:');
  Object.entries(totalCosts).forEach(([r,v]) => console.log(' -', r, ':', fmt(v)));

  // Now simulate one hour production with a reasonable assignment setup
  const state = new AreaState('UpgradeDemandDemo');
  // give many villagers and some starting buildings to produce
  state.population = 80;
  state.units['Villager'] = 80;
  state.buildings['Farm'] = 4; state.assignments['Farm'] = 9;
  state.buildings['LoggingCamp'] = 4; state.assignments['LoggingCamp'] = 9;
  state.buildings['StonePit'] = 3; state.assignments['StonePit'] = 7;
  state.buildings['Bloomery'] = 2; state.assignments['Bloomery'] = 6;
  state.buildings['Storehouse'] = 3; state.buildings['TownHall'] = 3;

  // baseline resources
  state.resources[ResourceEnum.Timber] = 1000;
  state.resources[ResourceEnum.Stone] = 800;
  state.resources[ResourceEnum.Food] = 1200;
  state.resources[ResourceEnum.Gold] = 50;

  console.log('\nSimulating 1 hour production with assigned villagers...');
  console.log('Before:', JSON.stringify({ Timber: state.resources.Timber, Stone: state.resources.Stone, Food: state.resources.Food, Gold: state.resources.Gold }));
  processTick(state, 3600, { allowGold: true, allowOres: true });
  console.log('After:', JSON.stringify({ Timber: fmt(state.resources.Timber), Stone: fmt(state.resources.Stone), Food: fmt(state.resources.Food), Gold: fmt(state.resources.Gold) }));

  // Compare produced delta to required totals
  const produced = {
    Timber: (state.resources.Timber - 1000),
    Stone: (state.resources.Stone - 800),
    Food: (state.resources.Food - 1200),
    Gold: (state.resources.Gold - 50)
  };

  console.log('\nProduced in 1 hour (delta):', JSON.stringify({ Timber: fmt(produced.Timber), Stone: fmt(produced.Stone), Food: fmt(produced.Food), Gold: fmt(produced.Gold) }));

  console.log('\nWhat percent of total upgrade costs does one hour production cover?');
  Object.entries(totalCosts).forEach(([r,need]) => {
    const p = produced[r] ? (produced[r] / need) * 100 : 0;
    console.log(` - ${r}: ${(p || 0).toFixed(3)}%`);
  });

})();
