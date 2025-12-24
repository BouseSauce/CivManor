const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
if (!fs.existsSync(file)) { console.error('Save file not found'); process.exit(1); }
const bak = file + '.bak.patch.' + Date.now();
const raw = fs.readFileSync(file, 'utf8');
let data = JSON.parse(raw);
fs.copyFileSync(file, bak);
let changed = 0;
for (const uid of Object.keys(data.users || {})){
  const user = data.users[uid];
  const res = user && user.inventory && user.inventory.resources;
  if (!res) continue;
  if (res.IronOre !== undefined){
    res.IronIngot = (res.IronIngot || 0) + res.IronOre;
    delete res.IronOre;
    changed++;
  }
  if (res.Ore !== undefined){
    res.Stone = (res.Stone || 0) + res.Ore;
    delete res.Ore;
    changed++;
  }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('Backup written to:', bak);
console.log('Patched users:', changed);
