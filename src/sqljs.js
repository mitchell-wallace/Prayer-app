import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let sqlInstance = null;
let nodeWasmBinary = null;
let nodeWasmPath = null;

function resolveWasmPath() {
  if (typeof process !== 'undefined' && process.versions?.node) {
    nodeWasmPath = nodeWasmPath || `${process.cwd()}/node_modules/sql.js/dist/sql-wasm.wasm`;
    return nodeWasmPath;
  }
  return wasmUrl;
}

export async function getSqlModule() {
  if (sqlInstance) return sqlInstance;
  const options = {
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

export async function openDatabase(bytes) {
  const SQL = await getSqlModule();
  return new SQL.Database(bytes);
}
