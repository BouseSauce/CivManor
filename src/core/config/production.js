export const PRODUCTION_RATES = {
  // Per-worker or per-level base rates (per second)
  timberPerWorkerPerSecond: 0.02,
  stonePerLevelPerSecond: 0.05,
  stonePitPerWorkerPerSecond: 0.02,
  breadPerLevelPerSecond: 0.12,
  foodPerWorkerPerSecond: 0.05,
  townHallFoodPerWorkerPerSecond: 0.025,
  hidesPerWorkerPerSecond: 0.03
};

// Processing rates for T2 conversions (per-worker base outputs per second)
PRODUCTION_RATES.planksPerWorkerPerSecond = 0.005; // ~18 planks/hr per worker base
PRODUCTION_RATES.ingotPerWorkerPerSecond = 0.002;  // ~7.2 ingots/hr per worker base
PRODUCTION_RATES.coalPerWorkerPerSecond = 0.01;    // ~36 coal/hr per worker base
PRODUCTION_RATES.steelPerWorkerPerSecond = 0.001;  // ~3.6 steel/hr per worker base

// Growth factor used by production scaling (if shared logic required)
export const PRODUCTION_GROWTH = 1.15;

// Worker exponent to apply diminishing returns on multiple workers
export const WORKER_EXP = 0.9;
 
// Global production multiplier to tune overall yields for pacing/balance.
import { WORLD_CONFIG } from './worlds.js';
export const PRODUCTION_GLOBAL_MULTIPLIER = (WORLD_CONFIG && typeof WORLD_CONFIG.economySpeed === 'number') ? WORLD_CONFIG.economySpeed : ((typeof process !== 'undefined' && process.env.PROD_MULT) ? Number(process.env.PROD_MULT) : 1.0);
