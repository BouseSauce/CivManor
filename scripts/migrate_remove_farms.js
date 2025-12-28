import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SAVE_FILE = path.join(DATA_DIR, 'game_save.json');

// Buildings to remove
const BUILDINGS_TO_REMOVE = ['Farm', 'Farmhouse', 'Granary'];

function migrate() {
    if (!fs.existsSync(SAVE_FILE)) {
        console.log('No save file found at', SAVE_FILE);
        return;
    }

    console.log(`Loading save file: ${SAVE_FILE}`);
    let data;
    try {
        const raw = fs.readFileSync(SAVE_FILE, 'utf8');
        data = JSON.parse(raw);
    } catch (e) {
        console.error('Failed to read/parse save file:', e);
        return;
    }

    // Create backup
    const backupPath = `${SAVE_FILE}.bak.remove-farms.${Date.now()}`;
    fs.copyFileSync(SAVE_FILE, backupPath);
    console.log(`Backup created at: ${backupPath}`);

    let removedCount = 0;
    let areasModified = 0;

    // Iterate over regions and areas
    if (data.regions) {
        data.regions.forEach(region => {
            if (region.areas) {
                region.areas.forEach(area => {
                    let areaModified = false;

                    // Remove buildings
                    if (area.buildings) {
                        BUILDINGS_TO_REMOVE.forEach(bId => {
                            if (area.buildings[bId]) {
                                console.log(`Removing ${bId} from Area ${area.id} (${area.name})`);
                                delete area.buildings[bId];
                                removedCount++;
                                areaModified = true;
                            }
                        });
                    }

                    // Remove from construction queue
                    if (area.constructionQueue) {
                        const originalLen = area.constructionQueue.length;
                        area.constructionQueue = area.constructionQueue.filter(item => !BUILDINGS_TO_REMOVE.includes(item.buildingId));
                        if (area.constructionQueue.length !== originalLen) {
                            console.log(`Removed items from construction queue in Area ${area.id}`);
                            areaModified = true;
                        }
                    }

                    if (areaModified) {
                        areasModified++;
                    }
                });
            }
        });
    }

    console.log(`Migration complete.`);
    console.log(`Removed ${removedCount} building instances.`);
    console.log(`Modified ${areasModified} areas.`);

    // Save updated data
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
    console.log(`Saved updated game state to ${SAVE_FILE}`);
}

migrate();
