---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 1
total_count: 1
last_updated: 2026-11-03T12:49:11.407Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | .planning/phases/01-project-architecture-manifest-v3-foundation/01-02-PLAN.md |  | Actual Chromium offscreen document loading and service-worker OFFSCREEN_PING/PONG require runtime verification; unit mocks passed. | fixed |  | 2026-11-03T12:40:08.595Z | 2026-11-03T12:49:11.407Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".planning/phases/01-project-architecture-manifest-v3-foundation/01-02-PLAN.md",
    "line": null,
    "description": "Actual Chromium offscreen document loading and service-worker OFFSCREEN_PING/PONG require runtime verification; unit mocks passed.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-03T12:40:08.595Z",
    "resolved_at": "2026-11-03T12:49:11.407Z"
  }
]
````
