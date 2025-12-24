#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const OUT = path.resolve(process.cwd(), 'data', 'game_save.json');
if (!fs.existsSync(OUT)) {
  console.error('Save file not found:', OUT);
  process.exit(2);
}

const txt = fs.readFileSync(OUT, 'utf8');
const parsed = JSON.parse(txt);
const areaStates = parsed.areaStates || {};
const areaIds = Object.keys(areaStates);
if (areaIds.length === 0) {
  console.error('No areas found in save file');
  process.exit(2);
}

const count = Math.max(6, Math.min(12, Math.floor(areaIds.length * 0.05) || 6));
const picked = new Set();
while (picked.size < count) {
  const idx = Math.floor(Math.random() * areaIds.length);
  picked.add(areaIds[idx]);
}

const resources = ['Timber','Stone','IronIngot','Food','Steel','Planks'];
const created = [];
for (const aid of picked) {
  const timber = randInt(200, 1200);
  const iron = randInt(50, 400);
  const food = randInt(100, 700);
  const steel = randInt(0, 200);
  const planks = randInt(0, 300);

  areaStates[aid].salvagePool = {
    Timber: timber,
    IronIngot: iron,
    Food: food,
    Steel: steel,
    Planks: planks
  };

  const name = areaStates[aid].name || aid;
  const region = aid.split(':')[0] || 'Unknown';
  created.push({ areaId: aid, name, region, salvage: areaStates[aid].salvagePool });
}

// Write back
fs.writeFileSync(OUT, JSON.stringify(parsed, null, 2), 'utf8');

console.log('Spawned salvage piles in the following areas:');
created.forEach(c => {
  console.log(`- ${c.areaId} (${c.name}) in ${c.region}:`, c.salvage);
});

// Print a small summary of unique regions
const regions = Array.from(new Set(created.map(c => c.region))).sort();
console.log('\nRegions with salvage:', regions.join(', '));

process.exit(0);
