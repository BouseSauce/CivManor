
const API_URL = 'http://localhost:3001/api';
const bots = ['Bot1', 'Bot2', 'Bot3', 'Bot4', 'Bot5'];

async function registerBots() {
    for (const bot of bots) {
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: bot, password: 'password123' })
            });
            const data = await res.json();
            console.log(`Registered ${bot}:`, data.success || data.error);
        } catch (e) {
            console.error(`Failed to register ${bot}:`, e.message);
        }
    }
}

registerBots();
