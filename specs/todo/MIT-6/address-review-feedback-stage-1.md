# MIT-6 Review Feedback Stage 1 - Implementation Plan

## Status: COMPLETED

All changes implemented and verified.

---

## Phase Summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Queue algorithm: `newCardBoost` 1→1.25, `interleaveWindow` 0.3→0.4, add `maxRunLength: 3`, fix never-prayed tie-breaking | ✅ |
| 2 | Filter expired requests from `activeRequests` computed | ✅ |
| 3 | Remove unused `autoAdvance` parameter from `removeRequestFromQueue` | ✅ |
| 4 | Update never-prayed test name, add max-run-length test | ✅ |
| 5 | Replace `\|\|` with `??` for nullish coalescing | ✅ |
| 6 | Add enum validation for Priority, Status, DurationPreset | ✅ |
| 7 | Add explicit return types to `useModal`, `useProgressDotsAnimation` | ✅ |
| 8 | Invert settings layer: service→repository only, store→service | ✅ |
| 9 | Document `database.ts` as internal module | ✅ |
| 10 | Integrate `useModal` into InfoModal and SettingsModal | ✅ |
| 11 | Keep AddRequestForm open after submit | ✅ |
| 12 | Run typecheck, lint, format, build, tests | ✅ |

---

## Files Modified

- `src/core/queueAlgorithm.ts` - Algorithm fixes
- `src/stores/requestsStore.ts` - Expired filtering, remove autoAdvance usage
- `src/services/queueService.ts` - Remove autoAdvance parameter
- `src/services/settingsService.ts` - Rewrite to use repository only
- `src/stores/settings.ts` - Add setter functions, use service
- `src/db/database.ts` - Add enum validation, internal docs
- `src/repositories/settingsRepository.ts` - Add settings validation
- `src/composables/useModal.ts` - Add return type
- `src/composables/useProgressDotsAnimation.ts` - Add return type
- `src/components/modals/InfoModal.vue` - Use useModal
- `src/components/modals/SettingsModal.vue` - Use useModal, update imports
- `src/components/forms/AddRequestForm.vue` - Keep open after submit
- `src/App.vue` - Update settings import
- `tests/queueService.test.ts` - Update test, add max-run-length test
- `CLAUDE.md` - Add planning guidelines
