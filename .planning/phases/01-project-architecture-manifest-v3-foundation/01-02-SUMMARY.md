---
phase: 01-project-architecture-manifest-v3-foundation
plan: "02"
subsystem: extension-runtime
tags: [manifest-v3, service-worker, offscreen, messaging, storage]
requires:
  - phase: 01-01
    provides: Validated extension build and classic content script output
provides:
  - Correlated runtime/tab IPC with timeout and missing-response protection
  - Persistent installation defaults and serialized settings-driven menu refresh
  - Offscreen liveness, error serialization, creation mutex, and recovery evidence
affects: [conversion, context-menus, settings]
tech-stack:
  added: []
  patterns:
    - Validate response correlation IDs at the IPC boundary
    - Observe the persisted settings object through the shared storage listener
key-files:
  created: [tests/service-worker.test.ts, tests/offscreen.test.ts]
  modified: [src/utils/messaging.ts, src/utils/storage.ts, src/background/service-worker.ts, tests/messaging.test.ts, tests/offscreen-manager.test.ts]
key-decisions:
  - Retain the existing generic sendMessage API and 15-second default timeout for compatibility.
  - Create offscreen documents on demand and retain existing nested HTML paths.
requirements-completed: [ARCH-02, ARCH-03]
coverage:
  - id: D1
    description: Service-worker installation, startup, and persisted settings changes configure context menus.
    requirement: ARCH-02
    verification:
      - kind: integration
        ref: tests/service-worker.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: IPC rejects mismatched or absent responses and protects callers with timeouts.
    requirement: ARCH-02
    verification:
      - kind: unit
        ref: tests/messaging.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Offscreen lifecycle and listener preserve correlation, return timestamped pongs, and serialize conversion errors.
    requirement: ARCH-03
    verification:
      - kind: unit
        ref: tests/offscreen-manager.test.ts
        status: pass
      - kind: unit
        ref: tests/offscreen.test.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Built offscreen HTML loads and answers a service-worker ping in Chromium.
    requirement: ARCH-03
    verification:
      - kind: e2e
        ref: 01-RUNTIME-EVIDENCE.json
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-11-03
status: complete
---

# Phase 1 Plan 2: Service Worker, Offscreen Lifecycle, and IPC Summary

**Repaired response correlation and installation/settings handling while verifying the existing offscreen bridge with focused regressions.**

## Accomplishments

- Reviewed all six plan tasks against the existing implementation; retained typed storage defaults/merge/subscription, conversion dispatch, offscreen creation/reuse/mutex/close, and timestamped ping/pong.
- Runtime and tab helpers now reject responses carrying the wrong request ID. Tab messages also reject missing responses rather than resolving `undefined`.
- Installation persists defaults only after a successful storage read confirms no preferences exist. Updates and reinstalls preserve existing settings, including after transient storage-read failures. Service-worker menus subscribe to the actual stored settings object and serialize updates so overlapping events cannot interleave remove/create operations.
- Added current tests for installation/update/startup, settings-driven refresh, offscreen ping/pong and serialized conversion failures, failed document creation recovery, and the runtime-context fallback.

## Task Commits

| Task | Work | Commit |
| --- | --- | --- |
| 1. Typed storage utilities | Existing implementation reviewed; storage tests pass | Pre-existing `5d216c8` |
| 2. Typed IPC layer | Validate IDs and missing tab responses | `1c5c7d9` |
| 3. Offscreen document manager | Existing manager verified with retry and fallback tests | `24e0a2a` |
| 4. Offscreen environment | Existing listener verified for timestamped pong and error serialization | `24e0a2a` |
| 5. Service-worker lifecycle | Persist defaults; subscribe to settings; serialize menu updates | `a05a752` |
| 6. Tests | Focused regressions plus one full suite | `1c5c7d9`, `a05a752`, `24e0a2a` |
| Review fix CR-01 | Preserve synced preferences on failed install/update reads; three regression tests | `b9f378e` |

## Verification

- Before fixes, five new regression assertions failed: runtime/tab ID mismatch, missing tab reply, installation persistence, and settings-driven menu refresh.
- After fixes, the messaging/lifecycle subset passed all 12 tests.
- Final `npm test`: **162 tests passed in 19 files**, including the phase 01-01 fresh-build checks and three storage-failure/reinstall regressions that failed before the review fix.
- `npm run typecheck` and `npm run build` passed.
- `git diff --check` passed; no tracked files were deleted.
- Offscreen tests intentionally exercise rejected conversion/document creation and log those expected errors; the tests pass.

## Deviations from Plan

1. **[Rule 1 - Bug] Correlation IDs were carried but not checked.** Added checks to both messaging helpers and rejected missing tab replies.
2. **[Rule 1 - Bug] Installation defaults were never written.** `getSettings()` already returns defaults, so the prior empty-formats branch could not detect empty storage. A dedicated initializer now distinguishes a successful missing-key read from a failed read before saving defaults. The first repair rewrote settings on updates; code review caught that preference-loss path and `b9f378e` corrected it.
3. **[Rule 1 - Bug] Storage refresh watched the wrong keys.** Preferences are persisted under `save_image_as_settings`; the prior listener watched top-level `enabledFormats`, `defaultFormat`, and `filenameTemplate`. Reused `onSettingsChanged` and queued menu rebuilds.
4. **Existing architecture preserved.** Retained generic `sendMessage<TResponse, TRequest>` rather than adding differently named offscreen/background aliases. Kept the existing 15-second general timeout and 5-second ping timeout rather than reducing conversion time to the plan's proposed 10 seconds. Offscreen creation remains on demand, and its HTML stays at `src/offscreen/offscreen.html` to match the actual build. Existing full conversion behavior was retained instead of replacing it with the plan's earlier stub.

## Browser Runtime Verification

The orchestrator ran `01-runtime-smoke.mjs` against the final production build in a temporary Chromium 151 profile on 2026-11-03. All five checks passed: service-worker startup, persisted installation defaults, popup-driven real Canvas conversion in an on-demand offscreen document, correlated timestamped service-worker ping/pong with exactly one offscreen context, and content-script inspection on a local HTTP page with no page errors. Results are in `01-RUNTIME-EVIDENCE.json`; the profile was closed and removed. This closes windows-ledger item 1. The first smoke attempt used an incorrect storage key; the test was corrected to the existing `save_image_as_settings` key before obtaining passing evidence.

Verified available local browser tooling, without installing packages:

- Chromium: `C:\Users\omkar\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe`
- Playwright module: `C:\Users\omkar\AppData\Local\npm-cache\_npx\9833c18b2d85bc59\node_modules\playwright-core\index.mjs`

## User Setup Required

None. Browser verification is complete; no new dependencies were installed.

## Self-Check: PASSED

- Scoped source/test files and this summary exist.
- Commits `1c5c7d9`, `a05a752`, and `24e0a2a` exist.
- Full suite, typecheck, and production build pass.
- Root-owned STATE, ROADMAP, REQUIREMENTS, PROJECT, and config files were not changed by this executor.
