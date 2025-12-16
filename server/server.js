import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import crypto from 'crypto';
import { promises as fsp } from 'fs';
import { processTick, AreaState, startConstruction } from '../src/core/gameLoop.js';
import bcrypt from 'bcryptjs';
import { BUILDING_CONFIG, BUILDING_PREREQS } from '../src/core/config/buildings.js';
import { evaluatePrereqs } from '../src/core/validation/buildingPrereqs.js';
import { calculateUpgradeCost } from '../src/core/logic/scaling.js';
import { ResourceEnum, UnitTypeEnum } from '../src/core/constants/enums.js';
import { FOOD_SUSTENANCE_VALUES } from '../src/core/config/food.js';
import { SUSTENANCE_PER_POP_PER_SECOND } from '../src/core/logic/economy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors()); // Allow frontend to connect
app.use(express.json());

// In-memory user store and simple token auth (prototype)
// users[id] -> { id, username, password, inventory: { resources: {}, units: {}, cartContents: {} }, researchedTechs: [], activeResearch: null }
const users = {}; // userId -> user object
const tokens = {}; // token -> userId

// Procedurally generate a larger world: 12 regions with 15 areas each using friendly names
const NUM_REGIONS = 12;
const AREAS_PER_REGION = 15;

function genRegionName() {
    const prefixes = ['Northern','Eastern','Southern','Western','High','Low','Central','Misty','Golden','Silver','Iron','Green','Red','Blue','Shadow','Bright','Old','New'];
    const suffixes = ['Marches','Vale','Hills','Plains','Wastes','Glen','Heath','Wood','Fields','Coast','Dale','Fen','Reach','Shire','Hold','Ward'];
    const adj = ['Emerald','Crimson','Silent','Storm','Frost','Sun','Moon','Iron','River','Stone','Wind'];
    // Randomly combine either Prefix + Suffix or Adj + Suffix for variety
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (Math.random() < 0.6) {
        return `${pick(prefixes)} ${pick(suffixes)}`;
    }
    return `${pick(adj)} ${pick(suffixes)}`;
}

function genAreaName(rIdx, aIdx) {
    const names = ['Iron Forge','Birch Hollow','Silver Glen','Stoneford','Ravenford','Bramble Cove','Elmwood','Foxwell','Granite Ridge','Haven','Kingsrest','Larkfield','Mountbray','Narrowford','Oldbridge','Pinehaven','Quarryend','Riverdale','Shepherds Hold','Thornlea'];
    return names[(rIdx * 5 + aIdx) % names.length].toUpperCase();
}

const world = { regions: [] };
for (let r = 0; r < NUM_REGIONS; r++) {
    const regionId = `R${r+1}`;
    const regionName = genRegionName(r);
    const areas = [];
    for (let a = 0; a < AREAS_PER_REGION; a++) {
        const areaId = `${regionId}:A${a+1}`;
        const areaName = genAreaName(r, a);
        areas.push({ id: areaId, name: areaName, ownerId: null });
    }
    world.regions.push({ id: regionId, name: regionName, areas });
}

// Map areaId -> AreaState for owned areas
const areaStates = {};

// Persistence paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'game_save.json');

// Initialize Game State for demo ownerless area (you can claim later)
const gameState = new AreaState('Iron Forge');

// --- Persistence helpers ---
function serializeAreaState(state) {
    return {
        name: state.name,
        tickCount: state.tickCount,
        resources: state.resources,
        population: state.population,
        housingCapacity: state.housingCapacity,
        taxRate: state.taxRate,
        approval: state.approval,
        hasFirewood: state.hasFirewood,
        buildings: state.buildings,
        units: state.units,
        assignments: state.assignments,
        queue: state.queue
    };
}

function restoreAreaState(obj) {
    const s = new AreaState(obj.name, obj.housingCapacity || 100);
    s.tickCount = obj.tickCount || 0;
    s.resources = obj.resources || s.resources;
    s.population = obj.population || s.population;
    s.housingCapacity = obj.housingCapacity || s.housingCapacity;
    s.taxRate = obj.taxRate || s.taxRate;
    s.approval = obj.approval || s.approval;
    s.hasFirewood = (typeof obj.hasFirewood === 'boolean') ? obj.hasFirewood : s.hasFirewood;
    s.buildings = obj.buildings || s.buildings;
    s.units = obj.units || s.units;
    s.assignments = obj.assignments || s.assignments;
    s.queue = obj.queue || s.queue;
    return s;
}

async function saveGameState() {
    try {
        // Prefer Postgres if DATABASE_URL is set
        if (process.env.DATABASE_URL || process.env.PG_CONNECTION) {
            const db = await import('./db/postgres.js');
            const out = {
                users,
                areaStates: Object.fromEntries(Object.entries(areaStates).map(([k,v]) => [k, serializeAreaState(v)])),
                areaOwners: Object.fromEntries(world.regions.flatMap(r => r.areas.map(a => [a.id, a.ownerId])))
            };
            await db.saveAll(out);
            console.log('Game state saved to Postgres');
            return;
        }
        await fsp.mkdir(DATA_DIR, { recursive: true });
        const out = {
            users,
            areaStates: Object.fromEntries(Object.entries(areaStates).map(([k,v]) => [k, serializeAreaState(v)])),
            areaOwners: Object.fromEntries(world.regions.flatMap(r => r.areas.map(a => [a.id, a.ownerId])))
        };
        await fsp.writeFile(DATA_FILE, JSON.stringify(out, null, 2), 'utf-8');
        console.log(`Game state saved to ${DATA_FILE}`);
    } catch (err) {
        console.error('Failed to save game state:', err);
    }
}

async function loadGameState() {
    try {
        // Prefer Postgres if DATABASE_URL is set
        if (process.env.DATABASE_URL || process.env.PG_CONNECTION) {
            const db = await import('./db/postgres.js');
            const parsed = await db.loadAll();
            if (parsed.users) {
                Object.keys(parsed.users).forEach(k => users[k] = parsed.users[k]);
                console.log(`Loaded ${Object.keys(parsed.users).length} users from Postgres`);
            }
            if (parsed.areaOwners) {
                Object.entries(parsed.areaOwners).forEach(([areaId, ownerId]) => {
                    for (const r of world.regions) {
                        const a = r.areas.find(x => x.id === areaId);
                        if (a) { a.ownerId = ownerId; break; }
                    }
                });
            }
            if (parsed.areaStates) {
                    Object.entries(parsed.areaStates).forEach(([areaId, plain]) => {
                        areaStates[areaId] = restoreAreaState(plain);
                    });
                console.log(`Loaded ${Object.keys(parsed.areaStates).length} area states from Postgres`);
            }
            return;
        }
        const stat = await fsp.stat(DATA_FILE).catch(() => null);
        if (!stat) return;
        const txt = await fsp.readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(txt);

        if (parsed.users) {
            Object.keys(parsed.users).forEach(k => users[k] = parsed.users[k]);
            console.log(`Loaded ${Object.keys(parsed.users).length} users from save`);
        }

        // (One-time migration handled by scripts; no runtime migration performed here.)

        if (parsed.areaOwners) {
            Object.entries(parsed.areaOwners).forEach(([areaId, ownerId]) => {
                for (const r of world.regions) {
                    const a = r.areas.find(x => x.id === areaId);
                    if (a) { a.ownerId = ownerId; break; }
                }
            });
        }

        if (parsed.areaStates) {
            Object.entries(parsed.areaStates).forEach(([areaId, plain]) => {
                areaStates[areaId] = restoreAreaState(plain);
            });
            console.log(`Loaded ${Object.keys(parsed.areaStates).length} area states from save`);
        }
    } catch (err) {
        console.error('Failed to load game state:', err);
    }
}


// Start Game Loop (per-second ticks) with enhanced logging
let TICK_NUMBER = 0;
const TICK_MS = 1 * 1000; // 1 second per tick
// Load persisted state (if any) then start tick loop
loadGameState().then(() => {
    console.log(`Tick interval: ${TICK_MS}ms`);
    setInterval(async () => {
        TICK_NUMBER++;
        const now = Date.now();

        // Snapshot users/areas before tick
        const userCount = Object.keys(users).length;
        const areaIds = Object.keys(areaStates);

        // Prepare list of states to tick (demo + owned areas)
        const states = [gameState, ...Object.values(areaStates)];

        const summaries = [];

        // Tick each state and compute deltas for a concise summary
        const seconds = Math.max(1, Math.floor(TICK_MS / 1000));
        states.forEach(state => {
            const before = { resources: Object.assign({}, state.resources), population: state.population, queueLen: state.queue.length };

            // Pass elapsed seconds to the game loop so timers decrement in real time
            processTick(state, seconds);

            const after = { resources: Object.assign({}, state.resources), population: state.population, queueLen: state.queue.length };

            // Resource diffs
            const resDiff = {};
            const keys = new Set([...Object.keys(before.resources || {}), ...Object.keys(after.resources || {})]);
            keys.forEach(k => {
                const delta = (after.resources[k] || 0) - (before.resources[k] || 0);
                if (delta !== 0) resDiff[k] = delta;
            });

            const popDelta = (after.population || 0) - (before.population || 0);
            const completed = Math.max(0, before.queueLen - after.queueLen);

            summaries.push({ name: state.name || 'Demo', resDiff, popDelta, completed });
        });

        // Process user research completion and count how many finished this tick
        let researchCompleted = 0;
        Object.values(users).forEach(user => {
            if (user.activeResearch && user.activeResearch.completesAt <= now) {
                const tech = user.activeResearch.techId;
                user.researchedTechs = user.researchedTechs || [];
                if (!user.researchedTechs.includes(tech)) user.researchedTechs.push(tech);
                user.activeResearch = null;
                researchCompleted++;
                console.log(`Research complete for user ${user.username}: ${tech}`);
            }
        });

        // Emit summary
        console.log(`\n=== TICK ${TICK_NUMBER} @ ${new Date(now).toISOString()} ===`);
        console.log(`Users loaded: ${userCount} | Owned areas: ${areaIds.length} | Research completed: ${researchCompleted}`);

        summaries.forEach(s => {
            const parts = [];
            if (s.popDelta) parts.push(`pop ${s.popDelta > 0 ? '+' : ''}${s.popDelta}`);
            if (Object.keys(s.resDiff).length) parts.push(`resources ${JSON.stringify(s.resDiff)}`);
            if (s.completed) parts.push(`completed ${s.completed} item(s)`);
            if (parts.length) console.log(` - ${s.name}: ${parts.join(', ')}`);
        });

        // Persist after each tick (best-effort)
        try { await saveGameState(); } catch (err) { /* already logged in helper */ }

    }, TICK_MS);

    // Save on shutdown signals
    const gracefulSave = async () => {
        console.log('Shutting down: saving game state...');
        await saveGameState();
        process.exit(0);
    };
    process.on('SIGINT', gracefulSave);
    process.on('SIGTERM', gracefulSave);

}).catch(err => {
    console.error('Error loading game state, starting with fresh state:', err);
    console.log(`Tick interval: ${TICK_MS}ms`);
    setInterval(() => { /* fallback minimal tick to avoid crash */ }, TICK_MS);
});

// Serve static files from Vite build (in production)
app.use(express.static(path.join(__dirname, '../dist')));

// Simple live root and health endpoints so the server responds on /
app.get('/', (req, res) => {
        res.type('html').send(`
                <html>
                    <head><title>CivBuilder Server</title></head>
                    <body style="font-family: sans-serif; padding: 2rem;">
                        <h1>CivBuilder Backend</h1>
                        <p>Status: <strong>Live</strong></p>
                        <p>API root: <a href="/api/areas">/api/areas</a></p>
                        <p>Health: <a href="/health">/health</a></p>
                    </body>
                </html>
        `);
});

app.get('/health', (req, res) => {
        res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()), serverTime: new Date().toISOString() });
});

// Helper: authenticate token header
function authFromReq(req) {
    const auth = req.headers['authorization'];
    if (!auth) return null;
    const token = auth.replace('Bearer ', '');
    return tokens[token] || null;
}

// User registration
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (Object.values(users).some(u => u.username === username)) return res.status(400).json({ error: 'User exists' });
    const id = crypto.randomUUID();
    // Initialize user with inventory and one civilization cart (TradeCart)
    const inventory = { resources: {}, units: {}, cartContents: {} };
    Object.values(ResourceEnum).forEach(r => inventory.resources[r] = 0);
    Object.values(UnitTypeEnum).forEach(u => inventory.units[u] = 0);
    // Give one TradeCart containing the starting goods
    inventory.units[UnitTypeEnum.TradeCart] = 1;
    inventory.cartContents = {
        [ResourceEnum.Timber]: 200,
        [ResourceEnum.Stone]: 50,
        [ResourceEnum.Meat]: 150,
        [ResourceEnum.Berries]: 150,
        [ResourceEnum.Planks]: 20
    };

    const hash = await bcrypt.hash(password, 10);
    users[id] = { id, username, password: hash, inventory, researchedTechs: [], activeResearch: null, messages: [] };
    try { await saveGameState(); } catch (e) { /* logged in helper */ }
    return res.json({ success: true, id, username });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = Object.values(users).find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // If stored password is a bcrypt hash, compare; otherwise, support legacy plaintext then re-hash.
    const stored = user.password || '';
    const isHash = typeof stored === 'string' && stored.startsWith('$2');
    const valid = isHash ? bcrypt.compareSync(password, stored) : (password === stored);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // If legacy plaintext, re-hash and persist
    if (!isHash) {
        (async () => { user.password = await bcrypt.hash(password, 10); try { await saveGameState(); } catch(e){} })();
    }

    const token = crypto.randomBytes(24).toString('hex');
    tokens[token] = user.id;
    return res.json({ success: true, token, user: { id: user.id, username: user.username } });
});

// Create Test Account (returns token)
app.post('/api/create-test-account', async (req, res) => {
    // Generate a friendlier test username from a small name pool plus a numeric suffix
    const namePool = ['Aldric','Beatrice','Rowan','Evelyn','Gideon','Maris','Cedric','Isolde','Theobald','Marta','Leofric','Ysolda','Orin','Helena','Borin','Seren'];
    const pick = () => namePool[Math.floor(Math.random() * namePool.length)];
    let username;
    do {
        username = `${pick()}_${Math.floor(100 + Math.random() * 900)}`;
    } while (Object.values(users).some(u => u.username === username));
    const password = Math.random().toString(36).slice(2,10);
    const id = crypto.randomUUID();
    // Initialize inventory as with regular registration
    const inventory = { resources: {}, units: {}, cartContents: {} };
    Object.values(ResourceEnum).forEach(r => inventory.resources[r] = 0);
    Object.values(UnitTypeEnum).forEach(u => inventory.units[u] = 0);
    inventory.units[UnitTypeEnum.TradeCart] = 1;
    inventory.cartContents = {
        [ResourceEnum.Timber]: 200,
        [ResourceEnum.Stone]: 50,
        [ResourceEnum.Meat]: 150,
        [ResourceEnum.Berries]: 150,
        [ResourceEnum.Planks]: 20
    };

    const hash = await bcrypt.hash(password, 10);
    users[id] = { id, username, password: hash, inventory, researchedTechs: [], activeResearch: null, messages: [] };
    const token = crypto.randomBytes(24).toString('hex');
    tokens[token] = id;
    try { await saveGameState(); } catch (e) { }
    // Return plaintext password to caller so they can log in; stored value is hashed.
    return res.json({ success: true, token, user: { id, username, password } });
});

// Messaging endpoints
// Send a message to another user: { toUserId, subject, body }
app.post('/api/messages/send', async (req, res) => {
    const fromId = authFromReq(req);
    if (!fromId) return res.status(401).json({ error: 'Unauthorized' });
    const { toUserId, subject, body } = req.body || {};
    if (!toUserId || !users[toUserId]) return res.status(400).json({ error: 'Recipient not found' });
    if (!subject && !body) return res.status(400).json({ error: 'Message empty' });

    const msg = { id: crypto.randomUUID(), from: fromId, to: toUserId, subject: subject || '', body: body || '', createdAt: Date.now(), read: false };
    users[toUserId].messages = users[toUserId].messages || [];
    users[toUserId].messages.push(msg);
    try { await saveGameState(); } catch (e) { /* ignore save errors */ }
    return res.json({ success: true, messageId: msg.id });
});

// Get inbox for authenticated user
app.get('/api/messages/inbox', (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.messages = user.messages || [];
    // Return messages with sender username
    const out = user.messages.map(m => ({ ...m, fromName: users[m.from] ? users[m.from].username : null }));
    return res.json({ messages: out.sort((a,b) => b.createdAt - a.createdAt) });
});

// Get sent messages for authenticated user (searches all users' inboxes)
app.get('/api/messages/sent', (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const sent = [];
    Object.values(users).forEach(u => {
        (u.messages || []).forEach(m => {
            if (m.from === userId) {
                sent.push({ ...m, toName: users[m.to] ? users[m.to].username : null });
            }
        });
    });
    sent.sort((a,b) => b.createdAt - a.createdAt);
    return res.json({ messages: sent });
});

// List users (id, username) for messaging
app.get('/api/users', (req, res) => {
    const list = Object.values(users).map(u => ({ id: u.id, username: u.username }));
    return res.json({ users: list });
});

// Mark message read
app.post('/api/messages/mark-read', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { messageId } = req.body || {};
    if (!messageId) return res.status(400).json({ error: 'Missing messageId' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.messages = user.messages || [];
    const msg = user.messages.find(m => m.id === messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    msg.read = true;
    try { await saveGameState(); } catch (e) { /* ignore */ }
    return res.json({ success: true });
});

// Simple research metadata (demo)
const RESEARCH_DEFS = {
    'Basic Tools': { id: 'Basic Tools', description: 'Unlocks basic production improvements.', cost: { [ResourceEnum.Gold]: 20, [ResourceEnum.Timber]: 20 }, durationSeconds: 30, requiredTownLevel: 1 },
    'Smelting': { id: 'Smelting', description: 'Allows smelting of ores.', cost: { [ResourceEnum.Gold]: 50, [ResourceEnum.Timber]: 30 }, durationSeconds: 45 },
    'The Wheel': { id: 'The Wheel', description: 'Enables wagons and trade', cost: { [ResourceEnum.Gold]: 40, [ResourceEnum.Timber]: 60 }, durationSeconds: 40 },
    'Agriculture': { id: 'Agriculture', description: 'Enables transition from foraging to organized farming (unlocks Farmhouse).', cost: { [ResourceEnum.Gold]: 30, [ResourceEnum.Timber]: 60 }, durationSeconds: 60 },
    'Advanced Studies': { id: 'Advanced Studies', description: 'Unlocks higher tier techs.', cost: { [ResourceEnum.Gold]: 120 }, durationSeconds: 90 }
};

// Research endpoints
app.get('/api/research', (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Return researched list, active research, available tech ids and full definitions for UI cards
    // Clone defs to avoid accidental mutation
    const defs = JSON.parse(JSON.stringify(RESEARCH_DEFS || {}));
    return res.json({ researched: user.researchedTechs || [], active: user.activeResearch || null, available: Object.keys(defs), defs });
});

app.post('/api/research/start', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { techId } = req.body || {};
    if (!techId || !RESEARCH_DEFS[techId]) return res.status(400).json({ error: 'Invalid tech id' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.researchedTechs && user.researchedTechs.includes(techId)) return res.status(400).json({ error: 'Already researched' });
    if (user.activeResearch) return res.status(400).json({ error: 'Another research is active' });

    const def = RESEARCH_DEFS[techId];
    // Enforce any area ownership / TownHall requirements
    if (def.requiredTownLevel) {
        let hasReq = false;
        for (const r of world.regions) {
            for (const a of r.areas) {
                if (a.ownerId === userId) {
                    const st = areaStates[a.id];
                    const lvl = st ? (st.buildings && st.buildings['TownHall'] ? st.buildings['TownHall'] : 0) : 0;
                    if (lvl >= def.requiredTownLevel) { hasReq = true; break; }
                }
            }
            if (hasReq) break;
        }
        if (!hasReq) return res.status(400).json({ error: `Requires TownHall level ${def.requiredTownLevel}` });
    }
    // Check resources
    for (const [resName, amount] of Object.entries(def.cost || {})) {
        if ((user.inventory.resources[resName] || 0) < amount) return res.status(400).json({ error: `Insufficient ${resName}` });
    }
    // Deduct
    for (const [resName, amount] of Object.entries(def.cost || {})) {
        user.inventory.resources[resName] -= amount;
    }

    const now = Date.now();
    user.activeResearch = { techId, startedAt: now, completesAt: now + (def.durationSeconds * 1000), durationSeconds: def.durationSeconds };
    try { await saveGameState(); } catch (e) { }
    return res.json({ success: true, active: user.activeResearch });
});

app.post('/api/research/complete', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.activeResearch) return res.status(400).json({ error: 'No active research' });
    const tech = user.activeResearch.techId;
    user.researchedTechs = user.researchedTechs || [];
    if (!user.researchedTechs.includes(tech)) user.researchedTechs.push(tech);
    user.activeResearch = null;
    try { await saveGameState(); } catch (e) { }
    return res.json({ success: true });
});

// Return list of regions and areas (only exposes ownerId and name)
app.get('/api/areas', (req, res) => {
    const expand = (req.query && req.query.expand) || null;
    const includeOwners = expand === 'owners';

    const simplified = world.regions.map(r => ({
        id: r.id,
        name: r.name,
        areas: r.areas.map(a => {
            const out = { id: a.id, name: a.name, ownerId: a.ownerId };
            if (includeOwners) out.ownerName = a.ownerId ? (users[a.ownerId] ? users[a.ownerId].username : null) : null;
            return out;
        })
    }));
    res.json({ regions: simplified });
});

// Get authenticated user's account info (account + inventory)
app.get('/api/account', (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Return basic user info and inventory (clone to avoid external mutation)
    const safeInventory = JSON.parse(JSON.stringify(user.inventory || {}));
    // Ensure units and cartContents exist and include TradeCart count
    safeInventory.units = safeInventory.units || {};
    if (typeof safeInventory.units[UnitTypeEnum.TradeCart] === 'undefined') safeInventory.units[UnitTypeEnum.TradeCart] = 0;
    safeInventory.cartContents = safeInventory.cartContents || {};
    return res.json({ id: user.id, username: user.username, inventory: safeInventory });
});

// Get area details. If requester owns it, return full game state, otherwise limited info.
app.get('/api/area/:areaId', async (req, res) => {
    const userId = authFromReq(req);
    const areaId = req.params.areaId;

    // Find area metadata
    let areaMeta = null;
    for (const r of world.regions) {
        const a = r.areas.find(x => x.id === areaId);
        if (a) { areaMeta = a; break; }
    }
    if (!areaMeta) return res.status(404).json({ error: 'Area not found' });

    if (areaMeta.ownerId && areaMeta.ownerId === userId) {
        // Owned by requester: return full AreaState (or areaStates)
        const state = areaStates[areaId] || gameState;

        // On-read completion: if any queued items have passed their `completesAt` timestamp, apply them now.
        try {
            const nowMs = Date.now();
            let changed = false;
            while (state.queue.length > 0) {
                const front = state.queue[0];
                // If front has a `completesAt` timestamp and it's in the past, complete it
                if (front && front.completesAt && front.completesAt <= nowMs) {
                    const item = state.queue.shift();
                    if (item.type === 'Building') {
                        state.buildings[item.id] = (state.buildings[item.id] || 0) + 1;
                        console.log(`(On-read) Construction Complete: ${item.name} -> Lvl ${state.buildings[item.id]}`);
                    } else if (item.type === 'Unit') {
                        state.units[item.id] = (state.units[item.id] || 0) + (item.count || 0);
                        console.log(`(On-read) Recruitment Complete: ${item.name}`);
                    }
                    changed = true;
                    continue; // check next item
                }
                break;
            }
            if (changed) {
                try { await saveGameState(); } catch (e) { /* ignore save errors here */ }
            }
        } catch (e) {
            console.error('Error processing on-read queue completions:', e);
        }
        const buildingsWithCosts = Object.keys(BUILDING_CONFIG).map(id => {
            const level = state.buildings[id] || 0;
            const config = BUILDING_CONFIG[id];
            const isUpgrading = state.queue.some(item => item.id === id && item.type === 'Building');
            const front = state.queue[0] || null;
            const frontRemaining = front && front.completesAt ? Math.max(0, Math.floor((front.completesAt - Date.now()) / 1000)) : (front ? (front.timeRemaining || 0) : 0);
            const upgradeProgress = isUpgrading && front ? Math.floor(((front.totalTime - frontRemaining) / front.totalTime) * 100) : 0;
            // Attach per-building upgrade timing if present in queue
            const queueItem = state.queue.find(item => item.type === 'Building' && item.id === id);
            const upgradeSecondsRemaining = queueItem ? (queueItem.completesAt ? Math.max(0, Math.floor((queueItem.completesAt - Date.now()) / 1000)) : (queueItem.timeRemaining || null)) : null;
            const upgradeTotalTime = queueItem ? (queueItem.totalTime || null) : null;

            // Evaluate prereqs for display
            const evalRes = evaluatePrereqs(state, users[areaMeta.ownerId], id);

            // Assigned count and maxAssign cap (simple cap: 50 * level, minimum cap 5)
            const assigned = (state.assignments && state.assignments[id]) || 0;
            // No per-building villager capacity: leave maxAssign undefined
            const maxAssign = null;
            // per-worker rates placeholder
            let perWorkerRates = {};
            // Estimate per-second production for this building (simple model matching server gameLoop rates)
            const RATES = {
                // Match gameLoop per-worker rates
                timberPerWorkerPerSecond: 0.06,
                stonePerLevelPerSecond: 0.25,
                stonePitPerWorkerPerSecond: 0.05,
                breadPerLevelPerSecond: 0.12,
                berriesPerWorkerPerSecond: 0.06,
                meatPerWorkerPerSecond: 0.08,
                hidesPerWorkerPerSecond: 0.03
            };

            const productionPerSecond = {};
            // Compute production per second and per-worker contribution where applicable
            if (id === 'LoggingCamp' && level > 0) {
                const perWorker = RATES.timberPerWorkerPerSecond * level; // per assigned villager contribution
                productionPerSecond[ResourceEnum.Timber] = perWorker * assigned;
                perWorkerRates = { [ResourceEnum.Timber]: perWorker };
            }
            if (id === 'DeepMine' && level > 0) productionPerSecond[ResourceEnum.Stone] = level * RATES.stonePerLevelPerSecond;
            if (id === 'Farmhouse' && level > 0) productionPerSecond[ResourceEnum.Bread] = level * RATES.breadPerLevelPerSecond;
            if (id === 'ForagersHut' && level > 0 && assigned > 0) {
                const perWorker = RATES.berriesPerWorkerPerSecond * level;
                productionPerSecond[ResourceEnum.Berries] = perWorker * assigned;
                perWorkerRates = { [ResourceEnum.Berries]: perWorker };
            }
            if (id === 'HuntingLodge' && level > 0 && assigned > 0) {
                const perWorker = RATES.meatPerWorkerPerSecond * level;
                productionPerSecond[ResourceEnum.Meat] = perWorker * assigned;
                // Hides are unlocked at HuntingLodge level 5
                if (level >= 5) {
                    const hidesPerWorker = RATES.hidesPerWorkerPerSecond * level;
                    productionPerSecond[ResourceEnum.Hides] = hidesPerWorker * assigned;
                    perWorkerRates = { [ResourceEnum.Meat]: perWorker, [ResourceEnum.Hides]: hidesPerWorker };
                } else {
                    perWorkerRates = { [ResourceEnum.Meat]: perWorker };
                }
            }
            if (id === 'StonePit' && level > 0 && assigned > 0) {
                const perWorker = RATES.stonePitPerWorkerPerSecond * level;
                productionPerSecond[ResourceEnum.Stone] = perWorker * assigned;
                perWorkerRates = { [ResourceEnum.Stone]: perWorker };
            }

            // Derive per-hour numbers for UI convenience
            const productionPerHour = {};
            Object.entries(productionPerSecond).forEach(([res, val]) => { productionPerHour[res] = (val || 0) * 3600; });
            const perWorkerRatesPerHour = {};
            Object.entries(perWorkerRates || {}).forEach(([res, val]) => { perWorkerRatesPerHour[res] = (val || 0) * 3600; });

            // Compute a level-aware display name (e.g., TownHall level -> Settlement/Town/City)
            let levelDisplayName = config.displayName || config.name;
            try {
                if (config.levelNames && Array.isArray(config.levelNames)) {
                    const idx = Math.min(level, Math.max(0, config.levelNames.length - 1));
                    levelDisplayName = config.levelNames[Math.max(0, Math.min(level, config.levelNames.length - 1))] || levelDisplayName;
                }
            } catch (e) { /* ignore */ }

            return {
                id,
                name: config.name,
                displayName: levelDisplayName,
                level,
                isLocked: !evalRes.allowed,
                isUpgrading,
                progress: upgradeProgress,
                upgradeCost: calculateUpgradeCost(id, level),
                productionPerSecond,
                productionPerHour,
                perWorkerRates: perWorkerRates || {},
                perWorkerRatesPerHour,
                // Expose housing & research progression data for UI (TownHall)
                housingByLevel: config.housingByLevel || null,
                researchSlotsByLevel: config.researchSlotsByLevel || null,
                missingReqs: evalRes.missing || [],
                assigned,
                category: config.category || null,
                tags: config.tags || [],
                relatedTechs: (config.relatedTechs || []).map(t => ({ id: t, researched: ((users[areaMeta.ownerId] && users[areaMeta.ownerId].researchedTechs) || []).includes(t) })),
                upgradeSecondsRemaining,
                upgradeTotalTime
            };
        });

        // Compute aggregated food total (Berries, Meat, Fish, Bread)
        const foodTotal = (state.resources[ResourceEnum.Berries] || 0)
                + (state.resources[ResourceEnum.Meat] || 0)
                + (state.resources[ResourceEnum.Fish] || 0)
                + (state.resources[ResourceEnum.Bread] || 0);

        // Population consumption (sustenance units per second).
        const sustenancePerSecond = (state.population || 0) * SUSTENANCE_PER_POP_PER_SECOND;
        const sustenancePerHour = sustenancePerSecond * 3600;
        const breadValue = FOOD_SUSTENANCE_VALUES[ResourceEnum.Bread] || 1;
        const breadEquivalentPerHour = sustenancePerHour / breadValue;

        return res.json({
            owned: true,
            id: areaMeta.id,
            name: areaMeta.name,
            ownerId: areaMeta.ownerId,
            ownerName: areaMeta.ownerId ? (users[areaMeta.ownerId] ? users[areaMeta.ownerId].username : null) : null,
            resources: state.resources,
            stats: { currentPop: state.population, maxPop: state.housingCapacity, approval: state.approval, foodTotal,
                     populationConsumptionPerSecond: sustenancePerSecond,
                     populationConsumptionPerHour: Math.round(sustenancePerHour),
                     breadEquivalentPerHour: Number(breadEquivalentPerHour.toFixed(2)) },
            queue: state.queue.map(item => ({
                ...item,
                progress: (() => {
                    const rem = item.completesAt ? Math.max(0, Math.floor((item.completesAt - Date.now()) / 1000)) : (item.timeRemaining || 0);
                    return item.totalTime ? Math.floor(((item.totalTime - rem) / item.totalTime) * 100) : 0;
                })(),
                secondsRemaining: item.completesAt ? Math.max(0, Math.floor((item.completesAt - Date.now()) / 1000)) : Math.max(0, Math.floor(item.timeRemaining || 0)),
                timeRemaining: item.completesAt ? `${Math.max(0, Math.floor((item.completesAt - Date.now()) / 1000))}s` : `${Math.max(0, Math.floor(item.timeRemaining || 0))}s`
            })),
            buildings: buildingsWithCosts,
            units: Object.entries(state.units).map(([type, count]) => ({ type, count })),
            assignments: state.assignments || {}
        });
    }

    // Not owned: only reveal owner (if any) and name
    return res.json({ owned: false, id: areaMeta.id, name: areaMeta.name, ownerId: areaMeta.ownerId, ownerName: areaMeta.ownerId ? (users[areaMeta.ownerId] ? users[areaMeta.ownerId].username : null) : null });
});

// Claim an unowned area
app.post('/api/area/:areaId/claim', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const areaId = req.params.areaId;

    // Locate area
    let areaMeta = null;
    for (const r of world.regions) {
        const a = r.areas.find(x => x.id === areaId);
        if (a) { areaMeta = a; break; }
    }
    if (!areaMeta) return res.status(404).json({ error: 'Area not found' });
    if (areaMeta.ownerId) return res.status(400).json({ error: 'Area already owned' });

    // Ensure user exists and has a civilization cart (TradeCart)
    const user = users[userId];
    if (!user || !user.inventory) return res.status(500).json({ error: 'User inventory missing' });
    const unitCount = user.inventory.units[UnitTypeEnum.TradeCart] || 0;
    if (unitCount < 1) return res.status(400).json({ error: 'No civilization cart available to claim area' });

    // Consume one cart
    user.inventory.units[UnitTypeEnum.TradeCart] = unitCount - 1;

    // Optional rename supplied by client
    const { name } = req.body || {};

    // Assign owner and create area state clone
    if (name && typeof name === 'string' && name.trim().length > 0) {
        areaMeta.name = name.trim();
    }
    areaMeta.ownerId = userId;
    const newState = new AreaState(areaMeta.name);
    // Start claimed area with only the civilization cart's resources.
    // Clear the area's default starter resources so the cart determines initial stock.
    Object.keys(newState.resources).forEach(k => newState.resources[k] = 0);
    const cart = user.inventory.cartContents || {};
    Object.entries(cart).forEach(([res, amt]) => {
        newState.resources[res] = (amt || 0);
    });
    // Clear cart contents (cart consumed)
    user.inventory.cartContents = {};

    areaStates[areaId] = newState;
    try { await saveGameState(); } catch (e) { }
    return res.json({ success: true, areaId, ownerId: userId, areaName: areaMeta.name, transferred: cart, remainingUnits: user.inventory.units });
});

// Assign villagers to buildings (foraging / hunting)
app.post('/api/area/:areaId/assign', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const areaId = req.params.areaId;
    const { buildingId, count } = req.body || {};

    if (!buildingId || typeof count !== 'number' || count < 0) return res.status(400).json({ error: 'Invalid params' });

    // Locate area
    let areaMeta = null;
    for (const r of world.regions) {
        const a = r.areas.find(x => x.id === areaId);
        if (a) { areaMeta = a; break; }
    }
    if (!areaMeta) return res.status(404).json({ error: 'Area not found' });
    if (areaMeta.ownerId !== userId) return res.status(403).json({ error: 'Not owner' });

    const state = areaStates[areaId];
    if (!state) return res.status(500).json({ error: 'Area state missing' });

    // Validate building exists in config
    if (!BUILDING_CONFIG[buildingId]) return res.status(400).json({ error: 'Invalid building id' });

    // Building must be at least level 1 to accept assignments
    const level = state.buildings[buildingId] || 0;
    if (level < 1) return res.status(400).json({ error: 'Building must be at least level 1 to assign workers' });

    // Prevent assigning villagers to the TownHall/Settlement (it represents housing)
    if (buildingId === 'TownHall') return res.status(400).json({ error: 'Cannot assign villagers to the TownHall/Settlement' });

    // Calculate available villagers (primary unit key is 'Villager')
    const totalVillagers = state.units[UnitTypeEnum.Villager] || 0;
    const currentAssigned = Object.values(state.assignments || {}).reduce((a,b) => a + b, 0);
    const currentForThis = state.assignments[buildingId] || 0;
    const newTotalAssigned = currentAssigned - currentForThis + count;
    if (newTotalAssigned > totalVillagers) return res.status(400).json({ error: 'Not enough villagers available' });

    // Apply assignment
    if (!state.assignments) state.assignments = {};
    if (count === 0) delete state.assignments[buildingId]; else state.assignments[buildingId] = count;
    try { await saveGameState(); } catch (e) { }
    return res.json({ success: true, assignments: state.assignments, units: state.units });
});

// Upgrade a building on an owned area
app.post('/api/area/:areaId/upgrade', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const areaId = req.params.areaId;
    const { buildingId } = req.body;

    // Validate area
    let areaMeta = null;
    for (const r of world.regions) {
        const a = r.areas.find(x => x.id === areaId);
        if (a) { areaMeta = a; break; }
    }
    if (!areaMeta) return res.status(404).json({ error: 'Area not found' });
    if (areaMeta.ownerId !== userId) return res.status(403).json({ error: 'Not owner' });

    const state = areaStates[areaId];
    if (!state) return res.status(500).json({ error: 'Area state missing' });

    // Check prereqs before attempting construction
    const prereq = BUILDING_PREREQS[buildingId];
    const user = users[userId];
    if (!prereq) {
        return res.status(400).json({ success: false, message: 'This building is locked by default (no prereqs defined).' });
    }

    // If explicitly allowed at start, skip further checks
    if (!prereq.allowedAtStart) {
        const missing = [];

        // Tech requirement
        if (prereq.tech) {
            const need = Array.isArray(prereq.tech) ? prereq.tech : [prereq.tech];
            const have = user.researchedTechs || [];
            const notHave = need.filter(t => !have.includes(t));
            if (notHave.length) missing.push(`tech: ${notHave.join(', ')}`);
        }

        // Building level requirements
        if (prereq.buildings) {
            for (const [bid, lvl] of Object.entries(prereq.buildings)) {
                const cur = state.buildings[bid] || 0;
                if (cur < lvl) missing.push(`building ${bid} L${lvl} (have L${cur})`);
            }
        }

        // Population requirement
        if (prereq.population) {
            const curPop = state.population || 0;
            if (curPop < prereq.population) missing.push(`population >= ${prereq.population} (have ${curPop})`);
        }

        if (missing.length) {
            return res.status(400).json({ success: false, message: `Prerequisites not met: ${missing.join('; ')}` });
        }
    }

    // Additional prereq check using evaluator (already done above for UI, but re-check here)
    const prereqEval = evaluatePrereqs(state, user, buildingId);
    if (!prereqEval.allowed) return res.status(400).json({ success: false, message: `Prerequisites not met: ${prereqEval.missing.join('; ')}` });

    const result = startConstruction(state, buildingId);
    if (result.success) {
        try { await saveGameState(); } catch (e) { }
        return res.json({ success: true });
    }
    return res.status(400).json(result);
});

// Existing gamestate endpoint (for backward compatibility) - returns default demo area
app.get('/api/gamestate', async (req, res) => {
    // On-read: complete any finished queue items for demo gameState
    try {
        const nowMs = Date.now();
        let changed = false;
        while (gameState.queue.length > 0) {
            const front = gameState.queue[0];
            if (front && front.completesAt && front.completesAt <= nowMs) {
                const item = gameState.queue.shift();
                if (item.type === 'Building') {
                    gameState.buildings[item.id] = (gameState.buildings[item.id] || 0) + 1;
                    console.log(`(On-read demo) Construction Complete: ${item.name} -> Lvl ${gameState.buildings[item.id]}`);
                } else if (item.type === 'Unit') {
                    gameState.units[item.id] = (gameState.units[item.id] || 0) + (item.count || 0);
                    console.log(`(On-read demo) Recruitment Complete: ${item.name}`);
                }
                changed = true;
                continue;
            }
            break;
        }
        if (changed) {
            try { await saveGameState(); } catch (e) { }
        }
    } catch (e) { console.error('Error processing demo on-read queue:', e); }

    const buildingsWithCosts = Object.keys(BUILDING_CONFIG).map(id => {
        const level = gameState.buildings[id] || 0;
        const config = BUILDING_CONFIG[id];
        const isUpgrading = gameState.queue.some(item => item.id === id && item.type === 'Building');
        const front = gameState.queue[0] || null;
        const frontRemaining = front && front.completesAt ? Math.max(0, Math.floor((front.completesAt - Date.now()) / 1000)) : (front ? (front.timeRemaining || 0) : 0);
        const upgradeProgress = isUpgrading && front ? Math.floor(((front.totalTime - frontRemaining) / front.totalTime) * 100) : 0;
        return { id, name: config.name, displayName: config.displayName || config.name, level, isLocked: false, isUpgrading, progress: upgradeProgress, upgradeCost: calculateUpgradeCost(id, level), reqs: 'None', category: config.category || null, tags: config.tags || [] };
    });

    res.json({
        resources: gameState.resources,
        stats: { currentPop: gameState.population, maxPop: gameState.housingCapacity, approval: gameState.approval, foodTimeRemaining: 'Infinite' },
        queue: gameState.queue.map(item => ({
            ...item,
            progress: (() => {
                const rem = item.completesAt ? Math.max(0, Math.floor((item.completesAt - Date.now()) / 1000)) : (item.timeRemaining || 0);
                return item.totalTime ? Math.floor(((item.totalTime - rem) / item.totalTime) * 100) : 0;
            })(),
            secondsRemaining: item.completesAt ? Math.max(0, Math.floor((item.completesAt - Date.now()) / 1000)) : Math.max(0, Math.floor(item.timeRemaining || 0)),
            timeRemaining: item.completesAt ? `${Math.max(0, Math.floor((item.completesAt - Date.now()) / 1000))}s` : `${Math.max(0, Math.floor(item.timeRemaining || 0))}s`
        })),
        buildings: buildingsWithCosts,
        units: Object.entries(gameState.units).map(([type, count]) => ({ type, count })),
        assignments: gameState.assignments || {}
    });
});

app.post('/api/upgrade', async (req, res) => {
    const { buildingId } = req.body;
    const result = startConstruction(gameState, buildingId);
    if (result.success) {
        try { await saveGameState(); } catch (e) { }
        res.json({ success: true });
    } else {
        res.status(400).json(result);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
