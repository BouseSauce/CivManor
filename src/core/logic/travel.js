/**
 * Calculates travel time based on Region and Area coordinates.
 * Format: R{regionId}:A{areaId} (e.g., R1:A15)
 * 
 * Logic:
 * - Same Region (R1:A1 -> R1:A5): Linear distance between Areas.
 * - Different Region (R1:A1 -> R2:A1): Must traverse the entire land mass of the origin Region.
 * 
 * @param {string} origin - "R1:A1"
 * @param {string} destination - "R2:A1"
 * @param {number} speedMultiplier - Unit speed (1 = standard)
 * @returns {number} - Time in ticks
 */
import { WORLD_CONFIG } from '../config/worlds.js';

export function calculateTravelTime(origin, destination, speedMultiplier) {
    speedMultiplier = (typeof speedMultiplier !== 'undefined' && speedMultiplier !== null) ? speedMultiplier : (WORLD_CONFIG && WORLD_CONFIG.armySpeed) || 1;
    const parseCoord = (coord) => {
        const [rPart, aPart] = coord.split(':');
        const r = parseInt(rPart.replace('R', ''), 10);
        const a = parseInt(aPart.replace('A', ''), 10);
        return { r, a };
    };

    const start = parseCoord(origin);
    const end = parseCoord(destination);

    // Base times in ticks (assuming 1 tick = 1 game second)
    const BASE_TIME_PER_AREA = 600; // 10 Minutes (600s) per area index
    const REGION_TRAVERSAL_PENALTY = 7200; // 2 hours (7200s) to cross a region

    let totalBaseTime = 0;

    if (start.r === end.r) {
        // Same Region: Distance is difference in Area index
        const distance = Math.abs(start.a - end.a);
        totalBaseTime = distance * BASE_TIME_PER_AREA;
    } else {
        // Different Region
        // Logic: "travel across the land mass of the entire region of R1"
        // We assume this is a fixed penalty or max distance calculation.
        // Using the fixed penalty as interpreted from "entire region".
        totalBaseTime = REGION_TRAVERSAL_PENALTY;
        
        // Plus distance to target in new region? 
        // Prompt says "travel across the land mass of the entire region of R1".
        // It implies the cost is primarily the region traversal. 
        // Let's add the destination area distance from "entry point" (A1) as a refinement, 
        // or just keep it simple as requested.
        // "going from R1:A1 to R2:A1 will cause the unit to travel across the land mass of the entire region of R1"
        // This implies the cost is R1 traversal.
    }

    return Math.ceil(totalBaseTime / speedMultiplier);
}
