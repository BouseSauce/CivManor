import assert from 'assert';
import evaluatePrereqs from '../src/core/validation/buildingPrereqs.js';

function makeState() {
    return {
        population: 10,
        buildings: {
            LoggingCamp: 1,
            TownHall: 1
        }
    };
}

function makeUser() {
    return { researchedTechs: [] };
}

// Basic smoke tests
const s = makeState();
const u = makeUser();

// LoggingCamp should be allowed at start
const f = evaluatePrereqs(s, u, 'LoggingCamp');
assert.strictEqual(f.allowed, true, 'LoggingCamp should be allowed at start');

// TownHall should be allowed (it's a core building)
const t = evaluatePrereqs(s, u, 'TownHall');
assert.strictEqual(t.allowed, true, 'TownHall should be allowed');

console.log('buildingPrereqs tests passed');

// Additional cases
// 1) Tech requirement: Smelting required for Bloomery
const u2 = { researchedTechs: [] };
const b1 = evaluatePrereqs(s, u2, 'Bloomery');
assert.strictEqual(b1.allowed, false, 'Bloomery should be locked without Smelting');

u2.researchedTechs.push('Smelting');
const b2 = evaluatePrereqs(s, u2, 'Bloomery');
// Still locked because StonePit level requirement not met
assert.strictEqual(b2.allowed, false, 'Bloomery should still be locked until StonePit L5');

// 2) Population requirement for TownHall (if it were locked)
const s2 = { ...s, population: 25 };
const t2 = evaluatePrereqs(s2, u, 'TownHall');
assert.strictEqual(t2.allowed, true, 'TownHall should be allowed when population satisfied');

console.log('additional prereq cases passed');
