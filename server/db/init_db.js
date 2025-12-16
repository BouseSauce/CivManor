import { Pool } from 'pg';
import { ensureSchema } from './postgres.js';

// Usage:
// PG_SUPER_URL=postgres://user:pass@host:5432/postgres DATABASE_URL=postgres://user:pass@host:5432/civbuilder node server/db/init_db.js

async function main() {
    const target = process.env.DATABASE_URL || process.env.PG_CONNECTION;
    if (!target) {
        console.error('Please set DATABASE_URL (target DB) or PG_CONNECTION');
        process.exit(1);
    }

    // parse target to get DB name
    const u = new URL(target);
    const dbName = (u.pathname || '').replace('/', '') || 'postgres';

    // admin URL to create DB if missing
    const adminUrl = process.env.PG_SUPER_URL || (() => {
        // replace path with /postgres
        try {
            const a = new URL(target);
            a.pathname = '/postgres';
            return a.toString();
        } catch (e) { return null; }
    })();

    if (!adminUrl) {
        console.error('No admin URL available to create database. Set PG_SUPER_URL to a superuser connection string or ensure target DB already exists.');
        process.exit(1);
    }

    const adminPool = new Pool({ connectionString: adminUrl });
    try {
        const exists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
        if (exists.rowCount === 0) {
            console.log(`Database ${dbName} does not exist - creating...`);
            await adminPool.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } finally {
        await adminPool.end();
    }

    // Now ensure schema on target DB
    try {
        // postgres.js expects DATABASE_URL or PG_CONNECTION to be set to target DB
        console.log('Ensuring schema on target DB...');
        await ensureSchema();
        console.log('Schema ensured.');
    } catch (err) {
        console.error('Failed to ensure schema:', err);
        process.exit(1);
    }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
