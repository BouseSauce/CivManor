// World configuration - defines per-world pacing and rules.
export const WORLD_CONFIG = {
  // Economy speed: multiplies resource production and building speed.
  // Example: 2.0 => production x2
  economySpeed: 2.0,

  // Army speed: multiplies unit travel speed. (1 = normal)
  armySpeed: 1.0,

  // Research speed: multiplies how fast Knowledge is generated / research completes.
  // 1.0 = normal, >1 faster, <1 slower.
  researchSpeed: 1.0,

  // Tick interval for this world in milliseconds.
  // Default: 60000 (1 tick per minute). Can be reduced for faster testing.
  // Lowered for local smoke tests to speed up mission completion (revert for production).
  tickMs: 1000,

  // Debris field percent: percent of loot/debris left after combat (0.3 = 30%)
  debrisFieldPercent: 0.30,

  // Tool requirement preset (string key for any game logic referencing tool presets)
  toolRequirement: 'Standard',

  // New players protection threshold: players under this total points cannot be attacked.
  protectionPoints: 500
};

export default WORLD_CONFIG;

