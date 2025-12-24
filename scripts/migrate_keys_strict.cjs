const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
if (!fs.existsSync(file)) { console.error('Save file not found'); process.exit(1); }
const bak = file + '.bak.strict.' + Date.now();
const raw = fs.readFileSync(file, 'utf8');
let data;
try { data = JSON.parse(raw); } catch (e){ console.error('JSON parse error:', e.message); process.exit(1); }

function transform(value){
  if (Array.isArray(value)) return value.map(transform);
  if (value && typeof value === 'object'){
    const out = {};
    for (const [k,v] of Object.entries(value)){
      let nk = k;
      if (k === 'IronOre') nk = 'IronIngot';
      else if (k === 'Ore') nk = 'Stone';
      out[nk] = transform(v);
    }
    return out;
  }
  return value;
}

fs.copyFileSync(file, bak);
const newData = transform(data);
fs.writeFileSync(file, JSON.stringify(newData, null, 2), 'utf8');
console.log('Backup written to:', bak);
console.log('Strict migration complete.');
