import { Pool } from 'pg';
import { ENV } from '@/lib/constants';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    if (!ENV.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL/POSTGRES_URL não configurada. Configure a conexão com o Postgres (Supabase) para usar a aplicação.'
      );
    }
    pool = new Pool({
      connectionString: ENV.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Executa uma consulta SQL no banco PostgreSQL.
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const p = getDbPool();
  const result = await p.query(text, params);
  return result.rows as T[];
}

/**
 * Executa uma instrução SQL e retorna a primeira linha ou null
 */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
