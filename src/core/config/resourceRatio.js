// Central resource ratio config used across server logic
// Interpreted as: Stone = Timber * WOOD_TO_STONE_RATIO
export const WOOD_TO_STONE_RATIO = 0.5;

// Export a helper to derive stone from timber and vice-versa
export function deriveStoneFromTimber(timber) {
    return Math.max(0, Math.floor((timber || 0) * WOOD_TO_STONE_RATIO));
}

export function deriveTimberFromStone(stone) {
    if (WOOD_TO_STONE_RATIO <= 0) return 0;
    return Math.max(0, Math.floor((stone || 0) / WOOD_TO_STONE_RATIO));
}
