import { WORLD_CONFIG } from './worlds.js';

// GAME_CONFIG exposes runtime UI-friendly settings. Use the world's `tickMs` as
// the single authoritative tick interval to avoid duplicated/contradictory
// values. If `WORLD_CONFIG.tickMs` is missing, fall back to 1000ms for UI polling.
export const GAME_CONFIG = {
    TICK_MS: (WORLD_CONFIG && typeof WORLD_CONFIG.tickMs === 'number') ? WORLD_CONFIG.tickMs : 1000
};
