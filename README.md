# Prayer App (Vue + Vite)

A mobile-first client-side prayer request tracker with prioritized feed cycling, “Prayed” tracking, and timestamped notes stored locally in IndexedDB via Dexie.

## Features
- Create and edit prayer requests with priority and duration presets (10d, 1m, 3m, 1y).
- Smart expiry calculation from created date with status handling (active/answered).
- “Prayed” action appends timestamps to influence feed ordering by recency.
- Notes thread per request with add/edit/delete, displayed newest-first.
- Infinite-style feed that cycles through active requests and surfaces a completion banner once everything is covered.
- Local persistence with Dexie for offline-first behavior.

## Getting started
1. Install dependencies (internet access required):
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

The UI is mobile-friendly out of the box and uses no backend services.
