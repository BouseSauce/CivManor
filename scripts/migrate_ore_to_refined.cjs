const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
if (!fs.existsSync(file)) {
  console.error('Save file not found:', file);
  process.exit(1);
}
const bak = file + '.bak.' + Date.now();
const raw = fs.readFileSync(file, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  process.exit(1);
}

function transform(obj) {
  if (Array.isArray(obj)) return obj.map(transform);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      let nk = k;
      if (k === 'IronOre') nk = 'IronIngot';
      else if (k === 'Ore') nk = 'Stone';
      out[nk] = transform(v);
    }
    return out;
  }
  return obj;
}

const newData = transform(data);
fs.copyFileSync(file, bak);
fs.writeFileSync(file, JSON.stringify(newData, null, 2), 'utf8');
console.log('Backup written to:', bak);
console.log('Migration complete.');
