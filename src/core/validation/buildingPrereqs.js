import { BUILDING_CONFIG } from '../config/buildings.js';

/**
 * Evaluate prerequisites for a building given an AreaState and a user object.
 * Returns { allowed: boolean, missing: string[] }
 */
export function evaluatePrereqs(state, user, buildingId) {
    const cfg = BUILDING_CONFIG[buildingId];
    if (!cfg) return { allowed: false, missing: ['locked (no building config)'] };

    // Build a normalized prereq object from BUILDING_CONFIG entry
    const prereq = {};
    if (!cfg.requirement) {
        prereq.allowedAtStart = true;
    } else {
        const req = cfg.requirement || {};
        // building level requirements
        if (req.building) prereq.buildings = { [req.building]: (req.level || 1) };
        if (req.buildings) prereq.buildings = Object.assign({}, req.buildings, prereq.buildings || {});
        if (req.population) prereq.population = req.population;
        if (req.items) prereq.items = req.items;
        if (req.quest) prereq.quest = req.quest;
        if (req.tech) prereq.tech = req.tech;
    }

    const missing = [];

    // Tech requirement (if present in config)
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
