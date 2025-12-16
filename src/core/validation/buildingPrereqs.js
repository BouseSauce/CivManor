import { BUILDING_PREREQS, BUILDING_CONFIG } from '../config/buildings.js';

/**
 * Evaluate prerequisites for a building given an AreaState and a user object.
 * Returns { allowed: boolean, missing: string[] }
 */
export function evaluatePrereqs(state, user, buildingId) {
    const prereq = BUILDING_PREREQS[buildingId];
    // If no prereq entry, treat as locked
    if (!prereq) return { allowed: false, missing: ['locked (no prereq entry)'] };

    // If explicitly allowed at start, it's allowed
    if (prereq.allowedAtStart) return { allowed: true, missing: [] };

    const missing = [];

    // Tech requirement
    if (prereq.tech) {
        const need = Array.isArray(prereq.tech) ? prereq.tech : [prereq.tech];
        const have = (user && user.researchedTechs) || [];
        const notHave = need.filter(t => !have.includes(t));
        if (notHave.length) missing.push(`tech: ${notHave.join(', ')}`);
    }

    // Building level requirements
    if (prereq.buildings) {
        for (const [bid, lvl] of Object.entries(prereq.buildings)) {
            const cur = (state.buildings && state.buildings[bid]) || 0;
            const name = (BUILDING_CONFIG[bid] && BUILDING_CONFIG[bid].displayName) || bid;
            if (cur < lvl) missing.push(`building ${name} L${lvl} (have L${cur})`);
        }
    }

    // Population requirement
    if (prereq.population) {
        const curPop = state.population || 0;
        if (curPop < prereq.population) missing.push(`population >= ${prereq.population} (have ${curPop})`);
    }

    return { allowed: missing.length === 0, missing };
}

export default evaluatePrereqs;
