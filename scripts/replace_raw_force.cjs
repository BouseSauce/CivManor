const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
if (!fs.existsSync(file)) { console.error('Save file not found'); process.exit(1); }
const bak = file + '.bak.force.' + Date.now();
const raw = fs.readFileSync(file, 'utf8');
fs.copyFileSync(file, bak);
let out = raw.replace(/"IronOre"\s*:/g, '"IronIngot":');
out = out.replace(/"Ore"\s*:/g, '"Stone":');
fs.writeFileSync(file, out, 'utf8');
console.log('Backup written to:', bak);
console.log('Force raw replace applied.');
