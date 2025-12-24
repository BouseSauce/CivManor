#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_SAVE = path.join(__dirname, '..', 'data', 'game_save.generated.json');
const OUT_CSV = path.join(__dirname, '..', 'data', 'areas_list_generated.csv');

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function safe(s) { return (s||'').replace(/\"/g,'""').replace(/\n/g,' ').trim(); }

const adj = ['Iron','Silver','Golden','Bright','Shadow','Wind','Storm','River','Stone','Oak','Birch','Raven','Crystal','Sun','Moon','Star','Green','Red','Blue','White'];
const noun = ['Forge','Glen','Hollow','Ford','Vale','Heath','Ridge','Harbor','Cross','Hold','Watch','Hill','Field','Moor','Brook','Gate','Pass','Wood','Cliff','Heights'];
const placeExtras = ['Keep','Hold','Town','Landing','Borough','Port','Village','Market','Rest','Point'];

function makeName() {
  const a = adj[rnd(0, adj.length-1)];
  const n = noun[rnd(0, noun.length-1)];
  if (Math.random() < 0.25) return `${a} ${n} ${placeExtras[rnd(0, placeExtras.length-1)]}`;
  return `${a} ${n}`;
}

const regions = [];
const areaStates = {};
const areaOwners = {};
const users = {};

for (let ri = 1; ri <= 10; ri++) {
  const regionId = `R${ri}`;
  const areasCount = rnd(12,15);
  const firstAreaName = makeName();
  const regionName = `Region ${ri} — ${firstAreaName}`;
  const areas = [];
  for (let ai = 1; ai <= areasCount; ai++) {
    const areaId = `${regionId}:A${ai}`;
    const name = ai === 1 ? firstAreaName : makeName();
    areaStates[areaId] = { id: areaId, name };
    areas.push(areaId);
  }
  regions.push({ id: regionId, name: regionName, areas });
}

// Compose save-like object (minimal)
const save = {
  meta: { generatedAt: new Date().toISOString(), source: 'generate_regions.js' },
  regions,
  areaStates,
  areaOwners,
  users
};

fs.writeFileSync(OUT_SAVE, JSON.stringify(save, null, 2), 'utf8');

// write CSV
const rows = [];
rows.push(['regionId','regionName','areaId','areaName','ownerId','ownerName'].join(','));
for (const r of regions) {
  for (const aId of r.areas) {
    const st = areaStates[aId] || {};
    rows.push([r.id, `"${safe(r.name)}"`, aId, `"${safe(st.name)}"`, '', '""'].join(','));
  }
}
fs.writeFileSync(OUT_CSV, rows.join('\n'), 'utf8');

console.log(`Generated ${regions.length} regions with ${Object.keys(areaStates).length} areas`);
console.log(`Save: ${OUT_SAVE}`);
console.log(`CSV:  ${OUT_CSV}`);

process.exit(0);
