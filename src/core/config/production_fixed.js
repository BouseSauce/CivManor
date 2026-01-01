// Centralized production constants and multipliers
export const PRODUCTION_RATES = {
  timberPerWorkerPerSecond: 0.045, // increased by 50%
  stonePerLevelPerSecond: 0.20,    // doubled
  stonePitPerWorkerPerSecond: 0.12, // doubled
  breadPerLevelPerSecond: 0.18,
  foodPerWorkerPerSecond: 0.075,
  townHallFoodPerWorkerPerSecond: 0.035
};

// Processing (T2) rates
PRODUCTION_RATES.planksPerWorkerPerSecond = 0.005;
PRODUCTION_RATES.ingotPerWorkerPerSecond = 0.002;
PRODUCTION_RATES.coalPerWorkerPerSecond = 0.01;
PRODUCTION_RATES.steelPerWorkerPerSecond = 0.001;
PRODUCTION_RATES.knowledgePerWorkerPerSecond = 0.1;
PRODUCTION_RATES.intelPerWorkerPerSecond = 0.05;
PRODUCTION_RATES.militaryIntelPerWorkerPerSecond = 0.02;

// Compounding growth per level: each level multiplies previous output by 1.2
export const PRODUCTION_GROWTH = 1.2;
export const WORKER_EXP = 0.9;

import { WORLD_CONFIG } from './worlds.js';
export const PRODUCTION_GLOBAL_MULTIPLIER = (WORLD_CONFIG && typeof WORLD_CONFIG.economySpeed === 'number') ? WORLD_CONFIG.economySpeed : ((typeof process !== 'undefined' && process.env.PROD_MULT) ? Number(process.env.PROD_MULT) : 5.0);
