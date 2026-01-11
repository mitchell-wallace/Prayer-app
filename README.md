# Prayer App (Vue + Vite)

A mobile-first client-side prayer request tracker with prioritized feed cycling, "Prayed" tracking, and timestamped notes stored locally using SQL.js (SQLite compiled to WebAssembly) with persistence via IndexedDB for the raw database bytes.

## Features
- Create and edit prayer requests with priority and duration presets (10d, 1m, 3m, 6m, 1y).
- Smart expiry calculation from created date with status handling (active/answered).
- "Prayed" action appends timestamps to influence feed ordering by recency.
- Notes thread per request with add/edit/delete, displayed newest-first.
- Prayer requests focus on a single title field; add any extra context as notes instead of a separate "details" field.
- Infinite-style feed that cycles through active requests and surfaces a completion banner once everything is covered.
- Local persistence with SQL.js for offline-first behavior (database bytes stored in IndexedDB).
- **Theme support**: Light, Dark, and System (auto) modes via settings.
- **Configurable defaults**: Set default priority and duration for new prayer requests.

## Theming

The app uses Tailwind CSS v4 with a custom theme defined in `src/styles/main.css`. Theme colors are defined using the `@theme` directive, making them available as Tailwind utility classes.

### Theme structure

Colors are defined as CSS custom properties in the `@theme` block:

```css
@theme {
  --color-bg: #0d0d10;
  --color-card: #15151c;
  --color-text: #f8fafc;
  --color-accent: #9d7bff;
  /* ... */
}
```

Light theme overrides are applied via a `[data-theme="light"]` selector.

### Available theme colors

| Token | Purpose |
|-------|---------|
| `bg` | Main background |
| `card` | Card/panel background |
| `card-muted` | Muted card background |
| `text` | Primary text |
| `muted` | Secondary/muted text |
| `accent` | Primary accent color |
| `border` | Border color |
| `priority-*` | Priority chip colors (urgent/high/medium/low) |
| `answered-*` | Answered button colors |
| `note-*` | Note styling colors |

### Adding new themed elements

1. Add the color to `@theme` in `main.css`
2. Add the light theme override in `[data-theme="light"]`
3. Use the color with Tailwind utilities: `bg-{name}`, `text-{name}`, `border-{name}`

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
4. Run tests:
   ```bash
   npm test
   ```

The UI is mobile-friendly out of the box and uses no backend services.

## Architecture

- **Database**: SQL.js (SQLite in WebAssembly) - provides full SQL capabilities in the browser
- **Persistence**: Database bytes are serialized and stored in IndexedDB via `idb-keyval`
- **State**: Vue 3 Composition API with reactive refs
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Build**: Vite with Vue plugin
