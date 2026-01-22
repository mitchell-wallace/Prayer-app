/**
 * Time provider for business services.
 * Isolate Date.now() so core logic stays deterministic and pure.
 */
export function now(): number {
  return Date.now();
}
