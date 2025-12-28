
const fs = require('fs');
const path = require('path');

const SAVE_PATH = path.join(__dirname, '../data/game_save.json');
const bots = ['Bot1', 'Bot2', 'Bot3', 'Bot4', 'Bot5'];

function inject() {
    if (!fs.existsSync(SAVE_PATH)) {
        console.error('Save file not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8'));
    console.log('Top-level keys:', Object.keys(data));
    if (data.world) console.log('World keys:', Object.keys(data.world));
}

inject();
