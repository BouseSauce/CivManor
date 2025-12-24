const fs = require('fs');
const path = require('path');
const SAVE = path.resolve('./data/game_save.json');
const areaId = 'R2:A12';
const raw = fs.readFileSync(SAVE,'utf8');
const save = JSON.parse(raw);
const area = save.areaStates[areaId];
if (!area) { console.error('Area not found', areaId); process.exit(2); }
const buildings = area.buildings || {};
const assignments = area.assignments || {};
let timber = area.resources.Timber || 0;
const loggingLevel = buildings['LoggingCamp'] || 0;
const loggingAssigned = assignments['LoggingCamp'] || 0;
const PRODUCTION_RATES = { timberPerWorkerPerSecond: 0.045 };
const PRODUCTION_GROWTH = 1.2;
const WORKER_EXP = 0.9;
const GLOBAL_MULT = 2.0;
const storeBaseTimber = 2500;
const storeMult = 1.15;
const storeLevel = buildings['Storehouse'] || 0;
const capacity = Math.floor(storeBaseTimber * Math.pow(storeMult, storeLevel));

function getOutputPerHour(baseRate, level, workers) {
  if (!baseRate || level <= 0 || workers <= 0) return 0;
  const workerFactor = Math.pow(Math.max(1, workers), WORKER_EXP);
  const levelMultiplier = Math.pow(PRODUCTION_GROWTH, Math.max(0, level - 1));
  return baseRate * workerFactor * levelMultiplier * 3600 * GLOBAL_MULT;
}

console.log('Starting Timber:', timber);
console.log('Store capacity (Timber):', capacity);
console.log('LoggingCamp level:', loggingLevel, 'assigned:', loggingAssigned);

const perHour = getOutputPerHour(PRODUCTION_RATES.timberPerWorkerPerSecond, loggingLevel, loggingAssigned);
console.log('Raw timber production per hour (no cap):', perHour);

for (let h=1; h<=12; h++) {
  if (timber < capacity) {
    const space = Math.max(0, capacity - timber);
    const add = Math.min(perHour, space);
    timber = timber + add;
  }
  // else timber stays at capacity
  console.log(`Hour ${h}: Timber = ${Math.round(timber*1000000)/1000000}`);
}
