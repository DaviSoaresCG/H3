import { Pool } from 'pg';
import { ENV } from '@/lib/constants';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: ENV.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eventpoint',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

/**
 * Executa uma consulta SQL no banco PostgreSQL.
 * Caso o banco não esteja rodando ou a base não exista, captura o erro e permite o fallback.
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  try {
    const p = getDbPool();
    const result = await p.query(text, params);
    return result.rows as T[];
  } catch (error: any) {
    console.warn(`[DB Connection Warning]: ${error.message || 'Sem conexão com banco'}. Usando modo de demonstração.`);
    throw error; // Re-lança para que os handlers usem seus fallbacks
  }
}

/**
 * Executa uma instrução SQL e retorna a primeira linha ou null
 */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  try {
    const rows = await query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    return null;
  }
}
