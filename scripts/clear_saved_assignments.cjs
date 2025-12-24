#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const TARGET = 'game_save.json';

function processFile(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(txt);
    let changed = false;
    if (parsed && parsed.areaStates && typeof parsed.areaStates === 'object') {
      Object.entries(parsed.areaStates).forEach(([areaId, plain]) => {
        if (plain && plain.assignments && Object.keys(plain.assignments).length > 0) {
          plain.assignments = {};
          parsed.areaStates[areaId] = plain;
          changed = true;
        }
      });
    }
    if (changed) {
      const bak = filePath + '.bak.clear-assignments.' + Date.now();
      fs.copyFileSync(filePath, bak);
      fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
      console.log(`Updated ${filePath} (backup at ${bak})`);
    } else {
      console.log(`No assignments found or nothing to change in ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to process ${filePath}:`, err.message);
  }
}

function findCandidates() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error('Data directory not found:', DATA_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('game_save.json'));
  return files.map(f => path.join(DATA_DIR, f));
}

const files = findCandidates();
if (!files || files.length === 0) {
  console.error('No game_save.json files found in', DATA_DIR);
  process.exit(1);
}

files.forEach(processFile);
console.log('Done.');
