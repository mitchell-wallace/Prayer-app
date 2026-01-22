/**
 * @internal
 * Low-level database operations for sql.js + IndexedDB persistence.
 * External code should use repositories (src/repositories/) instead.
 */
import { del, get, set } from 'idb-keyval';
import type { Database, SqlValue } from 'sql.js';
import type { DurationPreset, Note, PrayerRequest, Priority, RequestStatus } from '../core/types';
import { computeExpiry } from '../formatting/time';
import { openDatabase } from './sqljs';

const STORAGE_KEY = 'prayer-sql-db';
let dbInstance: Database | null = null;

const SCHEMA_VERSION = 2;

const VALID_PRIORITIES = new Set<string>(['urgent', 'high', 'medium', 'low']);
const VALID_STATUSES = new Set<string>(['active', 'answered']);
const VALID_DURATIONS = new Set<string>(['10d', '1m', '3m', '6m', '1y']);

function validatePriority(value: string): Priority {
  if (VALID_PRIORITIES.has(value)) return value as Priority;
  console.warn(`Invalid priority "${value}", defaulting to "medium"`);
  return 'medium';
}

function validateStatus(value: string): RequestStatus {
  if (VALID_STATUSES.has(value)) return value as RequestStatus;
  console.warn(`Invalid status "${value}", defaulting to "active"`);
  return 'active';
}

function validateDuration(value: string): DurationPreset {
  if (VALID_DURATIONS.has(value)) return value as DurationPreset;
  console.warn(`Invalid duration "${value}", defaulting to "6m"`);
  return '6m';
}

type BaseRequestRecord = Omit<PrayerRequest, 'notes' | 'prayedAt'> & {
  notes?: Note[];
  prayedAt?: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringValue(value: SqlValue): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function toNumberValue(value: SqlValue): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function parseJsonArray(value: SqlValue): unknown[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadDbBytes(): Promise<Uint8Array | undefined> {
  const buffer = await get<ArrayBuffer | Uint8Array | undefined>(STORAGE_KEY);
  if (!buffer) return undefined;
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

async function persistDb(db: Database): Promise<void> {
  const bytes = db.export();
  await set(STORAGE_KEY, bytes.buffer);
}

function tableExists(db: Database, name: string): boolean {
  const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return Boolean(result[0]?.values?.length);
}

function tableHasColumn(db: Database, table: string, column: string): boolean {
  if (!tableExists(db, table)) return false;
  const result = db.exec(`PRAGMA table_info(${table})`);
  const rows = result[0]?.values ?? [];
  return rows.some((row: unknown[]) => row[1] === column);
}

function getSchemaVersion(db: Database): number {
  if (!tableExists(db, 'schema_version')) {
    return 1;
  }
  const result = db.exec('SELECT version FROM schema_version');
  return Number(result[0]?.values?.[0]?.[0] ?? 1);
}

function setSchemaVersion(db: Database, version: number): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  db.exec('DELETE FROM schema_version');
  db.exec(`INSERT INTO schema_version (version) VALUES (${version})`);
}

function createSchemaV2(db: Database): void {
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

function migrateV1ToV2(db: Database): void {
  db.run('BEGIN');
  try {
    db.exec('ALTER TABLE requests RENAME TO requests_v1');
    createSchemaV2(db);

    const result = db.exec(`
      SELECT id, title, priority, durationPreset, createdAt, expiresAt, status, prayedAt, notes, updatedAt
      FROM requests_v1
    `);
    const rows: SqlValue[][] = result[0]?.values ?? [];

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
      const [
        idValue,
        titleValue,
        priorityValue,
        durationPresetValue,
        createdAtValue,
        expiresAtValue,
        statusValue,
        prayedAtValue,
        notesValue,
        updatedAtValue,
      ] = row;

      const id = toStringValue(idValue);
      const title = toStringValue(titleValue);
      const priority = validatePriority(toStringValue(priorityValue));
      const durationPreset = validateDuration(toStringValue(durationPresetValue));
      const createdAt = toNumberValue(createdAtValue);
      const expiresAt = toNumberValue(expiresAtValue);
      const status = validateStatus(toStringValue(statusValue));
      const updatedAt = toNumberValue(updatedAtValue);

      insertRequest.run([id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt]);

      const prayedList = parseJsonArray(prayedAtValue);
      for (const prayedTimestamp of prayedList) {
        if (typeof prayedTimestamp === 'number') {
          insertPrayer.run([crypto.randomUUID(), id, prayedTimestamp]);
        }
      }

      const noteList = parseJsonArray(notesValue);
      for (const note of noteList) {
        if (!isRecord(note)) continue;
        const normalizedText = typeof note.text === 'string' ? note.text.trim() : '';
        if (!normalizedText) continue;
        const isAnswer = note.isAnswer === true;
        insertNote.run([
          typeof note.id === 'string' ? note.id : crypto.randomUUID(),
          id,
          normalizedText,
          typeof note.createdAt === 'number' ? note.createdAt : createdAt,
          isAnswer ? 1 : 0,
          typeof note.updatedAt === 'number'
            ? note.updatedAt
            : typeof note.createdAt === 'number'
              ? note.createdAt
              : updatedAt,
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

function ensureSchema(db: Database): void {
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

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  const bytes = await loadDbBytes();
  const db = await openDatabase(bytes);
  ensureSchema(db);
  dbInstance = db;
  return dbInstance;
}

function deserializeRequest(row: BaseRequestRecord): PrayerRequest {
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    durationPreset: row.durationPreset,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    status: row.status,
    prayedAt: row.prayedAt ?? [],
    notes: row.notes ?? [],
    updatedAt: row.updatedAt,
  };
}

export async function fetchAllRequests(): Promise<PrayerRequest[]> {
  const db = await initDb();
  const result = db.exec(`
    SELECT id, title, priority, durationPreset, createdAt, expiresAt, status, updatedAt
    FROM requests
    ORDER BY createdAt DESC
  `);
  const rows: SqlValue[][] = result[0]?.values ?? [];
  const baseRequests = rows.map(
    ([
      idValue,
      titleValue,
      priorityValue,
      durationPresetValue,
      createdAtValue,
      expiresAtValue,
      statusValue,
      updatedAtValue,
    ]) =>
      deserializeRequest({
        id: toStringValue(idValue),
        title: toStringValue(titleValue),
        priority: validatePriority(toStringValue(priorityValue)),
        durationPreset: validateDuration(toStringValue(durationPresetValue)),
        createdAt: toNumberValue(createdAtValue),
        expiresAt: toNumberValue(expiresAtValue),
        status: validateStatus(toStringValue(statusValue)),
        updatedAt: toNumberValue(updatedAtValue),
      })
  );

  const notesResult = db.exec(`
    SELECT id, requestId, text, createdAt, isAnswer, updatedAt
    FROM notes
    ORDER BY createdAt DESC
  `);
  const notesRows: SqlValue[][] = notesResult[0]?.values ?? [];
  const notesByRequest = new Map<string, Note[]>();
  for (const [id, requestId, text, createdAt, isAnswer, updatedAt] of notesRows) {
    const requestKey = toStringValue(requestId);
    const list = notesByRequest.get(requestKey) || [];
    list.push({
      id: toStringValue(id),
      text: toStringValue(text),
      createdAt: toNumberValue(createdAt),
      isAnswer: Boolean(isAnswer),
      updatedAt: toNumberValue(updatedAt),
    });
    notesByRequest.set(requestKey, list);
  }

  const prayersResult = db.exec(`
    SELECT requestId, prayedAt
    FROM prayer_events
  `);
  const prayersRows: SqlValue[][] = prayersResult[0]?.values ?? [];
  const prayersByRequest = new Map<string, number[]>();
  for (const [requestId, prayedAt] of prayersRows) {
    const requestKey = toStringValue(requestId);
    const list = prayersByRequest.get(requestKey) || [];
    list.push(toNumberValue(prayedAt));
    prayersByRequest.set(requestKey, list);
  }

  return baseRequests.map((request) => ({
    ...request,
    notes: notesByRequest.get(request.id) || [],
    prayedAt: prayersByRequest.get(request.id) || [],
  }));
}

export async function saveRequest(record: PrayerRequest): Promise<void> {
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

export async function deleteRequest(id: string): Promise<void> {
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
    if (error instanceof Error) {
      throw new Error(`Failed to delete request ${id}: ${error.message}`);
    }
    throw new Error(`Failed to delete request ${id}.`);
  }
}

async function countRequests(): Promise<number> {
  const db = await initDb();
  const result = db.exec('SELECT COUNT(*) as count FROM requests');
  const count = result[0]?.values?.[0]?.[0] ?? 0;
  return Number(count);
}

export async function bootstrapSeed(): Promise<void> {
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

export function clearDbCache(): void {
  dbInstance = null;
}

export async function resetDbForTests(): Promise<void> {
  dbInstance = null;
  await del(STORAGE_KEY);
}
