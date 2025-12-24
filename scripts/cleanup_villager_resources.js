const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
if (!fs.existsSync(file)) {
  console.error('game_save.json not found at', file);
  process.exit(2);
}
const raw = fs.readFileSync(file, 'utf8');
try {
  const backupPath = file + '.bak.' + Date.now();
  fs.writeFileSync(backupPath, raw, 'utf8');
  console.log('Backup written to', backupPath);
  const save = JSON.parse(raw);
  let changed = false;
  if (save.areaStates && typeof save.areaStates === 'object') {
    for (const aid of Object.keys(save.areaStates)) {
      const area = save.areaStates[aid];
      if (area && area.resources && typeof area.resources === 'object') {
        if (Object.prototype.hasOwnProperty.call(area.resources, 'Villager')) {
          delete area.resources.Villager;
          changed = true;
        }
        if (Object.prototype.hasOwnProperty.call(area.resources, 'Villagers')) {
          delete area.resources.Villagers;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(save, null, 2), 'utf8');
    console.log('Removed legacy Villager/Villagers entries from area resources.');
  } else {
    console.log('No legacy Villager/Villagers entries found. No changes made.');
  }
  process.exit(0);
} catch (err) {
  console.error('Error processing game_save.json:', err);
  process.exit(3);
}
