#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'game_save.json');
const OUT_CSV = path.join(__dirname, '..', 'data', 'areas_list.csv');

function safeStr(s) { return (s === null || typeof s === 'undefined') ? '' : String(s).replace(/"/g, '""').replace(/\n/g, ' '); }

if (!fs.existsSync(DATA_FILE)) {
  console.error('Save file not found:', DATA_FILE);
  process.exit(1);
}

const txt = fs.readFileSync(DATA_FILE, 'utf8');
let parsed;
try { parsed = JSON.parse(txt); } catch (e) { console.error('Failed to parse save file:', e.message); process.exit(1); }
const areaStates = parsed.areaStates || {};
const areaOwners = parsed.areaOwners || {};
const users = parsed.users || {};

// Build regions map
const regionsMap = {};
Object.keys(areaStates).forEach(areaId => {
  const parts = areaId.split(':');
  const regionId = parts[0] || 'R0';
  const st = areaStates[areaId] || {};
  if (!regionsMap[regionId]) {
    const numeric = regionId.replace(/^R/, '') || regionId;
    const firstName = st.name ? st.name : `Region ${numeric}`;
    regionsMap[regionId] = { id: regionId, name: `Region ${numeric} — ${firstName}`, areas: [] };
  }
  const ownerId = (areaOwners && areaOwners[areaId]) ? areaOwners[areaId] : null;
  const ownerName = ownerId && users && users[ownerId] ? users[ownerId].username : '';
  regionsMap[regionId].areas.push({ id: areaId, name: st.name || areaId, ownerId: ownerId || '', ownerName });
});

// Flatten to CSV
const rows = [];
rows.push(['regionId','regionName','areaId','areaName','ownerId','ownerName'].join(','));
Object.values(regionsMap).forEach(r => {
  r.areas.forEach(a => {
    rows.push([r.id, `"${safeStr(r.name)}"`, a.id, `"${safeStr(a.name)}"`, a.ownerId || '', `"${safeStr(a.ownerName)}"`].join(','));
  });
});
fs.writeFileSync(OUT_CSV, rows.join('\n'), 'utf8');
console.log(`Wrote ${OUT_CSV} — regions:${Object.keys(regionsMap).length} areas:${Object.keys(areaStates).length}`);
console.log('Sample (first 20 lines):\n');
console.log(rows.slice(0,20).join('\n'));
process.exit(0);
