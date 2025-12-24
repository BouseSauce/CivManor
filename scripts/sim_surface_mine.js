const PR = require('../src/core/config/production_fixed.js');
const WORLD = require('../src/core/config/worlds.js');

const rates = PR.PRODUCTION_RATES;
const GROW = PR.PRODUCTION_GROWTH;
const EXP = PR.WORKER_EXP;
const MUL = (WORLD.WORLD_CONFIG && WORLD.WORLD_CONFIG.economySpeed) ? WORLD.WORLD_CONFIG.economySpeed : PR.PRODUCTION_GLOBAL_MULTIPLIER;
const tickMs = (WORLD.WORLD_CONFIG && WORLD.WORLD_CONFIG.tickMs) ? WORLD.WORLD_CONFIG.tickMs : 60000;

const level = 3;
const assigned = 6;
const base = rates.stonePitPerWorkerPerSecond;

const workerFactor = Math.pow(Math.max(1, assigned), EXP);
const levelMul = Math.pow(GROW, Math.max(0, level - 1));
const perSec = base * workerFactor * levelMul * MUL;
const perHour = perSec * 3600;
const perTick = perSec * (tickMs / 1000);
const ticksPerHour = 3600000 / tickMs;

console.log('Simulation: Surface Mine (level', level, ', assigned', assigned + ')');
console.log('WORLD tickMs:', tickMs, 'economySpeed:', MUL);
console.log('basePerSecond:', base);
console.log('workerFactor:', workerFactor.toFixed(6), 'levelMul:', levelMul.toFixed(6));
console.log('perSecond:', perSec.toFixed(6));
console.log('perTick (per world tick):', perTick.toFixed(6));
console.log('ticksPerHour:', ticksPerHour);
console.log('perHour (total over 1 hour):', perHour.toFixed(6));

// also show integer-rounded applied amounts if the server were to clamp per-tick to ints
console.log('perHour (rounded):', Math.round(perHour));
console.log('perTick (rounded):', Math.round(perTick));
