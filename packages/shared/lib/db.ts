import { Pool, PoolClient } from "pg";

// Create a singleton pool for database connections
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Enable SSL for production PostgreSQL connections (required by RDS)
const isProduction = process.env.NODE_ENV === "production";

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// Helper to get a client from the pool
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Helper for simple queries
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper for single row queries
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

// Helper for insert/update/delete that returns affected rows
export async function execute(
  text: string,
  params?: unknown[]
): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
