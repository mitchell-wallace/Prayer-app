import Dexie from 'dexie';

export const db = new Dexie('prayer-list');

db.version(1).stores({
  requests: '&id, status, priority, durationPreset, createdAt, updatedAt, expiresAt',
});

export async function bootstrapSeed() {
  const count = await db.requests.count();
  if (count > 0) return;
  const now = Date.now();
  await db.requests.bulkAdd([
    {
      id: crypto.randomUUID(),
      title: 'Community outreach',
      details: 'Pray for wisdom and compassion during weekly outreach.',
      priority: 'high',
      durationPreset: '1m',
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      expiresAt: now + 1000 * 60 * 60 * 24 * 27,
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
      details: 'Cover dad\'s recovery and follow-up appointment.',
      priority: 'urgent',
      durationPreset: '10d',
      createdAt: now - 1000 * 60 * 60 * 24,
      expiresAt: now + 1000 * 60 * 60 * 24 * 9,
      status: 'active',
      prayedAt: [],
      updatedAt: now - 1000 * 60 * 60 * 24,
      notes: [],
    },
  ]);
}
