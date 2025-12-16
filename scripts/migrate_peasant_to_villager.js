import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'game_save.json');

async function run() {
  try {
    const stat = await fsp.stat(DATA_FILE).catch(() => null);
    if (!stat) {
      console.error('No data file found at', DATA_FILE);
      process.exit(1);
    }

    const text = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(text);

    let usersChanged = 0;
    let areasChanged = 0;

    // Migrate users inventories
    if (parsed.users && typeof parsed.users === 'object') {
      Object.values(parsed.users).forEach(u => {
        if (u && u.inventory && u.inventory.units && typeof u.inventory.units === 'object') {
          if (u.inventory.units['Peasant'] != null) {
            // only overwrite Villager if missing
            if (u.inventory.units['Villager'] == null) u.inventory.units['Villager'] = u.inventory.units['Peasant'];
            delete u.inventory.units['Peasant'];
            usersChanged++;
          }
        }
      });
    }

    // Migrate areaStates
    if (parsed.areaStates && typeof parsed.areaStates === 'object') {
      Object.entries(parsed.areaStates).forEach(([areaId, plain]) => {
        if (plain && plain.units && typeof plain.units === 'object') {
          if (plain.units['Peasant'] != null) {
            if (plain.units['Villager'] == null) plain.units['Villager'] = plain.units['Peasant'];
            delete plain.units['Peasant'];
            areasChanged++;
          }
        }
      });
    }

    if (usersChanged === 0 && areasChanged === 0) {
      console.log('No legacy Peasant keys found. Nothing to do.');
      process.exit(0);
    }

    // Backup original
    const bakName = DATA_FILE + '.bak.' + Date.now();
    await fsp.writeFile(bakName, text, 'utf8');
    console.log('Backup written to', bakName);

    // Write updated
    await fsp.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    console.log(`Migration complete. Users updated: ${usersChanged}, Areas updated: ${areasChanged}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
}

run();
