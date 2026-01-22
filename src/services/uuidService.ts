/**
 * ID provider for business services.
 * Isolate crypto usage so core logic stays deterministic and pure.
 */
export function createId(): string {
  return crypto.randomUUID();
}
