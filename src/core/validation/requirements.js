import { ALL_RESEARCH } from '../config/research.js';
import { UNIT_CONFIG } from '../config/units.js';

/**
 * Checks if a unit or research is unlocked based on dependencies.
 * Returns { unlocked: boolean, missing: Array }
 */
export function checkRequirements(targetId, playerState) {
    // playerState should contain:
    // - techLevels: { techId: level }
    // - buildingLevels: { buildingId: level } (max across all areas)
    
    const requirements = {
        'Large Cargo Wagon': [
            { type: 'tech', id: 'Logistics', level: 8 },
            { type: 'tech', id: 'Metallurgy', level: 5 },
            { type: 'building', id: 'Sawpit', level: 5 }
        ],
        'Cargo Wagon': [
            { type: 'tech', id: 'The Wheel', level: 1 }
        ],
        'Knights': [
            { type: 'tech', id: 'Alloy Mixing', level: 5 },
            { type: 'building', id: 'Stable', level: 5 }
        ],
        'Steel Refining': [
            { type: 'tech', id: 'Metallurgy', level: 5 },
            { type: 'building', id: 'Bloomery', level: 10 }
        ],
        'Taxation': [
            { type: 'tech', id: 'Bureaucracy', level: 5 },
            { type: 'building', id: 'TownHall', level: 10 }
        ]
    };

    // Also check dynamic requirements from config if not explicitly listed above
    const targetReqs = requirements[targetId] || [];
    
    // If it's a unit, add its config requirements
    const unitCfg = UNIT_CONFIG[targetId];
    if (unitCfg) {
        if (unitCfg.requiredBuilding && !targetReqs.some(r => r.id === unitCfg.requiredBuilding)) {
            targetReqs.push({ type: 'building', id: unitCfg.requiredBuilding, level: unitCfg.requiredBuildingLevel || 1 });
        }
        if (unitCfg.requiredResearch && !targetReqs.some(r => r.id === unitCfg.requiredResearch)) {
            targetReqs.push({ type: 'tech', id: unitCfg.requiredResearch, level: unitCfg.requiredResearchLevel || 1 });
        }
    }

    // If it's a research, add its config requirements
    const techCfg = ALL_RESEARCH[targetId];
    if (techCfg && techCfg.requirement) {
        const req = techCfg.requirement;
        if (req.building && !targetReqs.some(r => r.id === req.building)) {
            targetReqs.push({ type: 'building', id: req.building, level: req.level || 1 });
        }
        if (req.tech && !targetReqs.some(r => r.id === req.tech)) {
            targetReqs.push({ type: 'tech', id: req.tech, level: req.level || 1 });
        }
    }

    const missing = targetReqs.filter(req => {
        if (req.type === 'tech') {
            const playerLevel = (playerState.techLevels && playerState.techLevels[req.id]) || 0;
            return playerLevel < req.level;
        } else if (req.type === 'building') {
            const playerLevel = (playerState.buildingLevels && playerState.buildingLevels[req.id]) || 0;
            return playerLevel < req.level;
        }
        return false;
    });

    return {
        unlocked: missing.length === 0,
        missing: missing
    };
}
