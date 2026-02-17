# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Le caissier peut enregistrer une vente rapidement et de manière fiable, avec un suivi précis du stock et des bénéfices pour le gérant.
**Current focus:** Phase 1 — RBAC and Security

## Current Position

Phase: 1 of 8 (RBAC and Security)
Plan: 0 of 2 in current phase
Status: Ready to execute
Last activity: 2026-02-17 — Phase 1 plans created and verified (PASS); 2 plans in 2 waves

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: RBAC must be first — every subsequent phase adds new endpoints that need denyAccessUnlessGranted(); adding it retroactively creates a security window
- [Roadmap]: Data model fixes (Phase 2) must precede all reporting phases — three confirmed bugs (no costAtSale, no isSuspended filter, float financial columns) corrupt Z-Report and profit reports
- [Roadmap]: UI redesign (Phase 7) placed after all features (Phase 6) — avoids designing around incomplete functionality

### Critical Pitfalls (from research)

- [Phase 1]: User data migration must be atomic — existing ROLE_USER users get ROLE_CASHIER backfilled in same deployment as new Voters or they get locked out
- [Phase 1]: Fix JWT-in-URL in export.items.tsx during security pass (token visible in server logs)
- [Phase 5]: Verify @react-pdf/renderer Arabic RTL rendering with a test document at install time before building full ZReportDocument.tsx
- [Phase 6]: 185+ occurrences of ml-*/mr-* to replace — scope precisely before starting

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-17
Stopped at: Phase 1 planned (2 plans, verified PASS), ready to execute
Resume file: None
