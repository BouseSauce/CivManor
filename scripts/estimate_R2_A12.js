import fs from 'fs';
import path from 'path';
import { BUILDING_CONFIG, computeProcessingOutput } from '../src/core/config/buildings.js';
import { PRODUCTION_RATES, PRODUCTION_GROWTH, WORKER_EXP, PRODUCTION_GLOBAL_MULTIPLIER } from '../src/core/config/production_fixed.js';

const SAVE_PATH = path.resolve('./data/game_save.json');
const AREA_ID = 'R2:A12';

function getOutput(baseRate, level, workers, seconds = 3600) {
  if (!baseRate || level <= 0 || workers <= 0) return 0;
  const workerFactor = Math.pow(Math.max(1, workers), WORKER_EXP || 1);
  const levelMultiplier = Math.pow(PRODUCTION_GROWTH || 1, Math.max(0, level - 1));
  const mul = (PRODUCTION_GLOBAL_MULTIPLIER || 1);
  return baseRate * workerFactor * levelMultiplier * seconds * mul;
}

function computeStoreCapacity(storeLevel, res) {
  const cfg = BUILDING_CONFIG['Storehouse'] || {};
  const base = (cfg.storageBase && cfg.storageBase[res]) || 0;
  const mult = (typeof cfg.storageMultiplier === 'number') ? cfg.storageMultiplier : 1.0;
  return Math.floor(base * Math.pow(mult, storeLevel));
}

(function main(){
  const raw = fs.readFileSync(SAVE_PATH, 'utf8');
  const save = JSON.parse(raw);
  const area = save.areaStates && save.areaStates[AREA_ID];
  if (!area) { console.error('Area not found', AREA_ID); process.exit(2); }

  const buildings = area.buildings || {};
  const assignments = area.assignments || {};
  const resources = Object.assign({}, area.resources || {});

  const storeLevel = buildings['Storehouse'] || 0;

  console.log('Starting resources snapshot for', AREA_ID);
  console.log(JSON.stringify(resources, null, 2));

  const hours = [];
  for (let h=1; h<=12; h++) {
    const deltas = {};

    // LoggingCamp -> Timber
    const lcLevel = buildings['LoggingCamp'] || 0;
    const lcAssigned = assignments['LoggingCamp'] || 0;
    if (lcLevel>0 && lcAssigned>0) {
      const amt = getOutput(PRODUCTION_RATES.timberPerWorkerPerSecond, lcLevel, lcAssigned);
      deltas['Timber'] = (deltas['Timber']||0) + amt;
    }

    // SurfaceMine -> Stone
    const smLevel = buildings['SurfaceMine'] || 0;
    const smAssigned = assignments['SurfaceMine'] || 0;
    if (smLevel>0 && smAssigned>0) {
      const base = PRODUCTION_RATES.stonePitPerWorkerPerSecond || 0.1;
      const amt = getOutput(base, smLevel, smAssigned);
      deltas['Stone'] = (deltas['Stone']||0) + amt;
    }

    // Sawpit -> Planks (consumes Timber)
    const spLevel = buildings['Sawpit'] || 0;
    const spAssigned = assignments['Sawpit'] || 0;
    if (spLevel>0 && spAssigned>0) {
      const potentialPlanks = getOutput(PRODUCTION_RATES.planksPerWorkerPerSecond, spLevel, spAssigned);
      const availableTimber = resources['Timber'] || 0;
      const maxByInput = computeProcessingOutput(availableTimber, 4.0, spLevel);
      const planksProduced = Math.min(potentialPlanks, maxByInput);
      const timberConsumed = planksProduced * 4.0;
      if (planksProduced>0) {
        deltas['Timber'] = (deltas['Timber']||0) - timberConsumed;
        deltas['Planks'] = (deltas['Planks']||0) + planksProduced;
      }
    }

    // Farmhouse -> Bread (per level)
    const fhLevel = buildings['Farmhouse'] || 0;
    if (fhLevel>0) {
      const amt = getOutput(PRODUCTION_RATES.breadPerLevelPerSecond, fhLevel, 1);
      deltas['Bread'] = (deltas['Bread']||0) + amt;
    }

    // Farm -> Food
    const fLevel = buildings['Farm'] || 0;
    const fAssigned = assignments['Farm'] || 0;
    if (fLevel>0 && fAssigned>0) {
      const amt = getOutput(PRODUCTION_RATES.foodPerWorkerPerSecond, fLevel, fAssigned);
      deltas['Food'] = (deltas['Food']||0) + amt;
      if (fLevel>=5) {
        const hAmt = getOutput(PRODUCTION_RATES.hidesPerWorkerPerSecond, fLevel, fAssigned);
        deltas['Hides'] = (deltas['Hides']||0) + hAmt;
      }
    }

    // Charcoal Kiln -> Coal (consumes Timber)
    const ckLevel = buildings['CharcoalKiln'] || 0;
    const ckAssigned = assignments['CharcoalKiln'] || 0;
    if (ckLevel>0 && ckAssigned>0) {
      const potentialCoal = getOutput(PRODUCTION_RATES.coalPerWorkerPerSecond, ckLevel, ckAssigned);
      const availableTimber = resources['Timber'] || 0;
      const maxByInput = computeProcessingOutput(availableTimber, 3.0, ckLevel);
      const coalProduced = Math.min(potentialCoal, maxByInput);
      const timberConsumed = coalProduced * 3.0;
      if (coalProduced>0) {
        deltas['Timber'] = (deltas['Timber']||0) - timberConsumed;
        deltas['Coal'] = (deltas['Coal']||0) + coalProduced;
      }
    }

    // Bloomery -> IronIngot (consumes IronOre & Timber)
    const blLevel = buildings['Bloomery'] || 0;
    const blAssigned = assignments['Bloomery'] || 0;
    if (blLevel>0 && blAssigned>0) {
      const potentialIngots = getOutput(PRODUCTION_RATES.ingotPerWorkerPerSecond, blLevel, blAssigned);
      const availableOre = resources['IronOre'] || 0;
      const availableTimber2 = resources['Timber'] || 0;
      const maxByOre = computeProcessingOutput(availableOre, 5.0, blLevel);
      const maxByTimber = computeProcessingOutput(availableTimber2, 2.0, blLevel);
      const ingotsProduced = Math.min(potentialIngots, maxByOre, maxByTimber);
      if (ingotsProduced>0) {
        deltas['IronOre'] = (deltas['IronOre']||0) - ingotsProduced*5.0;
        deltas['Timber'] = (deltas['Timber']||0) - ingotsProduced*2.0;
        deltas['IronIngot'] = (deltas['IronIngot']||0) + ingotsProduced;
      }
    }

    // Apply deltas subject to storage caps
    Object.entries(deltas).forEach(([k,v]) => {
      const cap = computeStoreCapacity(storeLevel, k);
      const cur = resources[k] || 0;
      if (typeof cap === 'number' && cap >= 0) {
        const space = Math.max(0, cap - cur);
        const add = Math.max(-Infinity, v);
        // If v positive, limit by space
        if (v > 0) {
          const actualAdd = Math.min(v, space);
          resources[k] = cur + actualAdd;
        } else {
          resources[k] = cur + v; // allow consumption beyond 0 (will clamp later)
        }
      } else {
        resources[k] = cur + v;
      }
      // clamp negatives to 0
      if (resources[k] < 0) resources[k] = 0;
    });

    // Save snapshot
    const snap = {};
    Object.keys(resources).forEach(k => { if (typeof resources[k] === 'number') snap[k] = Math.round(resources[k]*1000000)/1000000; });
    hours.push({ hour: h, resources: snap });
    console.log(`After ${h} hour(s):`);
    console.log(JSON.stringify(snap, null, 2));
  }

  const out = path.resolve('./data/estimate_R2_A12.json');
  fs.writeFileSync(out, JSON.stringify({ area: AREA_ID, generatedAt: new Date().toISOString(), hours }, null, 2));
  console.log('Wrote estimate to', out);
})();
