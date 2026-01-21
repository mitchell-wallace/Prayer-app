import initSqlJs from 'sql.js';
import type { Database, SqlJsConfig, SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let sqlInstance: SqlJsStatic | null = null;
let nodeWasmBinary: Uint8Array | null = null;
let nodeWasmPath: string | null = null;

function resolveWasmPath(): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    nodeWasmPath = nodeWasmPath || `${process.cwd()}/node_modules/sql.js/dist/sql-wasm.wasm`;
    return nodeWasmPath;
  }
  return wasmUrl;
}

export async function getSqlModule(): Promise<SqlJsStatic> {
  if (sqlInstance) return sqlInstance;
  const options: SqlJsConfig = {
    locateFile: () => resolveWasmPath(),
  };

  if (typeof process !== 'undefined' && process.versions?.node) {
    if (!nodeWasmBinary) {
      const fs = await import('node:fs/promises');
      nodeWasmBinary = await fs.readFile(resolveWasmPath());
    }
    options.wasmBinary = nodeWasmBinary;
  }

  sqlInstance = await initSqlJs(options);
  return sqlInstance;
}

export async function openDatabase(bytes?: Uint8Array): Promise<Database> {
  const SQL = await getSqlModule();
  return new SQL.Database(bytes);
}
