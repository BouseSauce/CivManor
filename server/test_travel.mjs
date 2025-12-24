import { UNIT_CONFIG } from '../src/core/config/units.js';

function parseAreaId(areaId) {
    if (!areaId || typeof areaId !== 'string') return null;
    const m = areaId.match(/^R(\d+):A(\d+)$/);
    if (!m) return null;
    return { region: parseInt(m[1], 10), index: parseInt(m[2], 10) };
}

function computeGroupSpeed(units) {
    let minSpeed = Infinity;
    let found = false;
    Object.entries(units || {}).forEach(([ut, cnt]) => {
        if (!cnt) return;
        const cfg = UNIT_CONFIG[ut];
        const s = (cfg && cfg.speed) ? cfg.speed : 1.0;
        if (s < minSpeed) minSpeed = s;
        found = true;
    });
    if (!found) return 1.0;
    return (minSpeed === Infinity) ? 1.0 : minSpeed;
}

function computeTravelTicks(originId, targetId, units, worldSpeed = 1.0) {
    const o = parseAreaId(originId);
    const t = parseAreaId(targetId);
    const BASE_TICKS_PER_STEP = 6;
    let distanceFactor = 1;
    if (o && t) {
        const regionDist = Math.abs((o.region || 0) - (t.region || 0));
        const areaDist = Math.abs((o.index || 0) - (t.index || 0));
        distanceFactor = (regionDist * 8) + areaDist;
        if (distanceFactor <= 0) distanceFactor = 1;
    } else {
        distanceFactor = 10;
    }
    const groupSpeed = computeGroupSpeed(units) || 1.0;
    const raw = Math.max(1, Math.ceil((distanceFactor * BASE_TICKS_PER_STEP) / (groupSpeed * worldSpeed)));
    return raw;
}

function printCase(origin, target, units) {
    const ticks = computeTravelTicks(origin, target, units, 1.0);
    console.log(`Origin: ${origin} -> Target: ${target} | Units: ${JSON.stringify(units)} => Ticks: ${ticks}`);
}

console.log('Unit config sample speeds:');
console.log(Object.entries(UNIT_CONFIG).filter(([k,v])=>v.speed).map(([k,v])=>`${k}: ${v.speed}`).join(', '));

printCase('R1:A3','R1:A4', { Militia: 5 });
printCase('R1:A3','R1:A10', { Militia: 5 });
printCase('R1:A3','R2:A13', { Militia: 5 });
printCase('R1:A3','R3:A7', { Militia: 2 });
printCase('R1:A3','R3:A7', { Scout: 2 });
printCase('R1:A3','R3:A7', { Scout: 1, Militia: 3 });
printCase('R1:A3','R10:A50', { Militia: 10 });
