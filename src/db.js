import { del, get, set } from 'idb-keyval';
import { openDatabase } from './sqljs.js';
import { computeExpiry } from './utils/time.js';

const STORAGE_KEY = 'prayer-sql-db';
let dbInstance = null;

const SCHEMA_VERSION = 2;

async function loadDbBytes() {
  const buffer = await get(STORAGE_KEY);
  return buffer ? new Uint8Array(buffer) : undefined;
}

async function persistDb(db) {
  const bytes = db.export();
  await set(STORAGE_KEY, bytes.buffer);
}

function tableExists(db, name) {
  const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return Boolean(result[0]?.values?.length);
}

function tableHasColumn(db, table, column) {
  if (!tableExists(db, table)) return false;
  const result = db.exec(`PRAGMA table_info(${table})`);
  const rows = result[0]?.values ?? [];
  return rows.some((row) => row[1] === column);
}

function getSchemaVersion(db) {
  if (!tableExists(db, 'schema_version')) {
    return 1;
  }
  const result = db.exec('SELECT version FROM schema_version');
  return Number(result[0]?.values?.[0]?.[0] ?? 1);
}

function setSchemaVersion(db, version) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  db.exec('DELETE FROM schema_version');
  db.exec(`INSERT INTO schema_version (version) VALUES (${version})`);
}

function createSchemaV2(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      priority TEXT NOT NULL,
      durationPreset TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      status TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      requestId TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      isAnswer INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS prayer_events (
      id TEXT PRIMARY KEY,
      requestId TEXT NOT NULL,
      prayedAt INTEGER NOT NULL
    );
  `);
}

function migrateV1ToV2(db) {
  db.run('BEGIN');
  try {
    db.exec('ALTER TABLE requests RENAME TO requests_v1');
    createSchemaV2(db);

    const result = db.exec(`
      SELECT id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt
      FROM requests_v1
    `);
    const rows = result[0]?.values ?? [];

    const insertRequest = db.prepare(`
      INSERT INTO requests (
        id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, requestId, text, createdAt, isAnswer, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPrayer = db.prepare(`
      INSERT INTO prayer_events (
        id, requestId, prayedAt
      ) VALUES (?, ?, ?)
    `);

    for (const row of rows) {
      const [id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt] = row;

      insertRequest.run([id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt]);

      const prayedList = JSON.parse(prayedAt || '[]');
      for (const prayedTimestamp of prayedList) {
        insertPrayer.run([crypto.randomUUID(), id, prayedTimestamp]);
      }

      const noteList = JSON.parse(notes || '[]');
      for (const note of noteList) {
        const normalizedText = typeof note.text === 'string' ? note.text.trim() : '';
        if (!normalizedText) continue;
        insertNote.run([
          note.id || crypto.randomUUID(),
          id,
          normalizedText,
          note.createdAt || createdAt,
          note.isAnswer ? 1 : 0,
          note.updatedAt || note.createdAt || updatedAt,
        ]);
      }
    }

    insertRequest.free();
    insertNote.free();
    insertPrayer.free();
    db.exec('DROP TABLE requests_v1');
    setSchemaVersion(db, SCHEMA_VERSION);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

function ensureSchema(db) {
  const hasRequests = tableExists(db, 'requests');
  if (!hasRequests) {
    createSchemaV2(db);
    setSchemaVersion(db, SCHEMA_VERSION);
    return;
  }

  const version = getSchemaVersion(db);
  if (version < SCHEMA_VERSION) {
    const needsMigration = tableHasColumn(db, 'requests', 'prayedAt') || tableHasColumn(db, 'requests', 'notes');
    if (needsMigration) {
      migrateV1ToV2(db);
    } else {
      createSchemaV2(db);
      setSchemaVersion(db, SCHEMA_VERSION);
    }
  } else {
    createSchemaV2(db);
  }
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
    prayedAt: row.prayedAt || [],
    notes: row.notes || [],
    updatedAt: row.updatedAt,
  };
}

export async function fetchAllRequests() {
  const db = await initDb();
  const result = db.exec(`
    SELECT id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt
    FROM requests
    ORDER BY createdAt DESC
  `);
  const rows = result[0]?.values ?? [];
  const baseRequests = rows.map(([id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt]) =>
    deserializeRequest({
      id,
      title,
      priority,
      durationPreset,
      createdAt,
      expiresAt,
      status,
      updatedAt,
    })
  );

  const notesResult = db.exec(`
    SELECT id, requestId, text, createdAt, isAnswer, updatedAt
    FROM notes
    ORDER BY createdAt DESC
  `);
  const notesRows = notesResult[0]?.values ?? [];
  const notesByRequest = new Map();
  for (const [id, requestId, text, createdAt, isAnswer, updatedAt] of notesRows) {
    const list = notesByRequest.get(requestId) || [];
    list.push({
      id,
      text,
      createdAt,
      isAnswer: Boolean(isAnswer),
      updatedAt,
    });
    notesByRequest.set(requestId, list);
  }

  const prayersResult = db.exec(`
    SELECT requestId, prayedAt
    FROM prayer_events
  `);
  const prayersRows = prayersResult[0]?.values ?? [];
  const prayersByRequest = new Map();
  for (const [requestId, prayedAt] of prayersRows) {
    const list = prayersByRequest.get(requestId) || [];
    list.push(prayedAt);
    prayersByRequest.set(requestId, list);
  }

  return baseRequests.map((request) => ({
    ...request,
    notes: notesByRequest.get(request.id) || [],
    prayedAt: prayersByRequest.get(request.id) || [],
  }));
}

export async function saveRequest(record) {
  const db = await initDb();
  db.run('BEGIN');
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO requests (
        id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      record.id,
      record.title,
      record.priority,
      record.durationPreset,
      record.createdAt,
      record.expiresAt,
      record.status,
      record.updatedAt,
    ]);
    stmt.free();

    const deleteNotes = db.prepare('DELETE FROM notes WHERE requestId = ?');
    const deletePrayers = db.prepare('DELETE FROM prayer_events WHERE requestId = ?');
    deleteNotes.run([record.id]);
    deletePrayers.run([record.id]);
    deleteNotes.free();
    deletePrayers.free();

    const noteStmt = db.prepare(`
      INSERT INTO notes (
        id, requestId, text, createdAt, isAnswer, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const note of record.notes || []) {
      noteStmt.run([
        note.id || crypto.randomUUID(),
        record.id,
        note.text || '',
        note.createdAt || record.updatedAt,
        note.isAnswer ? 1 : 0,
        note.updatedAt || note.createdAt || record.updatedAt,
      ]);
    }
    noteStmt.free();

    const prayerStmt = db.prepare(`
      INSERT INTO prayer_events (
        id, requestId, prayedAt
      ) VALUES (?, ?, ?)
    `);
    for (const prayedAt of record.prayedAt || []) {
      prayerStmt.run([crypto.randomUUID(), record.id, prayedAt]);
    }
    prayerStmt.free();

    db.run('COMMIT');
    await persistDb(db);
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

export async function deleteRequest(id) {
  const db = await initDb();
  try {
    const deleteNotes = db.prepare('DELETE FROM notes WHERE requestId = ?');
    const deletePrayers = db.prepare('DELETE FROM prayer_events WHERE requestId = ?');
    deleteNotes.run([id]);
    deletePrayers.run([id]);
    deleteNotes.free();
    deletePrayers.free();
    const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    await persistDb(db);
  } catch (error) {
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
        id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, requestId, text, createdAt, isAnswer, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPrayer = db.prepare(`
      INSERT INTO prayer_events (
        id, requestId, prayedAt
      ) VALUES (?, ?, ?)
    `);

    const outreachId = crypto.randomUUID();
    insert.run([
      outreachId,
      'Community outreach',
      'high',
      '3m',
      outreachCreated,
      computeExpiry(outreachCreated, '3m'),
      'active',
      now - 1000 * 60 * 60 * 2,
    ]);
    insertPrayer.run([crypto.randomUUID(), outreachId, now - 1000 * 60 * 60 * 2]);
    insertNote.run([
      crypto.randomUUID(),
      outreachId,
      'Met with two new neighbors.',
      now - 1000 * 60 * 60 * 12,
      0,
      now - 1000 * 60 * 60 * 12,
    ]);

    const familyId = crypto.randomUUID();
    insert.run([
      familyId,
      'Family health',
      'urgent',
      '10d',
      familyCreated,
      computeExpiry(familyCreated, '10d'),
      'active',
      now - 1000 * 60 * 60 * 24,
    ]);
    insert.free();
    insertNote.free();
    insertPrayer.free();
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
