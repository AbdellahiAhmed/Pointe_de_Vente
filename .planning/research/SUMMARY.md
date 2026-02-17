# Project Research Summary

**Project:** VelociPOS — Mauritanian boutique/restaurant POS
**Domain:** Point of Sale — RBAC, PMP costing, Z-Reports, Stock Alerts, UI redesign, RTL/Arabic
**Researched:** 2026-02-17
**Confidence:** MEDIUM (architecture/pitfalls HIGH from direct codebase; stack/features MEDIUM from training data)

---

## Executive Summary

VelociPOS is an existing Symfony 5.4 + React 18 POS application serving Mauritanian retail businesses. The codebase is structurally sound — CQRS, Doctrine ORM, API Platform 2.7, TanStack Query, Redux/Saga, Jotai, and Ant Design 5 are all in place. This milestone is not a greenfield build; it is a targeted hardening of specific weaknesses: RBAC that currently has only two roles (ROLE_USER / ROLE_ADMIN), a PMP cost field typed as a string, a Z-Report that has entity support but no printable output, stock alerts with the threshold field present but no query or UI, and an RTL implementation that relies on a fragile CDN swap. The recommended approach is to work with the existing stack rather than adding new libraries, with only two new frontend dependencies required: `@react-pdf/renderer` for PDF generation and a TailwindCSS minor-version upgrade to 3.3 for native RTL logical properties.

The single highest-risk decision in this milestone is RBAC. Introducing new roles (`ROLE_CASHIER`, `ROLE_MANAGER`) without simultaneously migrating every existing user's stored `roles` array will lock all non-admin users out of previously accessible routes on deploy. This must be planned as an atomic operation: schema change, user data migration, and new access controls deploy together. Equally critical is the profit reporting model — `OrderProduct` does not store `costAtSale`, meaning all historical profit figures currently recalculate from `Product.cost` live, making them unreliable the moment any cost is updated. Adding a `costAtSale` snapshot column is a prerequisite for correct Z-Reports and profit reports, not a nice-to-have.

The good news is that the hardest algorithmic work (PMP weighted average formula) is already implemented correctly in `PurchaseEvent.php`. The Z-Report data model is largely present in the `Closing` entity. Stock alerts have the `reOrderLevel` field in `ProductStore`. The work ahead is primarily: wiring things together correctly, fixing the data model gaps identified above, building the missing UI surfaces, and completing the Arabic translation. The restaurant mode work is documentation only — no code changes are in scope for this milestone.

---

## Key Findings

### Recommended Stack

The existing stack covers all feature requirements for this milestone. No major new packages are needed on the backend. On the frontend, two additions are required: `@react-pdf/renderer` ^3.4 (client-side PDF generation for Z-Reports with Arabic RTL font support), and a TailwindCSS upgrade from 3.1.8 to ^3.3 (native RTL logical property utilities `ms-*`, `me-*`, `ps-*`, `pe-*`). All RBAC, PMP, and stock alert work is achievable with existing installed libraries.

**Core technologies:**
- `symfony/security-bundle` 5.4 (already installed): Role hierarchy in `security.yaml` + Symfony Voters — no third-party RBAC library needed
- `doctrine/doctrine-migrations-bundle` (already installed): Schema migration to fix `Product.cost` from `string` to `decimal(10,4)` and add `OrderProduct.costAtSale`
- `gedmo/doctrine-extensions` (already installed): Add `@Gedmo\Versioned()` to `Product.cost` for free audit trail on cost changes
- `@react-pdf/renderer` ^3.4 (new): Client-side PDF for Z-Report with embedded Amiri/Cairo Arabic font — superior to `jsPDF` or `dompdf` for Arabic RTL support
- `tailwindcss` ^3.3 (minor upgrade from 3.1.8): Native logical property RTL — eliminates need for `tailwindcss-rtl` plugin
- `antd` 5 `ConfigProvider direction="rtl"` (already installed): Ant Design RTL mode for admin components
- `@dnd-kit/core` + `@dnd-kit/sortable` (new, restaurant phase only): Drag-and-drop floor plan if restaurant implementation is in scope

**What not to add:** Do not introduce `casbin`, `casl`, `react-access`, `jsPDF`, `react-to-print`, `dompdf`, or any third-party ABAC library. Do not upgrade API Platform to v3 or Symfony to v6/v7 — both are breaking changes incompatible with the current PHP version constraint.

See `.planning/research/STACK.md` for full details, version compatibility table, and installation commands.

### Expected Features

**Must have (table stakes — P1 for milestone sign-off):**
- RBAC: 3 roles (VENDEUR/MANAGER/ADMIN) with backend Voter enforcement and frontend route guards
- PMP automatic weighted-average cost calculation on purchase receipt, reflected in all profit reports
- Z-Report with sequential non-resettable counter, cash reconciliation, payment breakdown, all standard sections, printable layout
- Stock alerts: per-product configurable threshold, dashboard widget, POS cashier indicator
- Mauritanian payment methods seeded: Bankily, Masrivi, Sedad (data migration only, no API integration)
- Complete Arabic translation for all existing and new components
- POS UI redesign (touch-optimized)
- Admin dashboard redesign with KPI cards

**Should have (competitive differentiators — P2):**
- Reports segmented by category and by supplier/brand
- Average basket (panier moyen) metric in daily report and Z-Report
- Stock alert dashboard widget surfacing count on admin home
- Restaurant documentation in FR/AR (no code — sales/positioning document only)
- Z-Report print layout optimized for 80mm thermal printer

**Defer (v1.x or v2+):**
- Z-Report email delivery
- Stock alert push/SMS notifications
- Multi-terminal Z-Report consolidation
- Bankily/Masrivi API real-time confirmation
- Automatic purchase order generation from stock alerts
- Fine-grained per-user permission overrides (ABAC)

**Anti-features to avoid:** Real-time cross-terminal stock sync, granular ACL per user, any mobile money API integration — all create scope explosion or external dependencies with no public API.

See `.planning/research/FEATURES.md` for full permission matrix, Z-Report section breakdown, and PMP edge cases.

### Architecture Approach

The application follows a layered CQRS architecture: HTTP Controllers delegate to Command/Query handlers, side effects (PMP recalculation, stock update) fire as Doctrine `postPersist` event listeners, and reporting uses raw `QueryBuilder` in controllers (correct for analytics — do not migrate reports to CQRS). Frontend state is split: Redux/Saga for auth, Jotai atoms for the POS cart, TanStack Query for server-cached data. This split is intentional and must be preserved — new features that touch POS cart state go to Jotai; auth/role state stays in Redux.

**Major components and changes required:**
1. `src/Security/Voter/` (new): One voter per domain — `OrderVoter`, `PurchaseVoter`, `ReportVoter`, `UserManagementVoter` — wired automatically by Symfony's autowire
2. `security.yaml` role hierarchy (config change): `ROLE_ADMIN` inherits `ROLE_MANAGER` inherits `ROLE_CASHIER` inherits `ROLE_USER`
3. `OrderProduct` entity (schema change): Add `costAtSale decimal(10,4)` column; populate at order creation time from `Product.cost`
4. `Product.cost` (schema change): Migrate from `string` to `decimal(10,4)`; add `@Gedmo\Versioned()` for audit trail
5. `ZReport` entity (new): Persisted snapshot of day-end aggregated data — immutable after creation
6. `StockController` (new): `GET /api/admin/stock/alerts` polling endpoint; `ProductStoreRepository::findBelowReorderLevel()` query
7. Frontend `ZReportDocument.tsx` (new): `@react-pdf/renderer` component with Amiri Arabic font for bilingual PDF output
8. Frontend `useHasRole(role)` hook (new): ~10 lines reading from Redux auth state; no new library

**Build order is strictly constrained:** RBAC must be first. Every new endpoint added subsequently needs `denyAccessUnlessGranted()` calls. Adding them retroactively is error-prone and leaves a window of open access during development.

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, component code samples, and scaling considerations.

### Critical Pitfalls

1. **RBAC migration locks out all existing users** — Any existing `ROLE_USER` who is not an admin will be denied access to every admin route after new role checks are added. Prevention: write a Doctrine migration that backfills `ROLE_CASHIER` (or appropriate new role) onto every existing non-admin user. Deploy the migration atomically with the security changes, never separately.

2. **`OrderProduct` has no `costAtSale` column — profit reports use live `Product.cost`** — Historical gross profit changes every time a product cost is updated. Prevention: add `costAtSale` to `OrderProduct` before building any Z-Report UI; update `CreateOrderCommandHandler` to snapshot the cost at save time; rewrite profit query to use `op.costAtSale`.

3. **Suspended orders inflate all revenue reports** — `ReportController` filters `isDeleted` and `isReturned` but not `isSuspended`. A held/parked order appears in revenue totals, causing cash reconciliation to fail. Prevention: add `isSuspended = false OR isSuspended IS NULL` filter to every revenue/cost query before building any Z-Report UI.

4. **RTL relies on a fragile CDN swap with race conditions** — `bootstrapCss.setAttribute('href', ...)` can throw null-dereference on slow networks. Tailwind `ml-*`/`mr-*` classes (185+ occurrences) do not flip with Bootstrap RTL. Prevention: replace CDN swap with local Bootstrap RTL asset, set `dir` on `<html>` before first render, systematically replace physical Tailwind margin/padding utilities with logical equivalents (`ms-*`, `me-*`, `ps-*`, `pe-*`).

5. **New routes are open to all authenticated users unless voters are explicitly attached** — The current `access_control` passes any JWT-authenticated user through to all `/api/admin` routes. New endpoints will be open to cashiers by default. Prevention: establish the Voter pattern and a code review checklist item (`#[IsGranted]` required on every new controller method) in the RBAC phase, before any other phases add endpoints.

**Additional critical issues found in code:**
- `Closing` entity uses `float` columns for financial figures — migrate to `decimal(20,2)` before Z-Report implementation to avoid floating-point reconciliation errors
- JWT sent as URL query param in `export.items.tsx` — fix as part of RBAC security pass (token visible in server logs and browser history)
- `Core/Discont/` namespace misspelling — fix in a single dedicated commit before adding code to that namespace
- `User.roles` stored as PHP-serialized array (Doctrine `array` type) — migrate to `json` type

See `.planning/research/PITFALLS.md` for full recovery strategies and phase-to-pitfall mapping.

---

## Implications for Roadmap

Research reveals a strict dependency chain that must drive phase ordering. RBAC must be built before any restricted endpoint is added. The data model fixes (`costAtSale`, `Product.cost` type, `isSuspended` filter, `Closing` float columns) must precede any reporting UI. RTL infrastructure must be fixed before any new components are built (to avoid retrofitting logical properties across a growing codebase).

### Phase 1: RBAC and Security Foundation

**Rationale:** Every subsequent phase adds new endpoints and UI elements that need role enforcement. Building RBAC first means all new code is secured by default. This phase also fixes the JWT-in-URL security issue.
**Delivers:** Working role hierarchy (ADMIN/MANAGER/CASHIER), Symfony Voters for Order/Purchase/Report/UserManagement, user data migration backfilling roles, frontend `useHasRole()` hook, route guards, role-gated menu items, fix for JWT URL query param in export.
**Addresses:** RBAC 3-role permission matrix (FEATURES P1), Mauritanian payment methods seeding (FEATURES P1 — low complexity, natural fit here)
**Avoids:** Pitfall 1 (RBAC migration locks users), Pitfall 5 (new routes open by default), security hole from JWT in URL

### Phase 2: Data Model Corrections

**Rationale:** Three separate data integrity issues (`costAtSale` missing, `isSuspended` filter missing, `Closing` float types) will corrupt every Z-Report and profit report if not fixed before any reporting UI is built. Fix data first, build UI on solid ground.
**Delivers:** `OrderProduct.costAtSale` column with migration and handler update; `Product.cost` migrated to `decimal(10,4)`; `ReportController` queries filter `isSuspended`; `Closing` float columns migrated to `decimal(20,2)`; `Core/Discont/` renamed to `Core/Discount/`; `User.roles` migrated from PHP array type to JSON.
**Addresses:** Pitfall 2 (historical profit accuracy), Pitfall 3 (suspended orders in revenue), FEATURES dependency on accurate PMP
**Avoids:** All downstream reporting phases building on corrupt data

### Phase 3: PMP and Purchase Flow

**Rationale:** PMP depends on Phase 2 data model fixes. The `PurchaseEvent.php` logic is correct but needs correct wiring (`postPersist` Doctrine listener, not just a service call) and the `Product.cost` column must be `decimal` before it can hold precise PMP values.
**Delivers:** PMP wired as Doctrine `postPersist` listener so it fires regardless of how a Purchase is persisted; `Product.cost` renamed/augmented to make clear it holds PMP value; `@Gedmo\Versioned()` on the cost field for audit trail; profit report updated to use `op.costAtSale`; margin display on product list.
**Addresses:** PMP automatic calculation (FEATURES P1)
**Uses:** Doctrine Migrations (already installed), Gedmo extensions (already installed)
**Avoids:** Pitfall about PMP bypass via API Platform direct PATCH

### Phase 4: Stock Alerts

**Rationale:** Stock alerts are independent of Z-Report — can be built in parallel with Phase 3 if resources allow, or sequentially after. They require Phase 1 (RBAC voter for `can_view_stock_alerts`) and Phase 2 (`reOrderLevel` null handling confirmed safe).
**Delivers:** `StockController::alerts()` endpoint with RBAC gate; `ProductStoreRepository::findBelowReorderLevel()` query (excluding nulls); TanStack Query 60-second polling on frontend; Ant Design `Badge` on inventory nav; stock alert banner in POS `app-frontend` (not just admin); alert count widget on admin dashboard.
**Addresses:** Stock alerts (FEATURES P1), stock alert dashboard widget (FEATURES P2)
**Uses:** Ant Design 5 Badge (already installed), TanStack Query `refetchInterval` (already installed)

### Phase 5: Z-Report

**Rationale:** Z-Report is the most complex feature and depends on all preceding phases: RBAC (closing is MANAGER+ only), data model fixes (correct revenue and cost figures), and PMP (cost-at-sale in report). Build it last among the backend features.
**Delivers:** `ZReport` entity with sequential non-resettable counter; `CreateZReportCommand` + handler persisting immutable snapshot; `GET /POST /api/admin/report/z-report` endpoints; cash reconciliation logic (expected vs. actual cash); `ZReportDocument.tsx` using `@react-pdf/renderer` with embedded Amiri font; bilingual (FR/AR) PDF output; all 7 required sections (header, sales summary, payment breakdown, cash reconciliation, denominations, top products, signature block); average basket metric.
**Addresses:** Z-Report (FEATURES P1), average basket metric (FEATURES P2), Z-Report thermal print layout (FEATURES P2)
**Uses:** `@react-pdf/renderer` (new install), Closing entity (existing), Order/OrderProduct/Payment/Expense tables (existing)
**Avoids:** Pitfall 3 (isSuspended filter already fixed in Phase 2), Pitfall about reading stale `Closing.data` JSON blob (use live query)

### Phase 6: RTL and Arabic Completion

**Rationale:** RTL infrastructure fix logically precedes adding new components, but practically it is safer to batch the RTL migration after the core features are implemented (so all new components are migrated together). This phase systematically replaces `ml-*`/`mr-*` across the codebase and fixes the CDN swap.
**Delivers:** TailwindCSS upgraded to ^3.3; `dir="rtl"` set on `<html>` before first render (not in `useEffect`); Bootstrap RTL served locally (not CDN); `ml-*`/`mr-*` replaced with `ms-*`/`me-*` throughout; `<ConfigProvider direction="rtl">` wrapping admin app when Arabic active; `lang.ar.json` gaps audited and filled (missing ~6 keys); all new components from Phases 1-5 have Arabic strings.
**Addresses:** Complete Arabic translation (FEATURES P1), RTL layout verification (FEATURES P1)
**Avoids:** Pitfall 4 (CDN race condition, Tailwind physical property mismatch)

### Phase 7: UI Redesign (POS + Admin Dashboard)

**Rationale:** UI redesign comes after all functional features are implemented. Redesigning first risks double-work (adding feature controls to old layout then redesigning). Redesigning after all features are in place allows the new layout to be designed around complete functionality. RBAC guards must be in place (Phase 1) before UI hiding is implemented.
**Delivers:** Touch-optimized POS screen (large targets, minimal steps to sale, barcode-first but touch-capable); admin dashboard with KPI cards (today revenue, open credits, Z-Report status, low stock count); consistent design language; Jotai `atomWithStorage` version key to handle cart schema migration on deploy.
**Addresses:** POS UI redesign (FEATURES P1), admin dashboard redesign (FEATURES P1)
**Avoids:** UX pitfall of cart localStorage schema mismatch on deploy

### Phase 8: Extended Reports and Restaurant Documentation

**Rationale:** Extended reporting (by category, by supplier) is P2 and depends on the correct profit query foundations from Phase 2. Restaurant documentation is a non-code deliverable and can be produced at any point — batching it here avoids distraction during critical implementation phases.
**Delivers:** Sales and profit reports segmented by product category and by supplier; top products ranked by profit margin (extending existing quantity/revenue rankings); restaurant documentation in FR and AR (table management concept, kitchen ticket flow, menu categories — no code).
**Addresses:** Reports by category/supplier (FEATURES P2), restaurant documentation (FEATURES P2)

### Phase Ordering Rationale

- RBAC first because every new endpoint in every subsequent phase requires `denyAccessUnlessGranted()` — adding it retroactively is a security gap.
- Data model second because three confirmed bugs (no `costAtSale`, no `isSuspended` filter, `float` financial columns) will corrupt every subsequent report unless fixed now.
- PMP third because it depends on the data model fix and its backend logic is already written — it just needs correct wiring.
- Stock alerts fourth because they are independent and relatively low complexity — a confidence-building win before the harder Z-Report work.
- Z-Report fifth because it synthesizes RBAC, data model, and PMP — it can only be correct once all foundations are solid.
- RTL sixth to batch the systematic `ml-*/mr-*` replacement across all new components in one pass.
- UI redesign seventh to avoid designing around incomplete features.
- Extended reports and documentation last as P2 deliverables.

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (Z-Report):** `@react-pdf/renderer` Arabic RTL rendering must be verified against a test document before committing. The library's bidi algorithm support for Arabic is MEDIUM confidence — validate at install time. The sequential Z-counter mechanism (guaranteeing gaps are never created) also needs careful transactional design.
- **Phase 6 (RTL):** The extent of `ml-*/mr-*` replacements (185+ occurrences confirmed) should be scoped precisely before sprint planning — this is a larger task than it appears.

Phases with standard patterns (skip research-phase):
- **Phase 1 (RBAC):** Symfony Voter pattern is official, well-documented, and all code samples are confirmed against Symfony 5.4 docs.
- **Phase 2 (Data Model):** Standard Doctrine migrations. No research needed.
- **Phase 3 (PMP):** Formula is mathematically fixed accounting standard. Implementation is already written — just needs wiring verification.
- **Phase 4 (Stock Alerts):** TanStack Query polling is a well-documented pattern. Repository query is straightforward.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Backend choices HIGH (direct code inspection). `@react-pdf/renderer` Arabic RTL support MEDIUM (training data, needs live verification). `@dnd-kit` version MEDIUM (check npmjs at install time). |
| Features | MEDIUM | Permission matrix and Z-Report section list based on POS industry training data (Square, Loyverse, Lightspeed) — not verified via live docs. PMP formula HIGH (standard accounting). Mauritanian payment method names MEDIUM (correct as of early 2025, verify market status). |
| Architecture | HIGH | All architectural patterns grounded in direct codebase inspection + official Symfony 5.4 docs. CQRS structure, Voter pattern, Doctrine event listener wiring all confirmed. |
| Pitfalls | HIGH | All 5 critical pitfalls confirmed by direct code analysis: `OrderProduct` schema verified, `ReportController` query verified, `security.yaml` verified, `export.items.tsx` verified, RTL CDN mechanism verified. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`@react-pdf/renderer` Arabic rendering:** Install the library early in Phase 5, generate a test bilingual PDF, and verify before building the full Z-Report component. If Arabic rendering fails, `dompdf` server-side becomes the fallback (adds backend complexity but is more predictable for Arabic).
- **JWT roles in token payload:** Confirm that `lexik/jwt-authentication-bundle` currently includes `roles[]` in the JWT claims. If not, the frontend `useHasRole()` hook needs to call `/api/auth/info` on login rather than decoding the JWT locally — this changes the Phase 1 frontend architecture.
- **`PurchaseItem.unitPrice` field existence:** The PMP formula in `PurchaseEvent.php` reads a purchase price from `PurchaseItem`. Verify the field name in the entity before Phase 3 implementation begins.
- **Mauritanian payment method current status:** Bankily, Masrivi, and Sedad names are from training data. Verify these are still the correct product names in the current Mauritanian market before seeding.
- **`Product.cost` string migration data safety:** Existing cost values stored as strings (e.g., `"1500.0000"`) must be validated to migrate cleanly to `DECIMAL(10,4)` without data loss. Run migration in a staging environment first.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `back/src/Entity/OrderProduct.php`, `ProductStore.php`, `Product.php`, `Closing.php`, `User.php` — entity schema gaps confirmed
- Direct codebase inspection: `back/src/EventSubscriber/Purchase/PurchaseEvent.php` — PMP formula verified correct
- Direct codebase inspection: `back/config/packages/security.yaml` — single broad access_control rule, no voters, no role hierarchy confirmed
- Direct codebase inspection: `back/src/Controller/Api/Admin/ReportController.php` — `isSuspended` filter absence confirmed
- Direct codebase inspection: `front/src/app-frontend/components/settings/items/export.items.tsx` — JWT in URL param confirmed
- Direct codebase inspection: `front/src/language/lang.ar.json` (504 lines) vs `lang.fr.json` (510 lines) — translation gap confirmed
- Direct codebase inspection: `back/composer.json`, `front/package.json` — full dependency inventory
- Symfony 5.4 Security Voter documentation — official, version-specific

### Secondary (MEDIUM confidence)
- POS industry training data (Square, Toast, Lightspeed, Loyverse): Z-Report structure, RBAC permission matrices, stock alert behavior
- TailwindCSS v3.3 logical property documentation: `ms-*`/`me-*` behavior under `dir="rtl"`
- `@react-pdf/renderer` v3 Arabic font embedding pattern: `Font.register()` with Amiri/Cairo
- `@dnd-kit` vs `react-dnd` comparison: maintenance status, touch support

### Tertiary (LOW confidence)
- Mauritanian payment method market status (Bankily/Masrivi/Sedad): names and issuers based on early 2025 training data — verify before implementation

---

*Research completed: 2026-02-17*
*Ready for roadmap: yes*
