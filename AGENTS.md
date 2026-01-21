# Agent Notes

- When adding new static assets, ensure they are included in the PWA delivery (place them in `public/`, reference them as needed, and consider precaching if part of the app shell) so they ship with the service worker.
- For design system guidance (colors, typography, spacing, components), see `specs/standards/branding/DESIGN.md`.
- Use TypeScript everywhere in `src/` and `tests/` (no `.js` files), avoid `any`, and ensure Vue SFC scripts use `lang="ts"`.
