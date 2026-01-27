import type { Database, SqlValue } from 'sql.js';

export function initDb(): Promise<Database>;
export function persistDb(db: Database): Promise<void>;
export function tableExists(db: Database, name: string): boolean;
export function tableHasColumn(db: Database, table: string, column: string): boolean;
export function getSchemaVersion(db: Database): number;
export function setSchemaVersion(db: Database, version: number): void;
export function clearDbCache(): void;
export function resetDbForTests(): Promise<void>;
export type { SqlValue };
