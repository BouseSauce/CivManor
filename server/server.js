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
import { calculateUpgradeCost, calculateBuildTime } from '../src/core/logic/scaling.js';
import { ResourceEnum, UnitTypeEnum } from '../src/core/constants/enums.js';
import { FOOD_SUSTENANCE_VALUES } from '../src/core/config/food.js';
import { SUSTENANCE_PER_POP_PER_SECOND } from '../src/core/logic/economy.js';
import { GAME_CONFIG } from '../src/core/config/gameConfig.js';
import { PRODUCTION_RATES, PRODUCTION_GROWTH, WORKER_EXP, PRODUCTION_GLOBAL_MULTIPLIER } from '../src/core/config/production.js';

// Basic server and runtime state initialization
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());
// Default to 3001 to match the frontend dev client (Vite) expectations
const PORT = process.env.PORT || 3001;

// In-memory runtime stores used by API endpoints
const tokens = {};
const users = {};
const world = { regions: [] };

// Expose production constants for any runtime users
const RATES = PRODUCTION_RATES;

// Map areaId -> AreaState for owned areas
const areaStates = {};
// Persisted owner mapping loaded from save (areaId -> ownerId)
const savedAreaOwners = {};

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
                // Persist ephemeral tokens so client sessions survive restarts
                tokens,
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
            // Persist ephemeral tokens so client sessions survive restarts
            tokens,
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
        let parsed = null;
        try {
            parsed = JSON.parse(txt);
        } catch (err) {
            console.error('Failed to parse save file (corrupted or truncated):', err.message);
            try {
                const corruptBackup = DATA_FILE + `.corrupt.${Date.now()}`;
                await fsp.copyFile(DATA_FILE, corruptBackup);
                console.log(`Backed up corrupted save to ${corruptBackup}`);
            } catch (copyErr) {
                console.error('Failed to back up corrupted save file:', copyErr.message);
            }
            // Do not throw further — start with a fresh in-memory state.
            parsed = null;
        }

        if (parsed && parsed.users) {
            Object.keys(parsed.users).forEach(k => users[k] = parsed.users[k]);
            console.log(`Loaded ${Object.keys(parsed.users).length} users from save`);
        }

        // Restore persisted auth tokens (if present) so client tokens remain valid across restarts
        if (parsed && parsed.tokens) {
            Object.entries(parsed.tokens).forEach(([t, uid]) => { try { tokens[t] = uid; } catch (e) {} });
            try { console.log(`Restored ${Object.keys(parsed.tokens).length} auth tokens from save`); } catch (e) {}
        }
        // If the parsed save appears incomplete (very few areaStates), try to find a larger backup.
        const parsedAreaCount = parsed && parsed.areaStates ? Object.keys(parsed.areaStates).length : 0;
        if (parsedAreaCount < 5) {
            try {
                const files = await fsp.readdir(DATA_DIR);
                const candidates = files.filter(fn => fn.startsWith('game_save.json.bak') || fn.includes('.corrupt.'))
                    .map(fn => path.join(DATA_DIR, fn));
                let best = { count: parsedAreaCount, parsed: parsed };
                for (const fpath of candidates) {
                    try {
                        const txtb = await fsp.readFile(fpath, 'utf-8');
                        const pb = JSON.parse(txtb);
                        const c = pb && pb.areaStates ? Object.keys(pb.areaStates).length : 0;
                        if (c > best.count) best = { count: c, parsed: pb };
                    } catch (e) { /* ignore parse errors for backups */ }
                }
                if (best.parsed && best.parsed !== parsed) {
                    console.log(`Using backup save with ${best.count} areaStates from ${best.count > parsedAreaCount ? 'backup' : 'original'}`);
                    parsed = best.parsed;
                    if (parsed && parsed.users) Object.keys(parsed.users).forEach(k => users[k] = parsed.users[k]);
                }
            } catch (e) { /* ignore backup loading errors */ }
        }

        // (One-time migration handled by scripts; no runtime migration performed here.)

        // Store parsed areaOwners to apply later when world.regions is built
        if (parsed && parsed.areaOwners) {
            Object.entries(parsed.areaOwners).forEach(([areaId, ownerId]) => {
                try { savedAreaOwners[areaId] = ownerId; } catch (e) { /* ignore */ }
            });
            try { console.log(`Loaded ${Object.keys(parsed.areaOwners).length} area owner mappings from save`); } catch (e) {}
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
const TICK_MS = GAME_CONFIG.TICK_MS; 
// Load persisted state (if any) then start tick loop
loadGameState().then(() => {
    // If no explicit world data was loaded, build a minimal world from persisted `areaStates`.
    if (!world.regions || world.regions.length === 0) {
        const regionsMap = {};
        Object.keys(areaStates).forEach(areaId => {
            const parts = areaId.split(':');
            const regionId = parts[0] || 'R0';
            const st = areaStates[areaId] || {};
            if (!regionsMap[regionId]) {
                // Use a readable region name: include numeric region index and first area's name when available
                const numeric = regionId.replace(/^R/, '') || regionId;
                const firstName = st.name ? st.name : (`Region ${numeric}`);
                regionsMap[regionId] = { id: regionId, name: `Region ${numeric} — ${firstName}`, areas: [] };
            }
            regionsMap[regionId].areas.push({ id: areaId, name: st.name || areaId, ownerId: (savedAreaOwners[areaId] || null) });
        });
        world.regions = Object.values(regionsMap);
    }

    console.log(`Tick interval: ${TICK_MS}ms`);
    setInterval(async () => {
        TICK_NUMBER++;
        const now = Date.now();

        // Snapshot users/areas before tick
        const userCount = Object.keys(users).length;
        const areaIds = Object.keys(areaStates);

        // Prepare list of states to tick (demo + owned areas)
        // We need areaId context for area states so we can check owner research (gold/ore storage)
        const states = [{ id: null, state: gameState }, ...Object.entries(areaStates).map(([id, s]) => ({ id, state: s }))];

        const summaries = [];

        // Tick each state and compute deltas for a concise summary
        // We pass 1 tick unit to processTick, representing one game loop iteration
        states.forEach(({ id, state }) => {
            const before = { resources: Object.assign({}, state.resources), population: state.population, queueLen: state.queue.length };

            // Determine area-level storage permissions (gold/ore) based on owner research
            let ctx = { allowGold: true, allowOres: true };
            try {
                if (id) {
                    // find area metadata to obtain ownerId
                    let areaMeta = null;
                    for (const r of world.regions) {
                        const a = r.areas.find(x => x.id === id);
                        if (a) { areaMeta = a; break; }
                    }
                    const ownerId = areaMeta ? areaMeta.ownerId : null;
                    if (ownerId && users[ownerId]) {
                        const researched = users[ownerId].researchedTechs || [];
                        ctx.allowGold = researched.includes('Gold Storage');
                        ctx.allowOres = researched.includes('Ore Storage');
                    }
                }
            } catch (e) { /* ignore permission calc errors */ }

            // Pass 1 tick unit. Logic inside processTick handles scaling if needed, 
            // but generally 1 tick = 1 unit of production/consumption time.
            processTick(state, 1, ctx);

            const after = { resources: Object.assign({}, state.resources), population: state.population, queueLen: state.queue.length };

            // Determine population delta and completed items
            const popDelta = (after.population || 0) - (before.population || 0);
            const completed = Math.max(0, before.queueLen - after.queueLen);

            // Collect active non-construction tasks (e.g., Missions/Travel/Wars) from queue
            const activeTasks = (state.queue || [])
                .filter(it => it && it.type && !['Building','Unit'].includes(it.type))
                .map(it => ({ type: it.type, id: it.id || it.name, name: it.name || it.id, ticksRemaining: it.ticksRemaining }));

            summaries.push({ name: state.name || 'Demo', popDelta, completed, activeTasks });
        });

        // Process user research completion and count how many finished this tick
        let researchCompleted = 0;
        Object.values(users).forEach(user => {
            if (user.activeResearch) {
                // Decrement ticks remaining
                if (typeof user.activeResearch.ticksRemaining === 'undefined') {
                    // Migration for existing research: assume 1 tick left if not set
                    user.activeResearch.ticksRemaining = 1;
                }
                user.activeResearch.ticksRemaining -= 1;

                if (user.activeResearch.ticksRemaining <= 0) {
                    const tech = user.activeResearch.techId;
                    user.researchedTechs = user.researchedTechs || [];
                    if (!user.researchedTechs.includes(tech)) user.researchedTechs.push(tech);
                    user.activeResearch = null;
                    researchCompleted++;
                    console.log(`Research complete for user ${user.username}: ${tech}`);
                }
            }
        });

        // Emit summary
        console.log(`\n=== TICK ${TICK_NUMBER} @ ${new Date(now).toISOString()} ===`);
        console.log(`Users loaded: ${userCount} | Owned areas: ${areaIds.length} | Research completed: ${researchCompleted}`);

        summaries.forEach(s => {
            const parts = [];
            if (s.popDelta) parts.push(`pop ${s.popDelta > 0 ? '+' : ''}${s.popDelta}`);
            if (s.activeTasks && s.activeTasks.length) parts.push(`active: ${s.activeTasks.map(a => `${a.type}:${a.name}${typeof a.ticksRemaining==='number' ? `(${a.ticksRemaining})` : ''}`).join('; ')}`);
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
        [ResourceEnum.Food]: 300,
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
        [ResourceEnum.Food]: 300,
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

// --- Admin utilities (dev only / protected by ADMIN_SECRET if set) ---
function checkAdmin(req, res) {
    const secret = process.env.ADMIN_SECRET;
        // Accept either x-admin-secret header matching configured secret, OR a valid ephemeral admin token
        const provided = req.headers['x-admin-secret'] || req.headers['admin-secret'];
        const providedToken = req.headers['x-admin-token'];
        if (provided && secret) {
                if (provided === secret) return true;
                res.status(403).json({ error: 'Forbidden: admin secret invalid' });
                return false;
        }
        if (providedToken && isValidAdminToken(providedToken)) {
                return true;
        }
        if (!secret) {
                // No secret configured — allow but log a warning
                console.warn('WARNING: ADMIN endpoints are accessible because ADMIN_SECRET is not set. Set ADMIN_SECRET in production.');
                return true;
        }
        res.status(403).json({ error: 'Forbidden: admin secret required' });
        return false;
}

// In-memory ephemeral admin tokens for server-hosted UI
const adminTokens = new Map(); // token -> expiryMs
function createAdminToken(ttlMs = 30 * 60 * 1000) {
        const t = crypto.randomBytes(24).toString('hex');
        adminTokens.set(t, Date.now() + ttlMs);
        return t;
}

function isValidAdminToken(token) {
        if (!token) return false;
        const exp = adminTokens.get(token);
        if (!exp) return false;
        if (Date.now() > exp) { adminTokens.delete(token); return false; }
        return true;
}

// Server-hosted admin UI login endpoint (accepts password and returns ephemeral token)
app.post('/admin/login', express.json(), (req, res) => {
        const { password } = req.body || {};
        const expected = process.env.ADMIN_SECRET || 'Ukennedy23';
        if (!password || password !== expected) return res.status(403).json({ error: 'Invalid password' });
        const token = createAdminToken();
        return res.json({ success: true, token });
});

// Serve a minimal server-side admin UI on /admin
app.get('/admin', (req, res) => {
        res.type('html').send(`
                <!doctype html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <title>CivBuilder Admin</title>
                    <style>body{font-family:Arial,sans-serif;padding:16px;background:#f6f8fb} .panel{background:#fff;padding:12px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:800px} input,select{padding:6px;margin-right:6px}</style>
                </head>
                <body>
                    <div class="panel">
                        <h2>Server Admin (port ${PORT})</h2>
                        <div id="login">
                            <label>Password: <input id="pw" type="password" placeholder="Enter password" /></label>
                            <button id="btnLogin">Login</button>
                            <span id="loginMsg" style="margin-left:8px;color:#666"></span>
                        </div>
                        <div id="actions" style="display:none;margin-top:12px">
                            <div style="margin-bottom:8px"><button id="completeBtn">Complete All Buildings</button></div>
                            <div style="margin-bottom:8px">Grant resources: <input id="gUser" placeholder="userId (optional)"/> <input id="gArea" placeholder="areaId (optional)"/> <input id="gKey" value="Food"/> <input id="gAmt" type="number" value="100"/> <button id="grantBtn">Grant</button></div>
                            <div style="margin-bottom:8px"><button id="cfgBtn">View Server Config</button></div>
                            <pre id="out" style="background:#fafafa;padding:8px;max-height:300px;overflow:auto"></pre>
                        </div>
                    </div>
                    <script>
                        let adminToken = null;
                        document.getElementById('btnLogin').addEventListener('click', async () => {
                            const pw = document.getElementById('pw').value;
                            document.getElementById('loginMsg').textContent = 'Logging in...';
                            try {
                                const r = await fetch('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
                                if (!r.ok) throw new Error('Login failed');
                                const j = await r.json();
                                adminToken = j.token;
                                document.getElementById('login').style.display = 'none';
                                document.getElementById('actions').style.display = 'block';
                                document.getElementById('out').textContent = 'Logged in (token valid for 30m)';
                            } catch (e) {
                                document.getElementById('loginMsg').textContent = 'Login failed';
                            }
                        });

                        document.getElementById('completeBtn').addEventListener('click', async () => {
                            const r = await fetch('/api/admin/complete-buildings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify({}) });
                            const j = await r.json(); document.getElementById('out').textContent = JSON.stringify(j, null, 2);
                        });

                        document.getElementById('grantBtn').addEventListener('click', async () => {
                            const userId = document.getElementById('gUser').value || undefined;
                            const areaId = document.getElementById('gArea').value || undefined;
                            const key = document.getElementById('gKey').value || 'Food';
                            const amt = Number(document.getElementById('gAmt').value || 0);
                            const body = { resources: { [key]: amt } };
                            if (userId) body.userId = userId; if (areaId) body.areaId = areaId;
                            const r = await fetch('/api/admin/grant', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify(body) });
                            const j = await r.json(); document.getElementById('out').textContent = JSON.stringify(j, null, 2);
                        });

                        document.getElementById('cfgBtn').addEventListener('click', async () => {
                            const r = await fetch('/api/admin/config', { headers: { 'x-admin-token': adminToken } });
                            const j = await r.json(); document.getElementById('out').textContent = JSON.stringify(j, null, 2);
                        });
                    </script>
                </body>
                </html>
        `);
});

// Complete all queued items (global) or for a specific area
app.post('/api/admin/complete-buildings', async (req, res) => {
    if (!checkAdmin(req, res)) return;
    const { areaId } = req.body || {};
    let totalCompleted = 0;
    const processState = (state) => {
        if (!state || !state.queue || state.queue.length === 0) return 0;
        let completed = 0;
        while (state.queue.length > 0) {
            const item = state.queue.shift();
            if (item.type === 'Building') {
                state.buildings[item.id] = (state.buildings[item.id] || 0) + 1;
                completed++;
            } else if (item.type === 'Unit') {
                state.units[item.id] = (state.units[item.id] || 0) + (item.count || 0);
                completed++;
            }
        }
        return completed;
    };

    if (areaId) {
        const meta = (() => {
            for (const r of world.regions) {
                const a = r.areas.find(x => x.id === areaId);
                if (a) return a;
            }
            return null;
        })();
        if (!meta) return res.status(404).json({ error: 'Area not found' });
        if (!areaStates[areaId]) return res.status(400).json({ error: 'Area has no state' });
        totalCompleted = processState(areaStates[areaId]);
    } else {
        // Global: include demo gameState and all owned areas
        totalCompleted += processState(gameState);
        Object.values(areaStates).forEach(s => { totalCompleted += processState(s); });
    }
    try { await saveGameState(); } catch (e) { /* ignore save errors */ }
    return res.json({ success: true, completed: totalCompleted });
});

// Grant resources to a player (inventory) or to an area
app.post('/api/admin/grant', async (req, res) => {
    if (!checkAdmin(req, res)) return;
    const { userId, areaId, resources } = req.body || {};
    if (!resources || typeof resources !== 'object') return res.status(400).json({ error: 'Missing resources object' });

    if (userId) {
        const user = users[userId];
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.inventory = user.inventory || { resources: {}, units: {}, cartContents: {} };
        user.inventory.resources = user.inventory.resources || {};
        Object.entries(resources).forEach(([k,v]) => {
            user.inventory.resources[k] = (user.inventory.resources[k] || 0) + (Number(v) || 0);
        });
        try { await saveGameState(); } catch (e) { /* ignore */ }
        return res.json({ success: true, userId, inventory: user.inventory });
    }

    if (areaId) {
        const state = areaStates[areaId];
        if (!state) return res.status(404).json({ error: 'Area state not found' });
        state.resources = state.resources || {};
        Object.entries(resources).forEach(([k,v]) => {
            state.resources[k] = (state.resources[k] || 0) + (Number(v) || 0);
        });
        try { await saveGameState(); } catch (e) { /* ignore */ }
        return res.json({ success: true, areaId, resources: state.resources });
    }

    return res.status(400).json({ error: 'Must specify userId or areaId' });
});

// View current game config (read-only)
app.get('/api/admin/config', (req, res) => {
    if (!checkAdmin(req, res)) return;
    return res.json({ GAME_CONFIG });
});

// Simple research metadata (demo)
const RESEARCH_DEFS = {
    'Basic Tools': { id: 'Basic Tools', description: 'Unlocks basic production improvements.', cost: { [ResourceEnum.Stone]: 1200, [ResourceEnum.Timber]: 1400 }, durationSeconds: 30, requiredTownLevel: 1 },
    'Smelting': { id: 'Smelting', description: 'Allows smelting of ores.', cost: { [ResourceEnum.Gold]: 50, [ResourceEnum.Timber]: 30 }, durationSeconds: 45 },
    'The Wheel': { id: 'The Wheel', description: 'Enables wagons and trade', cost: { [ResourceEnum.Gold]: 40, [ResourceEnum.Timber]: 60 }, durationSeconds: 40 },
    'Agriculture': { id: 'Agriculture', description: 'Enables transition from foraging to organized farming (unlocks Farmhouse).', cost: { [ResourceEnum.Gold]: 30, [ResourceEnum.Timber]: 60 }, durationSeconds: 60 },
    'Advanced Studies': { id: 'Advanced Studies', description: 'Unlocks higher tier techs.', cost: { [ResourceEnum.Gold]: 120 }, durationSeconds: 90 }
    , 'Gold Storage': { id: 'Gold Storage', description: 'Allows storage of Gold in your Storehouse.', cost: { [ResourceEnum.Gold]: 0, [ResourceEnum.Timber]: 50 }, durationSeconds: 60 },
    'Ore Storage': { id: 'Ore Storage', description: 'Allows storage of raw ores (IronOre/Coal) in your Storehouse.', cost: { [ResourceEnum.Gold]: 0, [ResourceEnum.Timber]: 60 }, durationSeconds: 75 }
};

// Research endpoints
app.get('/api/research', (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Clone defs to avoid accidental mutation
    const defs = JSON.parse(JSON.stringify(RESEARCH_DEFS || {}));

    // Compute locked state per tech for this user. A tech is locked if it
    // requires a TownHall level the user does not have on any owned area.
    const userTownLevels = [];
    for (const r of world.regions) {
        for (const a of r.areas) {
            if (a.ownerId === userId) {
                const st = areaStates[a.id];
                const lvl = st ? (st.buildings && st.buildings['TownHall'] ? st.buildings['TownHall'] : 0) : 0;
                userTownLevels.push(lvl);
            }
        }
    }
    const maxTownLevel = userTownLevels.length > 0 ? Math.max(...userTownLevels) : 0;

    const available = [];
    Object.keys(defs).forEach(tid => {
        const def = defs[tid];
        const reqLvl = def.requiredTownLevel || 0;
        const locked = reqLvl > 0 && maxTownLevel < reqLvl;
        def.locked = locked;
        if (!locked) available.push(tid);
    });

    return res.json({ researched: user.researchedTechs || [], active: user.activeResearch || null, available, defs });
});

app.post('/api/research/start', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // Accept either { techId } or { id } from the client
    const body = req.body || {};
    const techId = body.techId || body.id || null;
    if (!techId || !RESEARCH_DEFS[techId]) return res.status(400).json({ error: 'Invalid or missing tech id' });
    const user = users[userId];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.researchedTechs) user.researchedTechs = [];
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
    // Ensure user.inventory.resources exists
    user.inventory = user.inventory || { resources: {}, units: {}, cartContents: {} };
    user.inventory.resources = user.inventory.resources || {};
    Object.values(ResourceEnum).forEach(r => { if (typeof user.inventory.resources[r] === 'undefined') user.inventory.resources[r] = 0; });

    // Check resources
    for (const [resName, amount] of Object.entries(def.cost || {})) {
        if ((user.inventory.resources[resName] || 0) < amount) return res.status(400).json({ error: `Insufficient ${resName}` });
    }
    // Deduct
    for (const [resName, amount] of Object.entries(def.cost || {})) {
        user.inventory.resources[resName] -= amount;
    }

    const now = Date.now();
    // Treat durationSeconds as ticks
    user.activeResearch = { techId, startedAt: now, ticksRemaining: def.durationSeconds, totalTicks: def.durationSeconds };
    console.log(`User ${user.username || userId} started research: ${techId}`);
    try { await saveGameState(); } catch (e) { console.error('Failed to persist after starting research', e); }
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
        // Normalize queue items: ensure timing fields exist for older saved items
        try {
            const nowMsNorm = Date.now();
            state.queue = state.queue.map(item => {
                const itm = Object.assign({}, item);
                // If ticks-based fields exist, ensure totalTime/totalTicks are set
                if (typeof itm.totalTicks === 'number' && typeof itm.totalTime === 'undefined') itm.totalTime = itm.totalTicks;
                // If ticksRemaining exists but completesAt/timeRemaining missing, compute them
                if (typeof itm.ticksRemaining === 'number') {
                    if (typeof itm.timeRemaining === 'undefined') itm.timeRemaining = itm.ticksRemaining;
                    if (typeof itm.completesAt === 'undefined') itm.completesAt = nowMsNorm + (itm.ticksRemaining * 1000);
                }
                // If completesAt exists but ticksRemaining missing, compute ticksRemaining
                if (typeof itm.completesAt === 'number' && typeof itm.ticksRemaining === 'undefined') {
                    itm.ticksRemaining = Math.max(0, Math.floor((itm.completesAt - nowMsNorm) / 1000));
                    if (typeof itm.timeRemaining === 'undefined') itm.timeRemaining = itm.ticksRemaining;
                    if (typeof itm.totalTime === 'undefined') itm.totalTime = itm.totalTicks || itm.ticksRemaining || 1;
                }
                // Ensure totalTime fallback
                if (typeof itm.totalTime === 'undefined') itm.totalTime = itm.totalTicks || itm.ticksRemaining || 1;
                return itm;
            });
        } catch (e) {
            console.error('Failed to normalize queue timing fields:', e);
        }
        const buildingsWithCosts = Object.keys(BUILDING_CONFIG).map(id => {
            const level = state.buildings[id] || 0;
            const config = BUILDING_CONFIG[id];
            const isUpgrading = state.queue.some(item => item.id === id && item.type === 'Building');
            // Use the specific queue item for this building to compute its progress
            const queueItem = state.queue.find(item => item.type === 'Building' && item.id === id);
            const upgradeSecondsRemaining = queueItem ? (typeof queueItem.ticksRemaining !== 'undefined' ? queueItem.ticksRemaining : (queueItem.timeRemaining || null)) : null;
            const upgradeTotalTime = queueItem ? (queueItem.totalTicks || queueItem.totalTime || null) : null;
            const upgradeProgress = queueItem && upgradeTotalTime ? Math.floor(((upgradeTotalTime - (upgradeSecondsRemaining || 0)) / upgradeTotalTime) * 100) : 0;

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
                timberPerWorkerPerSecond: 0.02,
                stonePerLevelPerSecond: 0.05,
                stonePitPerWorkerPerSecond: 0.02,
                breadPerLevelPerSecond: 0.12,
                foodPerWorkerPerSecond: 0.05,
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
            if (id === 'Farm' && level > 0) {
                const perWorker = RATES.foodPerWorkerPerSecond * level;
                if (assigned > 0) productionPerSecond[ResourceEnum.Food] = perWorker * assigned;
                // Hides unlocked at higher farm levels
                if (level >= 5) {
                    const hidesPerWorker = RATES.hidesPerWorkerPerSecond * level;
                    if (assigned > 0) productionPerSecond[ResourceEnum.Hides] = hidesPerWorker * assigned;
                    perWorkerRates = { [ResourceEnum.Food]: perWorker, [ResourceEnum.Hides]: hidesPerWorker };
                } else {
                    perWorkerRates = { [ResourceEnum.Food]: perWorker };
                }
            }
            if (id === 'StonePit' && level > 0) {
                const perWorker = RATES.stonePitPerWorkerPerSecond * level;
                if (assigned > 0) productionPerSecond[ResourceEnum.Stone] = perWorker * assigned;
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
        const foodTotal = (state.resources[ResourceEnum.Food] || 0)
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

    // Give initial starter buildings at level 1 for claimed area
    try {
        newState.buildings['LoggingCamp'] = 1;
        newState.buildings['Farm'] = 1;
        newState.buildings['TownHall'] = 1;
        newState.buildings['StonePit'] = 1;
        // If TownHall config defines housingByLevel, update housing capacity to level 1 value
        try {
            const thCfg = BUILDING_CONFIG['TownHall'];
            if (thCfg && Array.isArray(thCfg.housingByLevel) && thCfg.housingByLevel.length > 1) {
                newState.housingCapacity = thCfg.housingByLevel[1];
            }
        } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }

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
    if (buildingId === 'TownHall' || buildingId === 'Storehouse') return res.status(400).json({ error: 'Cannot assign villagers to the TownHall/Settlement or Storehouse' });

    // Calculate available villagers (primary unit key is 'Villager')
    const totalVillagers = state.units[UnitTypeEnum.Villager] || 0;
    const currentAssigned = Object.values(state.assignments || {}).reduce((a,b) => a + b, 0);
    const currentForThis = state.assignments[buildingId] || 0;
    const newTotalAssigned = currentAssigned - currentForThis + count;
    if (newTotalAssigned > totalVillagers) return res.status(400).json({ error: 'Not enough villagers available' });

    // Enforce per-building capacity: default to 3 + level * 1.5 if not specified in config
    const cfg = BUILDING_CONFIG[buildingId] || {};
    const maxByConfig = cfg.workerCapacity ? (cfg.workerCapacity * level) : Math.max(1, Math.floor(3 + (level * 1.5)));
    if (count > maxByConfig) return res.status(400).json({ error: `Exceeds max workers for ${buildingId}: ${maxByConfig}` });

    // Apply assignment
    if (!state.assignments) state.assignments = {};
    if (count === 0) delete state.assignments[buildingId]; else state.assignments[buildingId] = count;
    // Persist change and surface any persistence issues so client can retry
    try {
        await saveGameState();
    } catch (e) {
        console.error('Failed to save game state after assignment:', e);
        return res.status(500).json({ success: false, error: 'Failed to persist assignments' });
    }

    // Return a small snapshot to allow the client to refresh UI without full area refetch
    return res.json({ success: true, assignments: state.assignments, units: state.units, buildings: Object.keys(state.buildings).map(id => ({ id, level: state.buildings[id] })) });
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

// Cancel an in-progress building upgrade and refund remaining cost proportionally
app.post('/api/area/:areaId/cancel-upgrade', async (req, res) => {
    const userId = authFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const areaId = req.params.areaId;
    // Debug logging: surface incoming cancel requests to help diagnose 404/HTML responses
    try {
        console.log('[DEBUG] cancel-upgrade called', { areaId, body: req.body, headers: { authorization: !!req.headers['authorization'], host: req.headers['host'] } });
    } catch (e) { /* ignore logging errors */ }
    // Accept either { buildingId } for backwards compatibility, or { id, type }
    const { buildingId, id, type } = req.body || {};
    const itemId = id || buildingId;
    const itemType = (type || (buildingId ? 'Building' : null));

    if (!itemId || !itemType) return res.status(400).json({ error: 'Missing id or type' });

    // Locate area metadata
    let areaMeta = null;
    for (const r of world.regions) {
        const a = r.areas.find(x => x.id === areaId);
        if (a) { areaMeta = a; break; }
    }
    if (!areaMeta) return res.status(404).json({ error: 'Area not found' });
    if (areaMeta.ownerId !== userId) return res.status(403).json({ error: 'Not owner' });

    const state = areaStates[areaId];
    if (!state) return res.status(500).json({ error: 'Area state missing' });

    // Find queue item by type and id
    const idx = (state.queue || []).findIndex(it => (it.type === itemType) && (it.id === itemId || it.name === itemId));
    if (idx === -1) return res.status(400).json({ error: 'No such item in queue' });

    const item = state.queue[idx];
    const totalTicks = item.totalTicks || item.totalTime || 1;
    const ticksRemaining = (typeof item.ticksRemaining !== 'undefined') ? item.ticksRemaining : (item.timeRemaining || 0);
    const progress = Math.max(0, Math.min(1, (totalTicks - ticksRemaining) / totalTicks));

    // Refund logic: Buildings use calculateUpgradeCost(currentLevel); Units may have item.cost
    try {
        const refunded = {};
        if (item.type === 'Building') {
            const level = state.buildings[item.id] || 0;
            const cost = calculateUpgradeCost(item.id, level);
            for (const [res, amt] of Object.entries(cost || {})) {
                const toRefund = Math.max(0, Math.round(amt * (1 - progress)));
                if (toRefund > 0) state.resources[res] = (state.resources[res] || 0) + toRefund;
                refunded[res] = toRefund;
            }
        } else if (item.type === 'Unit') {
            // If the queued unit item stored a `cost` object, refund that proportionally; otherwise no refund
            const cost = item.cost || item.upgradeCost || null;
            if (cost) {
                for (const [res, amt] of Object.entries(cost || {})) {
                    const toRefund = Math.max(0, Math.round(amt * (1 - progress)));
                    if (toRefund > 0) state.resources[res] = (state.resources[res] || 0) + toRefund;
                    refunded[res] = toRefund;
                }
            }
        }

        // Remove the queued item
        state.queue.splice(idx, 1);
        try { await saveGameState(); } catch (e) { /* ignore save errors but continue */ }
        return res.json({ success: true, refunded, resources: state.resources });
    } catch (e) {
        console.error('Failed to cancel queue item:', e);
        return res.status(500).json({ error: 'Failed to cancel queue item' });
    }
});

// Existing gamestate endpoint (for backward compatibility) - returns default demo area
app.get('/api/gamestate', async (req, res) => {
    // On-read completion removed: The main tick loop handles queue processing now.

    const buildingsWithCosts = Object.keys(BUILDING_CONFIG).map(id => {
        const level = gameState.buildings[id] || 0;
        const config = BUILDING_CONFIG[id];
        const isUpgrading = gameState.queue.some(item => item.id === id && item.type === 'Building');
        const front = gameState.queue[0] || null;
        // Use ticksRemaining directly
        const ticksRemaining = front && front.id === id ? (front.ticksRemaining || 0) : 0;
        const totalTicks = front && front.id === id ? (front.totalTicks || 1) : 1;
        const upgradeProgress = isUpgrading && front && front.id === id ? Math.floor(((totalTicks - ticksRemaining) / totalTicks) * 100) : 0;
        
        return { 
            id, 
            name: config.name, 
            displayName: config.displayName || config.name, 
            level, 
            isLocked: false, 
            isUpgrading, 
            progress: upgradeProgress, 
            upgradeCost: calculateUpgradeCost(id, level), 
            upgradeTime: calculateBuildTime(id, level), // This is total ticks
            upgradeSecondsRemaining: ticksRemaining, // Sending ticks as "seconds" unit for now, frontend will scale
            reqs: 'None', 
            category: config.category || null, 
            tags: config.tags || [] 
        };
    });

    res.json({
        resources: gameState.resources,
        stats: { currentPop: gameState.population, maxPop: gameState.housingCapacity, approval: gameState.approval, foodTimeRemaining: 'Infinite' },
        queue: gameState.queue.map(item => {
            const rem = typeof item.ticksRemaining !== 'undefined' ? item.ticksRemaining : (item.timeRemaining || 0);
            const total = item.totalTicks || item.totalTime || 1;
            return {
                ...item,
                progress: Math.floor(((total - rem) / total) * 100),
                secondsRemaining: rem, // Sending ticks
                timeRemaining: `${rem}s` // Sending ticks as string
            };
        }),
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
