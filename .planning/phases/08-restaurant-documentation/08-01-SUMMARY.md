---
phase: 08-restaurant-documentation
plan: "01"
subsystem: documentation
tags: [restaurant, kds, kot, mercure, modifiers, table-management, bilingual, mermaid]

# Dependency graph
requires:
  - phase: 07-ui-redesign
    provides: Completed POS system with full feature set to document as extension basis
provides:
  - "docs/restaurant-extension.md — 822-line bilingual FR/AR restaurant extension technical specification"
  - "Complete data model for 7 new entities (Zone, RestaurantTable, ModifierGroup, Modifier, OrderItemModifier, KitchenTicket, KitchenTicketItem)"
  - "State machines for table lifecycle (LIBRE/OCCUPEE/ADDITION_DEMANDEE) and KOT lifecycle (RECU/EN_PREPARATION/PRET/LIVRE)"
  - "Mercure SSE real-time architecture for KDS with topic definitions (/kitchen/tickets, /pos/ready-alerts)"
  - "Mermaid diagrams: erDiagram, 2x stateDiagram-v2, sequenceDiagram"
  - "Hypothetical API Platform endpoints table (8 endpoints)"
  - "RBAC extension table (3 roles x 9 restaurant operations)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snapshot pattern for OrderItemModifier.prixAuMomentVente (mirrors Phase 2 costAtSale pattern)"
    - "Feature flag pattern: Store.hasRestaurantMode enables restaurant mode per store without breaking existing POS"
    - "CQRS design-level commands: FireKitchenTicketCommand, BumpTicketStatusCommand, UpdateTableStatusCommand"
    - "Mercure publish/subscribe: two topics (/kitchen/tickets for KDS, /pos/ready-alerts for waiter notification)"

key-files:
  created:
    - docs/restaurant-extension.md
  modified: []

key-decisions:
  - "Single-level modifiers only (not nested) — simplicity for initial restaurant support; nested modifiers documented as future extension"
  - "List-based table UI (cards in grid) not drag-and-drop floor plan — achievable with existing React/Tailwind stack"
  - "One KDS unified station as baseline; multi-station routing documented as advanced configuration"
  - "Feature flag (Store.hasRestaurantMode) enables progressive rollout without breaking existing POS stores"
  - "All migration changes are nullable/additive — zero breaking changes to existing data"
  - "Restaurant orders are standard Order entities — existing Z-Report and profit reports include them automatically"

patterns-established:
  - "Bilingual document pattern: ## Section title / العربية with French body text throughout"
  - "Academic technical specification format: entity tables, Mermaid diagrams, API endpoint tables, RBAC tables, glossary"

requirements-completed:
  - REST-01
  - REST-02

# Metrics
duration: 10min
completed: 2026-02-19
---

# Phase 8 Plan 01: Restaurant Extension Technical Design Document Summary

**822-line bilingual FR/AR technical specification describing VelociPOS restaurant extension with table management, modifier system, KOT flow, and KDS real-time architecture using Mercure SSE**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-19T20:56:44Z
- **Completed:** 2026-02-19T21:07:00Z
- **Tasks:** 1 of 1
- **Files created:** 1 (docs/restaurant-extension.md, 822 lines)

## Accomplishments

- Produced a professional 822-line bilingual (FR/AR) technical specification suitable for academic presentation
- Documented all four restaurant subsystems: table management, modifier system, KOT flow, and KDS display — each with entity definitions, state machines, and UI descriptions
- Created four Mermaid diagrams: erDiagram (all 11 entities), table lifecycle stateDiagram, KOT lifecycle stateDiagram, and full waiter-to-KDS-to-notification sequenceDiagram
- Anchored every new entity explicitly to existing VelociPOS entities (Order, OrderProduct, Store, Terminal, Product) with field-level detail
- Described Mercure SSE publish/subscribe architecture with exact topic names and payload structures

## Task Commits

Each task was committed atomically:

1. **Task 1: Write restaurant extension design document** - `584f812` (docs)

**Plan metadata:** (committed with SUMMARY in final commit)

## Files Created/Modified

- `docs/restaurant-extension.md` — Complete restaurant extension technical design document (822 lines, 7 major sections, 4 Mermaid diagrams, 158 table rows, 21 Mercure references)

## Decisions Made

- **Single-level modifiers:** Document describes one-level ModifierGroup/Modifier hierarchy for clarity; nested modifiers noted as future extension. Rationale: simpler data model, sufficient for all common restaurant use cases.
- **List-based table UI:** Describes card-grid table management rather than SVG drag-and-drop floor plan. Rationale: achievable with React + TailwindCSS without additional SVG/canvas libraries.
- **Unified KDS baseline:** Describes single unified KDS screen as the baseline configuration, with per-station routing as an advanced option. Rationale: matches the recommendation in 08-RESEARCH.md Open Questions section.
- **Feature flag activation:** `Store.hasRestaurantMode` as the activation mechanism, enabling progressive rollout. Rationale: zero impact on existing POS stores, no migration required for non-restaurant stores.
- **No-breaking-change migration:** All new columns are nullable with safe defaults; all new tables are independent additions. Existing reports include restaurant orders automatically since they are standard Order entities.

## Deviations from Plan

None — plan executed exactly as written. The document structure, section order, entity definitions, and diagram types all match the 08-01-PLAN.md specification. The document exceeded the minimum 300-line requirement (822 lines actual).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. This is a documentation-only phase.

## Next Phase Readiness

- Phase 8 is complete. This is the final phase of the VelociPOS project.
- The document `docs/restaurant-extension.md` is ready for academic presentation.
- All 8 phases of the VelociPOS roadmap are now complete.

---
*Phase: 08-restaurant-documentation*
*Completed: 2026-02-19*
