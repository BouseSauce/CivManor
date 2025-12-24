const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);
let ironOreCount = 0;
let oreCount = 0;
function walk(obj){
  if (Array.isArray(obj)) return obj.forEach(walk);
  if (obj && typeof obj === 'object'){
    for (const k of Object.keys(obj)){
      if (k === 'IronOre') ironOreCount++;
      if (k === 'Ore') oreCount++;
      walk(obj[k]);
    }
  }
}
walk(data);
console.log('IronOre keys found:', ironOreCount);
console.log('Ore keys found:', oreCount);
