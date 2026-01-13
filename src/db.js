import { del, get, set } from 'idb-keyval';
import { openDatabase } from './sqljs.js';
import { computeExpiry } from './utils/time.js';

const STORAGE_KEY = 'prayer-sql-db';
let dbInstance = null;

async function loadDbBytes() {
  const buffer = await get(STORAGE_KEY);
  return buffer ? new Uint8Array(buffer) : undefined;
}

async function persistDb(db) {
  const bytes = db.export();
  await set(STORAGE_KEY, bytes.buffer);
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      priority TEXT NOT NULL,
      durationPreset TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      status TEXT NOT NULL,
      prayedAt TEXT NOT NULL,
      notes TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

export async function initDb() {
  if (dbInstance) return dbInstance;
  const bytes = await loadDbBytes();
  const db = await openDatabase(bytes);
  ensureSchema(db);
  dbInstance = db;
  return dbInstance;
}

function deserializeRequest(row) {
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    durationPreset: row.durationPreset,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    status: row.status,
    prayedAt: JSON.parse(row.prayedAt || '[]'),
    notes: JSON.parse(row.notes || '[]'),
    updatedAt: row.updatedAt,
  };
}

export async function fetchAllRequests() {
  const db = await initDb();
  const result = db.exec(`
    SELECT id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt
    FROM requests
    ORDER BY createdAt DESC
  `);
  const rows = result[0]?.values ?? [];
  return rows.map(([id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt]) =>
    deserializeRequest({
      id,
      title,
      priority,
      durationPreset,
      createdAt,
      expiresAt,
      status,
      prayedAt,
      notes,
      updatedAt,
    })
  );
}

export async function saveRequest(record) {
  const db = await initDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO requests (
      id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    record.id,
    record.title,
    record.priority,
    record.durationPreset,
    record.createdAt,
    record.expiresAt,
    record.status,
    JSON.stringify(record.prayedAt || []),
    JSON.stringify(record.notes || []),
    record.updatedAt,
  ]);
  stmt.free();
  await persistDb(db);
}

export async function deleteRequest(id) {
  const db = await initDb();
  const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
  try {
    stmt.run([id]);
    stmt.free();
    await persistDb(db);
  } catch (error) {
    stmt.free();
    throw new Error(`Failed to delete request ${id}: ${error.message}`);
  }
}

async function countRequests() {
  const db = await initDb();
  const result = db.exec('SELECT COUNT(*) as count FROM requests');
  const count = result[0]?.values?.[0]?.[0] ?? 0;
  return Number(count);
}

export async function bootstrapSeed() {
  const existing = await countRequests();
  if (existing > 0) return;
  const db = await initDb();
  const now = Date.now();
  const outreachCreated = now - 1000 * 60 * 60 * 24 * 3;
  const familyCreated = now - 1000 * 60 * 60 * 24;
  db.run('BEGIN');
  try {
    const insert = db.prepare(`
      INSERT INTO requests (
        id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run([
      crypto.randomUUID(),
      'Community outreach',
      'high',
      '3m',
      outreachCreated,
      computeExpiry(outreachCreated, '3m'),
      'active',
      JSON.stringify([now - 1000 * 60 * 60 * 2]),
      JSON.stringify([
        { id: crypto.randomUUID(), text: 'Met with two new neighbors.', createdAt: now - 1000 * 60 * 60 * 12 },
      ]),
      now - 1000 * 60 * 60 * 2,
    ]);
    insert.run([
      crypto.randomUUID(),
      'Family health',
      'urgent',
      '10d',
      familyCreated,
      computeExpiry(familyCreated, '10d'),
      'active',
      JSON.stringify([]),
      JSON.stringify([]),
      now - 1000 * 60 * 60 * 24,
    ]);
    insert.free();
    db.run('COMMIT');
    await persistDb(db);
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

export function clearDbCache() {
  dbInstance = null;
}

export async function resetDbForTests() {
  dbInstance = null;
  await del(STORAGE_KEY);
}
