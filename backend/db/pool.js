import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const isNeon = (process.env.DATABASE_URL || '').includes('neon.tech');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon needs SSL; local PostgreSQL 16 on Windows does not
  ssl: isNeon ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

// Simple wrapper — callers never touch clients directly
export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

export default pool;
