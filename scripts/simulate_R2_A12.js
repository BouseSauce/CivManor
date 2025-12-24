import fs from 'fs';
import path from 'path';

// We'll dynamically import the gameLoop module after suppressing console logs
let AreaState, processTick;

const SAVE_PATH = path.resolve('./data/game_save.json');
const AREA_ID = 'R2:A12';

function cloneObj(o) { return JSON.parse(JSON.stringify(o)); }

(async function main(){
  // Suppress logs during module import to avoid side-effect noise
  const _oldLog = console.log;
  try {
    console.log = () => {};
    const gm = await import('../src/core/gameLoop.js');
    AreaState = gm.AreaState;
    processTick = gm.processTick;
  } finally {
    console.log = _oldLog;
  }

  const raw = fs.readFileSync(SAVE_PATH, 'utf8');
  const save = JSON.parse(raw);
  const areaObj = save.areaStates && save.areaStates[AREA_ID];
  if (!areaObj) {
    console.error('Area not found in save:', AREA_ID);
    process.exit(2);
  }

  const state = new AreaState(AREA_ID);
  // copy basic fields
  state.name = areaObj.name || AREA_ID;
  state.tickCount = areaObj.tickCount || 0;
  state.population = (typeof areaObj.population === 'number') ? areaObj.population : state.population;
  state.housingCapacity = areaObj.housingCapacity || state.housingCapacity;
  state.taxRate = (typeof areaObj.taxRate === 'number') ? areaObj.taxRate : state.taxRate;
  state.approval = (typeof areaObj.approval === 'number') ? areaObj.approval : state.approval;
  state.hasFirewood = (typeof areaObj.hasFirewood === 'boolean') ? areaObj.hasFirewood : state.hasFirewood;

  // copy buildings, units, assignments, resources, queue, idleReasons
  state.buildings = cloneObj(areaObj.buildings || {});
  state.units = cloneObj(areaObj.units || {});
  state.assignments = cloneObj(areaObj.assignments || {});
  state.resources = cloneObj(areaObj.resources || state.resources);
  state.queue = cloneObj(areaObj.queue || []);
  state.idleReasons = cloneObj(areaObj.idleReasons || {});

  // Ensure Villager unit sync
  if (state.units && typeof state.units.Villager === 'undefined' && typeof state.units.Villager === 'undefined') {
    // fallback: try 'Villager' key exists in save
  }

  const results = [];

  console.log('Starting snapshot for', AREA_ID);
  console.log(JSON.stringify({ hour: 0, resources: state.resources }, null, 2));

  for (let h = 1; h <= 12; h++) {
    // suppress noisy logs produced by processTick
    const _oldLog = console.log;
    try { console.log = () => {}; processTick(state, 3600, { allowGold: true, allowOres: true }); } finally { console.log = _oldLog; }
    // take a shallow copy of numeric resources
    const r = {};
    Object.entries(state.resources || {}).forEach(([k,v]) => { r[k] = (typeof v === 'number') ? Math.round(v*1000000)/1000000 : v; });
    results.push({ hour: h, resources: r, idleReasons: state.idleReasons || {} });
    console.log(`\n--- After ${h} hour(s) ---`);
    console.log(JSON.stringify({ hour: h, resources: r, idleReasons: state.idleReasons || {} }, null, 2));
  }

  // write results to file for later inspection
  const outPath = path.resolve('./data/sim_R2_A12_projection.json');
  fs.writeFileSync(outPath, JSON.stringify({ area: AREA_ID, generatedAt: new Date().toISOString(), results }, null, 2));
  console.log('\nSaved simulation results to', outPath);
})();
