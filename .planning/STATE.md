# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Le caissier peut enregistrer une vente rapidement et de manière fiable, avec un suivi précis du stock et des bénéfices pour le gérant.
**Current focus:** Phase 3 — PMP and Purchase Flow

## Current Position

Phase: 3 of 8 (PMP and Purchase Flow)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-02-17 — Phase 2 COMPLETE (2/2 plans executed)

Progress: [██░░░░░░░░] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. RBAC | 2 | — | — |
| 2. Data Model | 2 | — | — |

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

- [Phase 1 DONE]: User migration ROLE_USER→ROLE_VENDEUR created (serialization-safe SQL)
- [Phase 1 DONE]: JWT-in-URL in export.items.tsx fixed (fetch+Blob)
- [Phase 2 DONE]: Closing float→decimal(20,2) migration, OrderProduct.costAtSale backfill, User.roles array→json
- [Phase 2 DONE]: isSuspended filter on all 9 ReportController queries, costAtSale used in profit calculations
- [Phase 2 DONE]: Core/Discont→Discount namespace fix
- [Phase 5]: Verify @react-pdf/renderer Arabic RTL rendering with a test document at install time before building full ZReportDocument.tsx
- [Phase 6]: 185+ occurrences of ml-*/mr-* to replace — scope precisely before starting

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-17
Stopped at: Phase 2 complete, ready to plan Phase 3
Resume file: None
