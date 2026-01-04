import Dexie from 'dexie';
import { computeExpiry } from './utils/time.js';

export const db = new Dexie('prayer-list');

db.version(1).stores({
  requests: '&id, status, priority, durationPreset, createdAt, updatedAt, expiresAt',
});

export async function bootstrapSeed() {
  const count = await db.requests.count();
  if (count > 0) return;
  const now = Date.now();
  const outreachCreated = now - 1000 * 60 * 60 * 24 * 3;
  const familyCreated = now - 1000 * 60 * 60 * 24;
  await db.requests.bulkAdd([
    {
      id: crypto.randomUUID(),
      title: 'Community outreach',
      priority: 'high',
      durationPreset: '3m',
      createdAt: outreachCreated,
      expiresAt: computeExpiry(outreachCreated, '3m'),
      status: 'active',
      prayedAt: [now - 1000 * 60 * 60 * 2],
      updatedAt: now - 1000 * 60 * 60 * 2,
      notes: [
        { id: crypto.randomUUID(), text: 'Met with two new neighbors.', createdAt: now - 1000 * 60 * 60 * 12 },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: 'Family health',
      priority: 'urgent',
      durationPreset: '10d',
      createdAt: familyCreated,
      expiresAt: computeExpiry(familyCreated, '10d'),
      status: 'active',
      prayedAt: [],
      updatedAt: now - 1000 * 60 * 60 * 24,
      notes: [],
    },
  ]);
}
