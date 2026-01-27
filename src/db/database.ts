/**
 * @internal
 * Low-level database operations for sql.js + IndexedDB persistence.
 * External code should use repositories (src/repositories/) instead.
 */
import { del, get, set } from 'idb-keyval';
import type { Database } from 'sql.js';
import { openDatabase } from './sqljs';

const STORAGE_KEY = 'prayer-sql-db';
let dbInstance: Database | null = null;

export type { SqlValue } from 'sql.js';

async function loadDbBytes(): Promise<Uint8Array | undefined> {
  const buffer = await get<ArrayBuffer | Uint8Array | undefined>(STORAGE_KEY);
  if (!buffer) return undefined;
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

export async function persistDb(db: Database): Promise<void> {
  const bytes = db.export();
  await set(STORAGE_KEY, bytes.buffer);
}

export function tableExists(db: Database, name: string): boolean {
  const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return Boolean(result[0]?.values?.length);
}

export function tableHasColumn(db: Database, table: string, column: string): boolean {
  if (!tableExists(db, table)) return false;
  const result = db.exec(`PRAGMA table_info(${table})`);
  const rows = result[0]?.values ?? [];
  return rows.some((row: unknown[]) => row[1] === column);
}

export function getSchemaVersion(db: Database): number {
  if (!tableExists(db, 'schema_version')) {
    return 1;
  }
  const result = db.exec('SELECT version FROM schema_version');
  return Number(result[0]?.values?.[0]?.[0] ?? 1);
}

export function setSchemaVersion(db: Database, version: number): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  db.exec('DELETE FROM schema_version');
  db.exec(`INSERT INTO schema_version (version) VALUES (${version})`);
}

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  const bytes = await loadDbBytes();
  const db = await openDatabase(bytes);
  dbInstance = db;
  return dbInstance;
}

export function clearDbCache(): void {
  dbInstance = null;
}

export async function resetDbForTests(): Promise<void> {
  dbInstance = null;
  await del(STORAGE_KEY);
}
