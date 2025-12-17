export const PRODUCTION_RATES = {
  // Per-worker or per-level base rates (per second)
  timberPerWorkerPerSecond: 0.02,
  stonePerLevelPerSecond: 0.05,
  stonePitPerWorkerPerSecond: 0.02,
  breadPerLevelPerSecond: 0.12,
  foodPerWorkerPerSecond: 0.05,
  hidesPerWorkerPerSecond: 0.03
};

// Growth factor used by production scaling (if shared logic required)
export const PRODUCTION_GROWTH = 1.15;

// Worker exponent to apply diminishing returns on multiple workers
export const WORKER_EXP = 0.9;
 
// Global production multiplier to tune overall yields for pacing/balance.
export const PRODUCTION_GLOBAL_MULTIPLIER = typeof process !== 'undefined' && process.env.PROD_MULT ? Number(process.env.PROD_MULT) : 1.0;
