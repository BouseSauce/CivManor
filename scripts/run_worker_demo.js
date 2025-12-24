import { AreaState, processTick } from '../src/core/gameLoop.js';
import { ResourceEnum } from '../src/core/constants/enums.js';

function snapshot(state) {
  return {
    pop: state.population,
    timber: Math.round(state.resources.Timber*100)/100,
    stone: Math.round(state.resources.Stone*100)/100,
    food: Math.round(state.resources.Food*100)/100
  };
}

(async function main(){
  const scenarios = [
    { name: 'Many workers on 1 building', setup: (s) => { s.buildings['Farm'] = 5; s.assignments['Farm'] = 20; s.buildings['Storehouse'] = 3; } },
    { name: 'Spread workers across 4 buildings', setup: (s) => { s.buildings['Farm'] = 5; s.assignments['Farm'] = 5; s.buildings['Farmhouse'] = 1; s.assignments['Farmhouse'] = 5; s.buildings['LoggingCamp'] = 3; s.assignments['LoggingCamp'] = 5; s.buildings['StonePit'] = 3; s.assignments['StonePit'] = 5; s.buildings['Storehouse'] = 3; } }
  ];

  for (const sc of scenarios) {
    const state = new AreaState('Demo');
    state.resources[ResourceEnum.Timber] = 100;
    state.resources[ResourceEnum.Stone] = 50;
    state.resources[ResourceEnum.Food] = 200;
    state.buildings['TownHall'] = 2;
    sc.setup(state);

    console.log('\nScenario:', sc.name);
    console.log('Before:', snapshot(state));
    processTick(state, 3600, { allowGold: true, allowOres: true });
    console.log('After 1h:', snapshot(state));
  }
})();
