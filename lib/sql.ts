import { Pool, types, type PoolClient, type QueryResult } from "pg";
import { toPostgres } from "./sql-dialect";

// BIGINT and NUMERIC arrive as strings by default; the app treats counters and timestamps as numbers.
types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

type PoolHolder = typeof globalThis & { __pracaPool?: Pool };

export function getPool(): Pool {
  const holder = globalThis as PoolHolder;
  if (!holder.__pracaPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set.");
    // pg treats sslmode=require as verify-full today; say so explicitly to keep that behavior.
    const secured = connectionString.replace("sslmode=require", "sslmode=verify-full");
    holder.__pracaPool = new Pool({
      connectionString: secured,
      max: 8,
      idleTimeoutMillis: 10_000,
    });
  }
  return holder.__pracaPool;
}

export interface SqlResult<T = Record<string, unknown>> {
  results: T[];
  success: true;
  meta: { changes: number; rows_read: number };
}

type Queryable = Pick<Pool | PoolClient, "query">;

function normalize(result: QueryResult): SqlResult {
  const rows = (result.rows ?? []) as Record<string, unknown>[];
  return {
    results: rows,
    success: true,
    meta: { changes: result.rowCount ?? rows.length, rows_read: rows.length },
  };
}

function cleanParams(params: unknown[]) {
  return params.map((value) => (value === undefined ? null : value));
}

export class Statement {
  constructor(
    private readonly connection: () => Queryable,
    readonly sql: string,
    readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new Statement(this.connection, this.sql, params);
  }

  async execute(connection: Queryable = this.connection()): Promise<SqlResult> {
    return normalize(await connection.query(toPostgres(this.sql), cleanParams(this.params)));
  }

  async all<T = Record<string, unknown>>(): Promise<SqlResult<T>> {
    return (await this.execute()) as SqlResult<T>;
  }

  async run<T = Record<string, unknown>>(): Promise<SqlResult<T>> {
    return (await this.execute()) as SqlResult<T>;
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const { results } = await this.execute();
    const row = results[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const { results } = await this.execute();
    return results.map((row) => Object.values(row)) as T[];
  }
}

/** D1-shaped facade over Postgres: prepare/bind/first/all/run plus atomic batch. */
export class Database {
  constructor(private readonly pool: () => Pool = getPool) {}

  prepare(sql: string) {
    return new Statement(() => this.pool(), sql);
  }

  async batch(statements: Statement[]): Promise<SqlResult[]> {
    const client = await this.pool().connect();
    try {
      await client.query("BEGIN");
      const results: SqlResult[] = [];
      for (const statement of statements) results.push(await statement.execute(client));
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

let database: Database | undefined;
export function getDatabase() {
  return (database ??= new Database());
}
