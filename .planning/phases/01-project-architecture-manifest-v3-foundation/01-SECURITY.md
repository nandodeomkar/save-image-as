---
phase: 1
slug: project-architecture-manifest-v3-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-11-03
register_authored_at_plan_time: false
---

# Phase 1 — Security

Retroactive STRIDE audit of the existing foundation. Blocking threshold: high.

## Trust Boundaries

| Boundary | Data crossing |
|----------|---------------|
| Content script to service worker | Image URLs, conversion requests, download parameters |
| Service worker to offscreen document | Conversion inputs and options |
| Synced storage to extension | Persisted settings |
| Network to extension | Untrusted image response bytes |

## Threat Register

| ID | Category | Severity | Disposition | Evidence / mitigation | Status |
|----|----------|----------|-------------|-----------------------|--------|
| P1-T1 | Tampering | medium | mitigate | messaging.ts rejects mismatched response correlation IDs | closed |
| P1-T2 | Denial of service | medium | mitigate | messaging.ts applies RPC deadlines and settled guards | closed |
| P1-T3 | Denial of service | medium | mitigate | offscreen-manager.ts shares creation promise and releases lock | closed |
| P1-T4 | Tampering | medium | mitigate | storage.ts seeds defaults only after successful empty read | closed |
| P1-T5 | Information disclosure | high | mitigate | download-manager.ts fetch uses credentials: omit | closed |
| P1-T6 | Elevation of privilege / information disclosure | high | mitigate | Commit 5eaa03c: message-policy.ts authorizes operations by extension identity/context and validates payloads, URL schemes, formats, quality and direct download filenames. Worker and offscreen enforce guards before dispatch. | closed |
| P1-T7 | Denial of service | medium | mitigate | download-manager.ts:29–40 fetch has no abort deadline or streamed byte limit | open — below high threshold |
| P1-T8 | Tampering / availability | low | mitigate | storage.ts:52–73,117–126 lacks complete persisted settings validation | open — below high threshold |

P1-T6 assumes a compromised content-script context. This is not evidence that arbitrary website JavaScript can directly invoke runtime messaging. No external messaging configuration or onMessageExternal handler was found.

## Accepted Risks Log

No accepted risks. User authorized remediation; the blocking issue was fixed and independently re-audited.

## Security Audit Trail

| Date | Total | Closed | Open blocking | Open non-blocking | Auditor |
|------|-------|--------|---------------|-------------------|---------|
| 2026-11-03 | 8 | 5 | 1 | 2 | gsd-security-auditor |
| 2026-11-03 | 8 | 6 | 0 | 2 | gsd-security-auditor re-audit after 5eaa03c |

## Sign-Off

Verified at ASVS L1. Independent auditor passed 12 focused tests. Executor passed 18 focused tests, production build, and Chromium 151 runtime smoke. Medium fetch bounds and low settings validation findings remain non-blocking.
