---
phase: 01-project-architecture-manifest-v3-foundation
plan: "01"
subsystem: build
tags: [manifest-v3, vite, typescript, vitest, content-scripts]
requires: []
provides:
  - Manifest V3 build with a standalone classic content script and ESM extension pages
  - Fresh-build regression checks for entrypoints, assets, and icon dimensions
  - Current evidence for existing project foundation and shared types
affects: [01-02, extension-packaging]
tech-stack:
  added: []
  patterns:
    - Separate in-memory IIFE build for manifest-declared content scripts
    - Forward content dependencies to the parent Vite watcher
key-files:
  created: [tests/build-output.test.ts]
  modified: [vite.config.ts]
key-decisions:
  - Preserve nested popup/offscreen HTML paths because existing callers and manifest agree.
  - Verify existing dependencies with npm ls instead of repeating installation.
requirements-completed: [ARCH-01, ARCH-04]
coverage:
  - id: D1
    description: Manifest entrypoints, extension HTML assets, and correctly sized icons exist in a fresh build.
    requirement: ARCH-01
    verification:
      - kind: integration
        ref: tests/build-output.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Content scripts compile as classic JavaScript while the background remains an ES module.
    requirement: ARCH-04
    verification:
      - kind: integration
        ref: tests/build-output.test.ts
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: false
duration: 7min
completed: 2026-11-03
status: complete
---

# Phase 1 Plan 1: Extension Build Foundation Summary

**Restored foundation evidence and fixed Vite emitting ES module imports in Chrome's classic content script.**

## Accomplishments

- Reviewed all seven plan tasks against the existing implementation from `5d216c8`; retained dependency setup, strict TypeScript configuration, manifest, SVG/PNG icons, shared types, and Vitest mocks.
- Built the content entry separately as an IIFE, including its dependencies, while retaining ES modules for background, popup, and offscreen entries. The nested build emits through Vite's parent build and registers dependencies for watch mode.
- Added a regression test that performs a fresh temporary build, validates manifest entrypoints and PNG dimensions, checks HTML asset references, and parses declared content scripts with Node's classic-script parser.

## Task Commits

| Task | Evidence / change | Commit |
| --- | --- | --- |
| 1. Dependencies and scripts | Existing setup verified with `npm ls --depth=0` | Pre-existing `5d216c8` |
| 2. TypeScript configuration | Existing strict ES2022 configuration passes typecheck | Pre-existing `5d216c8` |
| 3. Multi-entry build | Fixed classic content script output and added regression coverage | `6885343` |
| 4. Manifest V3 definition | Existing manifest and generated entrypoints verified | Pre-existing `5d216c8` |
| 5. Extension icons | Existing SVG retained; generated PNG dimensions verified | Pre-existing `5d216c8` |
| 6. Shared types | Existing format/settings/message schemas pass typecheck | Pre-existing `5d216c8` |
| 7. Vitest framework | Existing mocks retained; fresh-build regression tests added | `6885343` |

No new implementation commits were fabricated for already completed tasks.

## Verification

- Before repair, the new regression suite failed on the content script with `Cannot use import statement outside a module`; its other two checks passed.
- After repair, `npm run typecheck` passed and the focused build-output test command passed all **3 tests**.
- `npm run build` passed TypeScript validation and Vite production output generation.
- A Vite watch smoke check built successfully, observed a timestamp change to a content-only dependency, rebuilt, and parsed both emitted content bundles as classic JavaScript. The original source timestamp was restored and temporary output removed.
- `npm ls --depth=0` passed without missing or invalid dependencies; no packages installed or changed.
- The orchestrator's baseline full suite passed **146 tests in 16 files** before this repair. This plan reran the relevant new build suite rather than repeating the entire baseline.
- `git diff --check` passed. Existing icon content matches `6885343` exactly.

These checks validate generated files and JavaScript format. They do not claim an actual Chromium extension-loading test.

## Deviations from Plan

1. **[Rule 1 - Bug] Classic content script contained ESM imports.** The shared Rollup graph produced an entry Chrome could not parse as a manifest content script. A separate IIFE build fixes this without changing inspector behavior or adding dependencies.
2. **Existing implementation recovery.** This run reviewed and repaired existing code instead of recreating it. Manifest remains in `public/manifest.json`; HTML output remains under `src/popup/` and `src/offscreen/`, matching the actual manifest and offscreen manager rather than the plan's proposed root-level HTML paths.
3. **Dependency verification substitution.** Dependencies were already installed, so `npm ls --depth=0` and successful typecheck/build/tests supplied current evidence without reinstalling them.

## Issues Encountered

- An earlier inventory excluded SVG files. An unnecessary replacement of the existing icon was committed as `30b92e0`; it was immediately reverted in `e7202b3`. There is no net icon change.
- Git staging required approved sandbox escalation because `.git` is read-only under the default filesystem policy. Commits used normal hooks.

## User Setup Required

None.

## Next Plan Readiness

Plan 01-02 can verify the existing service worker, messaging, and offscreen lifecycle against the repaired build. Shared project tracking is owned by the orchestrator and was not changed by this executor.

## Self-Check: PASSED

- Both lasting changed files exist: `vite.config.ts` and `tests/build-output.test.ts`.
- Existing foundation, manifest, types, test setup, and SVG icon files exist.
- Commit `6885343` exists; icon-only change `30b92e0` is reverted by `e7202b3`.
- Production build, typecheck, all three fresh-build checks, and watch rebuild smoke check passed.
