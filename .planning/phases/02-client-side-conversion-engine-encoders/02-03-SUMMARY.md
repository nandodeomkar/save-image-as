---
phase: 02-client-side-conversion-engine-encoders
plan: 03
subsystem: integration
tags: [avif, wasm, mv3, conversion]
status: complete
completed: 2026-11-03
duration: 12min
requires: [02-01, 02-02]
provides: [nine-format local conversion]
affects: [03, 04, 06]
tech-stack:
  added: ['@jsquash/avif@2.1.1']
  patterns: [lazy packaged single-thread WASM fallback]
key-files:
  created: [src/offscreen/encoders/avif.ts, src/vite-env.d.ts, tests/native-encoder.test.ts, .planning/phases/02-client-side-conversion-engine-encoders/02-runtime-smoke.mjs]
  modified: [src/offscreen/encoders/native.ts, src/background/download-manager.ts, src/background/context-menu-manager.ts, public/manifest.json, package.json, package-lock.json]
key-decisions:
  - Native AVIF is attempted first; packaged libavif provides actual AVIF when unsupported.
  - Never return differently encoded bytes under the requested format.
requirements-completed: [CONV-01, CONV-02, CONV-03, CONV-04, CONV-09, CONV-10]
one_liner: All nine formats now produce real output, including local WASM AVIF instead of mislabeled WebP.
---

# Phase 2 Plan 3 Summary

Completed all six integration tasks. Native MIME mismatches are rejected; AVIF falls back to a pinned, lazy-loaded local codec. Save coordinators preserve alpha for transparent formats and send SVG through sanitizing conversion.

## Task Commits

- `4fc5921`: real AVIF, pinned dependency, local WASM asset, CSP and regression tests.
- `442e427`: alpha preservation and SVG sanitization on save paths.

## Verification

Final `npm test`: 185/185 across 21 files, including Phase 1 regression suites. `npm run build` includes passing TypeScript and Vite build. Final Chromium 151 smoke: nine real formats, signatures, dimensions, byte lengths, transparency, JPEG white fill, ICO entries, and worker CORS bridge all passed. See 02-RUNTIME-EVIDENCE.json.

## Deviations

Native AVIF was not supported in tested Chromium and the old fallback returned WebP. Added @jsquash/avif 2.1.1 as an implementation fallback under the fully-local requirement. Official package identity verified before installation; lifecycle scripts disabled. Only the single-thread encoder ships: 3,485,872-byte WASM plus roughly 53 KB lazy JS. Native-only wording is reconciled to native-first with local fallback. Browser image decode verifies real AVIF alpha, not mocked MIME alone.

Sources: https://github.com/jamsinclair/jSquash/blob/main/packages/avif/README.md and https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy .

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: wasm-execution | public/manifest.json | Allows packaged WASM via wasm-unsafe-eval; scripts remain self-only, no remote codec source. |

## Limits

Large-image AVIF performance has not been benchmarked. SVG active content and external resources are removed. Earlier non-blocking fetch bounds/settings validation findings remain tracked in Phase 1 security report.

## Self-Check: PASSED

Referenced files and commits exist. No known stubs or unrun required verification remain.
