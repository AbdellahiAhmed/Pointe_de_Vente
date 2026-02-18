# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Le caissier peut enregistrer une vente rapidement et de manière fiable, avec un suivi précis du stock et des bénéfices pour le gérant.
**Current focus:** Phase 6 IN PROGRESS — RTL and Arabic Completion

## Current Position

Phase: 6 of 8 (RTL and Arabic Completion) IN PROGRESS
Plan: 1 of 3 in current phase (COMPLETE)
Status: Phase 6 Plan 01 complete — RTL infrastructure in place
Last activity: 2026-02-18 — Plan 06-01 COMPLETE (RTL infrastructure: Tailwind upgrade, local Bootstrap, applyLocale utility, ConfigProvider)

Progress: [████████░░] 75.00%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. RBAC | 2 | — | — |
| 2. Data Model | 2 | — | — |
| 3. PMP | 1 | — | — |
| 4. Stock/Pay | 2 | — | — |
| 5. Z-Report | 3/3 | 16min (01: 4min, 02: 3min, 03: 9min) | 5.3min |
| 6. RTL/Arabic | 1/? | 3min (01: 3min) | 3min |

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
- [Phase 5-01]: Sequential zReportNumber via MAX+1 inside DB transaction for uniqueness
- [Phase 5-01]: Immutable snapshot JSON frozen at close time, never recalculated from live data
- [Phase 5-01]: Cash reconciliation formula: expected = opening + cashReceived + cashAdded - cashWithdrawn - expenses
- [Phase 5-02]: Vendor report groups by User.displayName via Order.user join
- [Phase 5-02]: Category report uses ManyToMany Product.categories for full attribution
- [Phase 5-02]: Per-product margin computed post-query via array_map, not in DQL
- [Phase 5-02]: J-1 comparison uses separate queries for clarity
- [Phase 5-03]: Variable Noto Sans Arabic TTF used (static builds unavailable in Google Fonts repo)
- [Phase 5-03]: Arabic RTL via Unicode RLI prefix (U+202B) workaround for @react-pdf/renderer
- [Phase 5-03]: Denomination inputs use local state for real-time total, Close day uses CLOSING_CLOSE endpoint
- [Phase 6-01]: applyLocale() uses i18n.dir(lang) from i18next (not hardcoded 'rtl'/'ltr')
- [Phase 6-01]: document.documentElement.dir used for <html> direction (not document.dir which targets <body>)
- [Phase 6-01]: Bootstrap CSS served locally from public/css/ to eliminate CDN race conditions on language switch

### Critical Pitfalls (from research)

- [Phase 1 DONE]: User migration ROLE_USER→ROLE_VENDEUR created (serialization-safe SQL)
- [Phase 1 DONE]: JWT-in-URL in export.items.tsx fixed (fetch+Blob)
- [Phase 2 DONE]: Closing float→decimal(20,2) migration, OrderProduct.costAtSale backfill, User.roles array→json
- [Phase 2 DONE]: isSuspended filter on all 9 ReportController queries, costAtSale used in profit calculations
- [Phase 2 DONE]: Core/Discont→Discount namespace fix
- [Phase 5 DONE]: @react-pdf/renderer Arabic RTL verified with Noto Sans Arabic variable font + U+202B prefix
- [Phase 6]: 185+ occurrences of ml-*/mr-* to replace — scope precisely before starting
- [Phase 6-01 DONE]: RTL infrastructure complete — applyLocale() shared utility, local Bootstrap, ConfigProvider, NotoSansArabic font

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 06-01-PLAN.md (RTL infrastructure) — Phase 6 Plan 01 complete
Resume file: None
