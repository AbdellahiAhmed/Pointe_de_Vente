# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Le caissier peut enregistrer une vente rapidement et de manière fiable, avec un suivi précis du stock et des bénéfices pour le gérant.
**Current focus:** Phase 7 COMPLETE — UI Redesign

## Current Position

Phase: 7 of 8 (UI Redesign) COMPLETE
Plan: 2 of 2 in current phase
Status: Phase 7 COMPLETE — POS touch-optimization + admin dashboard KPI/charts/users delivered
Last activity: 2026-02-19 — Phase 7 Plan 2 COMPLETE (Nivo 0.87, 5 KPI cards, 5 report charts, Users CRUD page)

Progress: [█████████░] 93.75%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
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
| 6. RTL/Arabic | 2/2 | 10min (01: 3min, 02: 7min) | 5min |
| 7. UI Redesign | 2/2 | ~29min (01: 4min, 02: ~25min) | 14.5min |

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
- [Phase 6-02]: Logical properties pattern established: ms-*/me-* for all icon spacing, ms-*/me-*/ps-*/pe-* for all spacing utilities
- [Phase 6-02]: RTL CSS override block minimized to 5 custom component rules only — generic utility overrides removed as Tailwind logical properties handle them automatically
- [Phase 6-02]: Arabic file gap was 2 keys at execution (not 20 from research) — available/in cart; rest had already been added
- [Phase 7-01]: ProductGrid refactored from inline const T tokens to CSS design system classes — hover state tracking removed (CSS handles natively)
- [Phase 7-01]: product-grid-badge uses inset-inline-end (not right) for RTL compatibility
- [Phase 7-01]: Cart table layout preserved as-is — only touchAction and py-3 padding added to avoid disrupting CartItem
- [Phase 7-01]: pos-payment-btn applied to payment type row buttons, Done button, and Hold button (3 occurrences)
- [Phase 7-02]: Used backend.app.ts USER_LIST/CREATE/EDIT routes (not admin.backend.app.ts which is a different messaging project)
- [Phase 7-02]: Dashboard KPI layout: 3 cards row 1 (Sales/Revenue/Profit), 2 cards row 2 (Avg Basket/Low Stock) — Bootstrap has no 5-col grid
- [Phase 7-02]: Admin Users page uses Bootstrap modal via conditional render + modal-backdrop (no JS modal.show() dependency)
- [Phase 7-02]: Password field optional on edit (leave empty = keep current), Nivo 0.87 uses label prop not labelFormat

### Critical Pitfalls (from research)

- [Phase 1 DONE]: User migration ROLE_USER→ROLE_VENDEUR created (serialization-safe SQL)
- [Phase 1 DONE]: JWT-in-URL in export.items.tsx fixed (fetch+Blob)
- [Phase 2 DONE]: Closing float→decimal(20,2) migration, OrderProduct.costAtSale backfill, User.roles array→json
- [Phase 2 DONE]: isSuspended filter on all 9 ReportController queries, costAtSale used in profit calculations
- [Phase 2 DONE]: Core/Discont→Discount namespace fix
- [Phase 5 DONE]: @react-pdf/renderer Arabic RTL verified with Noto Sans Arabic variable font + U+202B prefix
- [Phase 6]: 185+ occurrences of ml-*/mr-* to replace — scope precisely before starting
- [Phase 6-01 DONE]: RTL infrastructure complete — applyLocale() shared utility, local Bootstrap, ConfigProvider, NotoSansArabic font
- [Phase 6-02 DONE]: All physical direction Tailwind classes migrated (73 occurrences in 43 files); Arabic translations complete (0 missing keys); RTL CSS block minimized
- [Phase 7-01 DONE]: ProductGrid const T tokens removed; viewport meta fixed; touch CSS added; tablet breakpoints at 1024px/768px
- [Phase 7-02 DONE]: Nivo 0.87 installed (React 18 compatible); 5-card dashboard; 5 report pages with charts; admin Users CRUD page

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 7 COMPLETE — moving to Phase 8
Resume file: None
