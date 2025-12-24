const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
if (!fs.existsSync(file)) { console.error('Save file not found'); process.exit(1); }
const bak = file + '.bak.inplace.' + Date.now();
const raw = fs.readFileSync(file, 'utf8');
let data = JSON.parse(raw);

function walk(obj){
  if (Array.isArray(obj)) return obj.forEach(walk);
  if (obj && typeof obj === 'object'){
    for (const key of Object.keys(obj)){
      const val = obj[key];
      if (key === 'IronOre'){
        obj['IronIngot'] = val;
        delete obj['IronOre'];
      } else if (key === 'Ore'){
        obj['Stone'] = val;
        delete obj['Ore'];
      }
    }
    // walk children after possible renames to modify nested objects
    for (const v of Object.values(obj)) walk(v);
  }
}

fs.copyFileSync(file, bak);
walk(data);
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('Backup written to:', bak);
console.log('In-place migration applied.');
