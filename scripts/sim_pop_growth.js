import { processPopulationTick } from '../src/core/logic/economy.js';
import { WORLD_CONFIG } from '../src/core/config/worlds.js';
import { ResourceEnum } from '../src/core/constants/enums.js';

const initialPop = 10;
const approval = 60; // percent
const townHallLevel = 1;
const tenementLevel = 0;
const captives = 0;

const tickMs = (WORLD_CONFIG && WORLD_CONFIG.tickMs) ? WORLD_CONFIG.tickMs : 60000;
const secondsPerTick = tickMs / 1000;
const totalSeconds = 3600; // 1 hour
const ticks = Math.floor(totalSeconds / secondsPerTick);

// generous food to avoid starvation
const foodStocks = {
  [ResourceEnum.Food]: 100000,
  [ResourceEnum.Fish]: 0,
  [ResourceEnum.Bread]: 0
};

let pop = initialPop;
const stateObj = {}; // will be used to carry _popGrowRemainder

console.log(`Simulating population for 1 hour: starting pop=${initialPop}, approval=${approval}%, tick=${secondsPerTick}s, ticks=${ticks}`);
console.log('Tick,Pop,ConsumedFood(Food),GrowthRemainder,NewPop');

for (let t = 1; t <= ticks; t++) {
  const res = processPopulationTick(pop, foodStocks, approval, townHallLevel, tenementLevel, captives, secondsPerTick, stateObj);
  // apply consumedFood to foodStocks
  for (const [k, v] of Object.entries(res.consumedFood || {})) {
    foodStocks[k] = Math.max(0, (foodStocks[k] || 0) - v);
  }
  // print tick summary
  const remainder = stateObj._popGrowRemainder || 0;
  console.log(`${t},${pop},${Math.floor(res.consumedFood[ResourceEnum.Food] || 0)},${remainder.toFixed(6)},${res.newPop}`);
  pop = res.newPop;
}

console.log(`Final pop after 1 hour: ${pop}`);
console.log(`Final _popGrowRemainder: ${ (stateObj._popGrowRemainder||0).toFixed(6) }`);
