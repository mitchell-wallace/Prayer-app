# MIT-46: Error Handling Strategy

## Overview

Establish a consistent error-handling strategy across all layers with lint enforcement.

## Decisions

| Aspect | Decision |
|--------|----------|
| **Recovery** | Silent recovery (retries) in repository layer; bubble real failures to UI |
| **Error classes** | Layer-based: `ValidationError`, `RepositoryError`, `ServiceError` |
| **Async pattern** | `Result<T, E>` discriminated union for all public repository methods |
| **Retries** | Repository layer handles retry logic (closest to I/O) |
| **User feedback** | Toast notifications (top of screen, primary); global error boundary as fallback |
| **Logging** | `console.error` for now |
| **Lint rules** | Ban bare `throw new Error`, require Result types in repos, warn on empty catches |

## Implementation Tasks

### 1. Core Error Infrastructure

#### 1.1 Create `src/core/errors.ts`

Base `AppError` class with layer-specific subclasses:

```typescript
export abstract class AppError extends Error {
  abstract readonly layer: 'validation' | 'repository' | 'service';
  abstract readonly code: string;
  
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly layer = 'validation' as const;
  constructor(message: string, public readonly code: string, cause?: unknown) {
    super(message, cause);
  }
}

export class RepositoryError extends AppError {
  readonly layer = 'repository' as const;
  constructor(message: string, public readonly code: string, cause?: unknown) {
    super(message, cause);
  }
}

export class ServiceError extends AppError {
  readonly layer = 'service' as const;
  constructor(message: string, public readonly code: string, cause?: unknown) {
    super(message, cause);
  }
}
```

#### 1.2 Create `src/core/result.ts`

Discriminated union Result type with helpers:

```typescript
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

// Unwrap with default
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result.ok ? result.value : defaultValue;

// Map success value
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

// Async wrapper for try/catch
export const tryCatch = async <T>(
  fn: () => Promise<T>,
  toError: (e: unknown) => AppError
): Promise<Result<T, AppError>> => {
  try {
    return ok(await fn());
  } catch (e) {
    return err(toError(e));
  }
};
```

### 2. Toast System

#### 2.1 Create `src/composables/useToast.ts`

```typescript
import { ref, readonly } from 'vue';

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const toasts = ref<Toast[]>([]);

const defaultDurations: Record<ToastType, number> = {
  info: 3000,
  success: 3000,
  error: 5000,
};

export function useToast() {
  const show = (type: ToastType, message: string, duration?: number) => {
    const id = crypto.randomUUID();
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration ?? defaultDurations[type],
    };
    toasts.value.push(toast);

    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration);
    }
  };

  const dismiss = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  const info = (message: string, duration?: number) => show('info', message, duration);
  const success = (message: string, duration?: number) => show('success', message, duration);
  const error = (message: string, duration?: number) => show('error', message, duration);

  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    info,
    success,
    error,
  };
}
```

#### 2.2 Create `src/components/layout/ToastContainer.vue`

Position: top of screen, styled per DESIGN.md:
- Container: `fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2`
- Toast card: `bg-base-300 shadow-lg rounded-2xl px-4 py-3`
- Error variant: `border-l-4 border-danger`
- Success variant: `border-l-4 border-success`
- Info variant: `border-l-4 border-primary-200`
- Text: `text-base-content`
- Dismiss button: icon button with `IconX`
- Animation: fade + slide from top (150ms ease-out)

### 3. Global Error Boundary

#### 3.1 Create `src/components/layout/ErrorBoundary.vue`

- Wrap app root
- Catch unhandled errors via `onErrorCaptured`
- Display fallback UI with retry option
- Log to `console.error`

### 4. Repository Layer Updates

#### 4.1 Add retry utility to `src/repositories/`

```typescript
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 100
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
};
```

#### 4.2 Migrate repository public methods to Result types

All public async methods in repositories should return `Promise<Result<T, RepositoryError>>`:

- `requestsRepository.ts` — `getAll`, `getById`, `save`, `remove`, etc.
- `settingsRepository.ts` — `get`, `save`

Internal helpers can continue using throw/catch.

### 5. Lint Rules (biome.json)

#### 5.1 Warn on empty catch blocks

```json
{
  "suspicious": {
    "noEmptyCatch": "warn"
  }
}
```

#### 5.2 Ban bare `throw new Error()` in src/

Use `noRestrictedSyntax` or custom rule to enforce custom error classes.

Note: Biome doesn't have a built-in rule for this. Options:
- Add a code review note in AGENTS.md
- Use `noThrowLiteral` if available
- Consider ESLint plugin for this specific case

#### 5.3 Require Result types for repository public methods

Add comment-based enforcement in AGENTS.md since Biome can't enforce return types:

```markdown
## Repository Layer Rules
- All public async methods MUST return `Promise<Result<T, RepositoryError>>`
- External fetching should wrap errors behind Result types
- Internal helpers may use throw/catch
```

### 6. Documentation

#### 6.1 Create `specs/standards/ERROR_HANDLING.md`

Document the complete strategy for agent reference:
- Error class hierarchy
- Result type usage patterns
- Layer responsibilities
- Toast usage from services/stores
- Examples of correct error handling per layer

#### 6.2 Update `AGENTS.md`

Add error handling section with:
- Link to ERROR_HANDLING.md
- Quick reference for lint rules
- Repository Result type requirement

## File Checklist

| File | Action |
|------|--------|
| `src/core/errors.ts` | Create |
| `src/core/result.ts` | Create |
| `src/composables/useToast.ts` | Create |
| `src/components/layout/ToastContainer.vue` | Create |
| `src/components/layout/ErrorBoundary.vue` | Create |
| `src/repositories/retry.ts` | Create |
| `src/repositories/requestsRepository.ts` | Migrate to Result types |
| `src/repositories/settingsRepository.ts` | Migrate to Result types |
| `biome.json` | Add `noEmptyCatch: warn` |
| `specs/standards/ERROR_HANDLING.md` | Create |
| `AGENTS.md` | Update with error handling section |

## Migration Order

1. Core infrastructure (`errors.ts`, `result.ts`)
2. Lint rules (`biome.json`)
3. Documentation (`ERROR_HANDLING.md`, `AGENTS.md`)
4. Toast system (`useToast.ts`, `ToastContainer.vue`)
5. Error boundary (`ErrorBoundary.vue`)
6. Repository migration (one file at a time, with tests)
7. Service layer updates to handle Result types
8. Store layer updates for toast integration
