import assert from 'assert';
import evaluatePrereqs from '../src/core/validation/buildingPrereqs.js';

function makeState() {
    return {
        population: 10,
        buildings: {
            LoggingCamp: 1,
            Farmhouse: 1,
            TownHall: 0
        }
    };
}

function makeUser() {
    return { researchedTechs: [] };
}

// Basic smoke tests
const s = makeState();
const u = makeUser();

// ForagersHut should be allowed at start
const f = evaluatePrereqs(s, u, 'ForagersHut');
assert.strictEqual(f.allowed, true, 'ForagersHut should be allowed at start');

// TownHall should be locked due to population/building
const t = evaluatePrereqs(s, u, 'TownHall');
assert.strictEqual(t.allowed, false, 'TownHall should be locked for low pop/building');
assert.ok(t.missing.length > 0, 'TownHall should report missing prereqs');

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

// 2) Population requirement for TownHall
const s2 = { ...s, population: 25, buildings: { ...s.buildings, Farmhouse: 2 } };
const t2 = evaluatePrereqs(s2, u, 'TownHall');
assert.strictEqual(t2.allowed, true, 'TownHall should be allowed when population and Farmhouse level satisfied');

console.log('additional prereq cases passed');
