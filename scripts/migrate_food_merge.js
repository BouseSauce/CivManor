import { promises as fsp } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'game_save.json');

async function migrate() {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const txt = await fsp.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(txt);
    const backup = DATA_FILE + `.bak.${Date.now()}`;
    await fsp.copyFile(DATA_FILE, backup);
    console.log(`Backed up original save to ${backup}`);

    // Helper to migrate a single area state (plain object)
    const migrateArea = (plain) => {
      // Merge Meat + Berries -> Food in resources
      plain.resources = plain.resources || {};
      const meat = plain.resources.Meat || 0;
      const berries = plain.resources.Berries || 0;
      const food = (plain.resources.Food || 0) + meat + berries;
      plain.resources.Food = food;
      delete plain.resources.Meat;
      delete plain.resources.Berries;

      // Migrate buildings: combine ForagersHut + HuntingLodge -> Farm (sum levels)
      plain.buildings = plain.buildings || {};
      const f1 = plain.buildings.ForagersHut || 0;
      const f2 = plain.buildings.HuntingLodge || 0;
      const farmLvl = Math.max(0, f1 + f2); // sum to preserve progress
      if (farmLvl > 0) plain.buildings.Farm = (plain.buildings.Farm || 0) + farmLvl;
      delete plain.buildings.ForagersHut;
      delete plain.buildings.HuntingLodge;

      // Migrate assignments
      plain.assignments = plain.assignments || {};
      const a1 = plain.assignments.ForagersHut || 0;
      const a2 = plain.assignments.HuntingLodge || 0;
      if (a1 || a2) {
        plain.assignments.Farm = (plain.assignments.Farm || 0) + a1 + a2;
      }
      delete plain.assignments.ForagersHut;
      delete plain.assignments.HuntingLodge;

      // Migrate queue items: map Building ids and resource references
      plain.queue = (plain.queue || []).map(item => {
        const it = { ...item };
        if (it.type === 'Building' && (it.id === 'ForagersHut' || it.id === 'HuntingLodge')) {
          it.id = 'Farm';
          // Update name if present
          if (it.name) it.name = it.name.replace(/Foragers Hut|ForagersHut|Hunting Lodge|HuntingLodge/gi, 'Farm');
        }
        // For resource fields in queued purchases or recruitment, no change required here.
        return it;
      });

      return plain;
    };

    if (parsed.areaStates) {
      Object.entries(parsed.areaStates).forEach(([k, plain]) => {
        parsed.areaStates[k] = migrateArea(plain);
      });
    }

    // Also handle demo `gameState` root stored elsewhere (if present)
    if (parsed.gameState) parsed.gameState = migrateArea(parsed.gameState);

    await fsp.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    console.log('Migration complete. Saved merged Food and Farm into save file.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
