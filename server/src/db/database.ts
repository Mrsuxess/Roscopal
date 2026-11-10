import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface PreparedStatement {
  bind(...params: any[]): PreparedStatement;
  all<T = any>(): Promise<{ results: T[] }>;
  first<T = any>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: { changes: number } }>;
  // Expose underlying D1 statement when wrapping D1
  rawStatement?: any;
}

export interface DatabaseDriver {
  prepare(sql: string): PreparedStatement;
  queryAll<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number }>;
  batch(statements: PreparedStatement[]): Promise<any[]>;
  raw(sql: string): Promise<void>;
  close?(): Promise<void>;
}

// -------------------------------------------------------------
// Cloudflare D1 Driver Implementation
// -------------------------------------------------------------
export class D1Driver implements DatabaseDriver {
  private d1: any;

  constructor(d1Database: any) {
    if (!d1Database) throw new Error('D1Database binding is required for D1Driver');
    this.d1 = d1Database;
  }

  prepare(sql: string): PreparedStatement {
    let stmt = this.d1.prepare(sql);
    const wrapper: PreparedStatement = {
      rawStatement: stmt,
      bind(...params: any[]) {
        stmt = stmt.bind(...params);
        wrapper.rawStatement = stmt;
        return wrapper;
      },
      async all<T = any>() {
        const res = await stmt.all();
        return { results: (res.results || []) as T[] };
      },
      async first<T = any>() {
        const res = await stmt.first();
        return (res ?? null) as T | null;
      },
      async run() {
        const res = await stmt.run();
        return {
          success: res.success ?? true,
          meta: { changes: res.meta?.changes ?? 1 }
        };
      }
    };
    return wrapper;
  }

  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.prepare(sql).bind(...params);
    const { results } = await stmt.all<T>();
    return results;
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.prepare(sql).bind(...params);
    return await stmt.first<T>();
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const stmt = this.prepare(sql).bind(...params);
    const res = await stmt.run();
    return { changes: res.meta.changes };
  }

  async batch(statements: PreparedStatement[]): Promise<any[]> {
    const rawStmts = statements.map(s => s.rawStatement || s);
    return await this.d1.batch(rawStmts);
  }

  async raw(sql: string): Promise<void> {
    await this.d1.exec(sql);
  }
}

// -------------------------------------------------------------
// Local SQLite (sql.js) Driver Implementation for Node / Dev / Tests
// -------------------------------------------------------------
export class LocalSqliteDriver implements DatabaseDriver {
  private db: SqlJsDatabase;
  private filePath?: string;
  private inTx = false;

  constructor(db: SqlJsDatabase, filePath?: string) {
    this.db = db;
    this.filePath = filePath;
  }

  private persist() {
    if (this.filePath && !this.inTx) {
      try {
        const data = this.db.export();
        fs.writeFileSync(this.filePath, Buffer.from(data));
      } catch (err) {
        console.error('Failed to persist local SQLite file:', err);
      }
    }
  }

  prepare(sql: string): PreparedStatement {
    const self = this;
    let boundParams: any[] = [];

    const prep: PreparedStatement = {
      bind(...params: any[]) {
        boundParams = params;
        return prep;
      },
      async all<T = any>() {
        const stmt = self.db.prepare(sql);
        stmt.bind(boundParams);
        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        stmt.free();
        return { results: rows };
      },
      async first<T = any>() {
        const { results } = await prep.all<T>();
        return results.length > 0 ? results[0] : null;
      },
      async run() {
        const stmt = self.db.prepare(sql);
        stmt.run(boundParams);
        stmt.free();
        const changes = self.db.getRowsModified();
        self.persist();
        return { success: true, meta: { changes } };
      }
    };
    return prep;
  }

  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return (await this.prepare(sql).bind(...params).all<T>()).results;
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return await this.prepare(sql).bind(...params).first<T>();
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const res = await this.prepare(sql).bind(...params).run();
    return { changes: res.meta.changes };
  }

  async batch(statements: PreparedStatement[]): Promise<any[]> {
    this.inTx = true;
    this.db.run('BEGIN IMMEDIATE');
    try {
      const results: any[] = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      this.db.run('COMMIT');
      this.inTx = false;
      this.persist();
      return results;
    } catch (err) {
      try {
        this.db.run('ROLLBACK');
      } catch (e) {}
      this.inTx = false;
      throw err;
    }
  }

  async raw(sql: string): Promise<void> {
    this.db.run(sql);
    this.persist();
  }
}

// -------------------------------------------------------------
// Singleton and Global Accessor
// -------------------------------------------------------------
let globalDriver: DatabaseDriver | null = null;

export function setDatabaseDriver(driver: DatabaseDriver): void {
  globalDriver = driver;
}

export function getDatabase(): DatabaseDriver {
  if (!globalDriver) {
    throw new Error('Database driver not initialized. Call initDatabase() or setDatabaseDriver() first.');
  }
  return globalDriver;
}

export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return getDatabase().queryAll<T>(sql, params);
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return getDatabase().queryOne<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
  return getDatabase().execute(sql, params);
}

export async function batch(statements: PreparedStatement[]): Promise<any[]> {
  return getDatabase().batch(statements);
}

export async function initDatabase(driver?: DatabaseDriver): Promise<DatabaseDriver> {
  if (driver) {
    globalDriver = driver;
    return globalDriver;
  }

  if (globalDriver) return globalDriver;

  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
  const dbFile = process.env.DATABASE_PATH || path.join(dataDir, 'roscopal.sqlite');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();
  let sqlJsDb: SqlJsDatabase;

  if (fs.existsSync(dbFile)) {
    const fileBuffer = fs.readFileSync(dbFile);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  const localDriver = new LocalSqliteDriver(sqlJsDb, dbFile);

  // Apply schema migrations
  const migrationPath = path.resolve(__dirname, '../../migrations/0001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const schemaSql = fs.readFileSync(migrationPath, 'utf8');
    await localDriver.raw(schemaSql);
  }

  globalDriver = localDriver;
  return globalDriver;
}
