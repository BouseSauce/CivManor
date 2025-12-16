import { Pool } from 'pg';

let pool;

function getPool() {
    if (pool) return pool;
    const conn = process.env.DATABASE_URL || process.env.PG_CONNECTION;
    if (!conn) throw new Error('Postgres connection string not set (DATABASE_URL)');
    pool = new Pool({ connectionString: conn });
    return pool;
}

export async function ensureSchema() {
    const p = getPool();
    await p.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            data JSONB
        );
        CREATE TABLE IF NOT EXISTS area_states (
            area_id TEXT PRIMARY KEY,
            state JSONB
        );
        CREATE TABLE IF NOT EXISTS area_owners (
            area_id TEXT PRIMARY KEY,
            owner_id TEXT
        );
    `);
}

export async function loadAll() {
    const p = getPool();
    await ensureSchema();

    const usersRes = await p.query('SELECT id, data FROM users');
    const users = {};
    usersRes.rows.forEach(r => { users[r.id] = r.data; });

    const areasRes = await p.query('SELECT area_id, state FROM area_states');
    const areaStates = {};
    areasRes.rows.forEach(r => { areaStates[r.area_id] = r.state; });

    const ownersRes = await p.query('SELECT area_id, owner_id FROM area_owners');
    const areaOwners = {};
    ownersRes.rows.forEach(r => { areaOwners[r.area_id] = r.owner_id; });

    return { users, areaStates, areaOwners };
}

export async function saveAll({ users, areaStates, areaOwners }) {
    const p = getPool();
    await ensureSchema();
    const client = await p.connect();
    try {
        await client.query('BEGIN');
        // Upsert users
        for (const [id, u] of Object.entries(users || {})) {
            await client.query(`INSERT INTO users(id, data) VALUES($1, $2) ON CONFLICT(id) DO UPDATE SET data = EXCLUDED.data`, [id, u]);
        }
        // Upsert area states
        for (const [areaId, s] of Object.entries(areaStates || {})) {
            await client.query(`INSERT INTO area_states(area_id, state) VALUES($1, $2) ON CONFLICT(area_id) DO UPDATE SET state = EXCLUDED.state`, [areaId, s]);
        }
        // Upsert owners
        for (const [areaId, ownerId] of Object.entries(areaOwners || {})) {
            await client.query(`INSERT INTO area_owners(area_id, owner_id) VALUES($1, $2) ON CONFLICT(area_id) DO UPDATE SET owner_id = EXCLUDED.owner_id`, [areaId, ownerId]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
