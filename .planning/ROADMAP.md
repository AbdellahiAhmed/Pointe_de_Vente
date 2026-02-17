# Roadmap: VelociPOS

## Overview

VelociPOS is a brownfield Symfony 5.4 + React 18 POS application being hardened for academic presentation. The existing codebase is structurally sound but incomplete on 8 sections: RBAC, PMP cost calculation, stock alerts, Z-Report, Mauritanian payment methods, complete Arabic translation, professional UI redesign, and restaurant documentation. This roadmap delivers all 45 v1 requirements across 8 phases ordered by strict dependency — RBAC first (gates every subsequent endpoint), data model fixes second (prevents corrupt reporting data), then features that depend on those foundations, and finally UI polish and documentation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: RBAC and Security** - Establish role hierarchy, Symfony Voters, user migration, and frontend guards before any new endpoint is added
- [ ] **Phase 2: Data Model Corrections** - Fix the three data integrity bugs that corrupt every report if left unresolved
- [ ] **Phase 3: PMP and Purchase Flow** - Wire the existing PMP formula correctly and expose cost data across the system
- [ ] **Phase 4: Stock Alerts and Payments** - Add low-stock detection with POS badge and seed Mauritanian payment types
- [ ] **Phase 5: Z-Report and Extended Reports** - Build the full professional Z-Report and enhanced analytics reports
- [ ] **Phase 6: RTL and Arabic Completion** - Systematically complete Arabic translation and fix the RTL layout infrastructure
- [ ] **Phase 7: UI Redesign** - Deliver professional POS and admin interfaces designed around complete functionality
- [ ] **Phase 8: Restaurant Documentation** - Produce the formal restaurant extension design document

## Phase Details

### Phase 1: RBAC and Security
**Goal**: Every user operates within a defined role that restricts what they can see and do, with enforcement both in the API and the UI.
**Depends on**: Nothing (first phase — establishes security baseline for all future endpoints)
**Requirements**: RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05, RBAC-06
**Success Criteria** (what must be TRUE):
  1. Admin can create a user, assign them VENDEUR or MANAGER role, and that user can only access the screens permitted for their role after logging in.
  2. A VENDEUR attempting to reach an admin or reports URL is redirected or blocked — both at the API level (HTTP 403) and the UI level (route guard).
  3. A MANAGER can access reports, stock management, and closing but cannot reach user management or system settings.
  4. All existing users retain their access after deployment (no lockout from the role migration).
  5. Every new API endpoint added in subsequent phases is role-gated by default via the established Voter pattern.
**Plans**: TBD

Plans:
- [ ] 01-01: Backend — role hierarchy in security.yaml, user data migration, Symfony Voters for Order/Purchase/Report/UserManagement domains
- [ ] 01-02: Frontend — useHasRole() hook, route guards, role-gated nav items, fix JWT-in-URL export security hole

### Phase 2: Data Model Corrections
**Goal**: All financial and reporting data in the database is accurate, correctly typed, and properly filtered so every subsequent feature builds on solid ground.
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Revenue reports exclude parked/suspended orders — a sale that was suspended but never completed does not appear in daily totals.
  2. The Closing entity stores financial figures as DECIMAL(20,2) — floating-point rounding errors are eliminated from cash reconciliation.
  3. Z-Report queries return only orders belonging to the correct session, with no data leaking from other terminal sessions.
**Plans**: TBD

Plans:
- [ ] 02-01: Schema migrations — Product.cost string→decimal, OrderProduct.costAtSale column, Closing float→decimal, User.roles array→json, Core/Discont namespace fix
- [ ] 02-02: Query fixes — add isSuspended filter to all ReportController revenue queries; verify session scoping on Closing queries

### Phase 3: PMP and Purchase Flow
**Goal**: Product cost is tracked precisely using the weighted-average PMP formula, and profit figures in all reports reflect the actual cost at the time of sale.
**Depends on**: Phase 2 (requires Product.cost decimal type and OrderProduct.costAtSale column)
**Requirements**: PMP-01, PMP-02, PMP-03, PMP-04, PMP-05
**Success Criteria** (what must be TRUE):
  1. After receiving a purchase, the product's cost (PMP) updates automatically using the weighted-average formula without any manual action.
  2. The product detail page in admin displays the current PMP value.
  3. A profit report for a completed sale uses the cost that was in effect when the sale was made, not the current product cost — changing a product cost after a sale does not retroactively alter historical profit figures.
**Plans**: TBD

Plans:
- [ ] 03-01: Backend — wire PMP recalculation as Doctrine postPersist listener, add Gedmo\Versioned audit trail on cost field, update CreateOrderCommandHandler to snapshot costAtSale at order creation
- [ ] 03-02: Frontend — display PMP on product detail page; update profit report queries to use op.costAtSale

### Phase 4: Stock Alerts and Payments
**Goal**: The cashier sees a clear visual indicator when stock is critically low, the admin can view which products need restocking, and the five Mauritanian payment methods are available for selection.
**Depends on**: Phase 1 (RBAC voter for stock alert endpoint), Phase 2 (null-safe reOrderLevel handling confirmed)
**Requirements**: STOCK-01, STOCK-02, STOCK-03, STOCK-04, PAY-01, PAY-02
**Success Criteria** (what must be TRUE):
  1. A product with stock below its configurable threshold (default 10) appears in the stock alert list in the admin panel, filterable by store.
  2. The POS screen displays a badge showing the count of low-stock products, visible to the cashier without navigating away.
  3. When processing a sale, the cashier can select Bankily, Masrivi, Sedad, Especes, or Credit as the payment method.
  4. The Z-Report correctly categorizes each payment by type (cash / mobile / credit) for reconciliation.
**Plans**: TBD

Plans:
- [ ] 04-01: Backend — StockController GET /api/admin/stock/alerts with RBAC gate, ProductStoreRepository::findBelowReorderLevel(), per-product reOrderLevel config; seed Mauritanian payment types (PAY-01, PAY-02) with cash/mobile/credit attribute
- [ ] 04-02: Frontend — TanStack Query 60s polling for alerts, Ant Design Badge on inventory nav, stock alert banner in POS, stock alert page in admin with store filter

### Phase 5: Z-Report and Extended Reports
**Goal**: The end-of-day Z-Report is a complete, immutable, printable document that meets standard retail cash register requirements, and the reports section provides actionable analytics by category, vendeur, and time.
**Depends on**: Phase 1 (MANAGER+ only), Phase 2 (correct revenue/cash data), Phase 3 (costAtSale for profit in report)
**Requirements**: ZRPT-01, ZRPT-02, ZRPT-03, ZRPT-04, ZRPT-05, ZRPT-06, ZRPT-07, ZRPT-08, RAPT-01, RAPT-02, RAPT-03, RAPT-04, RAPT-05
**Success Criteria** (what must be TRUE):
  1. A MANAGER can close a session and generate a Z-Report with a sequential non-resettable number — the report cannot be regenerated or altered after creation.
  2. The Z-Report PDF displays all required sections: store header, sales summary (gross/discounts/net/returns/average basket), payment breakdown by type, cash reconciliation (expected vs counted with variance), denomination count, and signature block.
  3. The Z-Report PDF downloads in both French and Arabic.
  4. The sales report breaks down revenue by payment mode, product category, and vendeur with average basket shown.
  5. The profit report shows margin per product using the cost-at-sale figure, not the current live product cost.
**Plans**: TBD

Plans:
- [ ] 05-01: Backend — ZReport entity with sequential counter, CreateZReportCommand + handler persisting immutable snapshot, GET/POST /api/admin/report/z-report endpoints, cash reconciliation logic
- [ ] 05-02: Backend — enhanced report queries: by category (RAPT-05), by vendeur (RAPT-04), top products with profit margin, average basket metric, comparison J-1 for daily report (RAPT-03)
- [ ] 05-03: Frontend — ZReportDocument.tsx with @react-pdf/renderer + Amiri Arabic font, bilingual PDF output, Z-Report UI page; enhanced report pages with category/vendeur/top-product breakdowns

### Phase 6: RTL and Arabic Completion
**Goal**: The application displays correctly in Arabic with proper right-to-left layout on every screen, including all features added in Phases 1-5.
**Depends on**: Phases 1-5 (all new components must exist before systematic RTL migration)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04
**Success Criteria** (what must be TRUE):
  1. Switching the app to Arabic reverses the layout direction on every screen — margins, padding, icons, and text all align correctly for RTL reading.
  2. All new screens added in Phases 1-5 (roles UI, stock alerts, Z-Report, enhanced reports) display translated Arabic strings with no missing translation keys.
  3. The Bootstrap RTL asset loads from a local file with no CDN race conditions.
  4. Ant Design admin components (tables, forms, menus) use direction="rtl" when Arabic is active.
**Plans**: TBD

Plans:
- [ ] 06-01: Infrastructure — upgrade TailwindCSS 3.1.8 → ^3.3, replace CDN RTL swap with local Bootstrap RTL asset, set dir="rtl" on html element before first render
- [ ] 06-02: Content — audit and fill lang.ar.json gaps, translate all new keys from Phases 1-5, replace ml-*/mr-* with ms-*/me-*/ps-*/pe-* throughout codebase, wrap admin app in ConfigProvider direction="rtl"

### Phase 7: UI Redesign
**Goal**: The POS interface is touch-optimized and visually professional, and the admin dashboard surfaces real KPIs immediately on login.
**Depends on**: Phases 1-6 (all functional features must exist before designing around them; RBAC guards must be in place before UI hiding)
**Requirements**: UIPOS-01, UIPOS-02, UIPOS-03, UIPOS-04, UIADM-01, UIADM-02, UIADM-03
**Success Criteria** (what must be TRUE):
  1. The POS screen allows a cashier to find a product, add it to the cart, and complete a sale in minimal taps — with large touch targets, clear product images, and a prominent payment flow.
  2. The POS interface functions correctly on a tablet or touchscreen without requiring a mouse.
  3. The admin dashboard shows today's revenue, number of tickets, average basket, and low-stock count as KPI cards immediately on login.
  4. Report pages display data as charts rather than raw tables.
  5. The user management page reflects the three-role system (VENDEUR/MANAGER/ADMIN) with role assignment integrated into the interface.
**Plans**: TBD

Plans:
- [ ] 07-01: POS UI redesign — touch-optimized product grid with professional image display, redesigned cart and checkout panel, tactile payment method buttons (UIPOS-01, UIPOS-02, UIPOS-03, UIPOS-04)
- [ ] 07-02: Admin UI redesign — dashboard KPI cards (CA, tickets, panier moyen, stock bas), Nivo chart integration on report pages, role-integrated user management page (UIADM-01, UIADM-02, UIADM-03)

### Phase 8: Restaurant Documentation
**Goal**: A professional bilingual document describes the restaurant extension concept in sufficient detail for academic presentation, demonstrating architectural thinking without any code implementation.
**Depends on**: None (non-code deliverable; can be produced independently, batched here to avoid distraction during implementation phases)
**Requirements**: REST-01, REST-02
**Success Criteria** (what must be TRUE):
  1. The document describes table management, modifier system, kitchen order flow, and kitchen display screen at a level of detail sufficient for a technical reviewer to understand how the system would work.
  2. The document is formatted professionally and is available in French (and Arabic section headers where applicable).
**Plans**: TBD

Plans:
- [ ] 08-01: Write restaurant extension design document covering table management, modifiers, kitchen ticket flow, and kitchen display screen — bilingual format (FR/AR headers)

## Progress

**Execution Order:**
Phases execute in strict dependency order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. RBAC and Security | 0/2 | Not started | - |
| 2. Data Model Corrections | 0/2 | Not started | - |
| 3. PMP and Purchase Flow | 0/2 | Not started | - |
| 4. Stock Alerts and Payments | 0/2 | Not started | - |
| 5. Z-Report and Extended Reports | 0/3 | Not started | - |
| 6. RTL and Arabic Completion | 0/2 | Not started | - |
| 7. UI Redesign | 0/2 | Not started | - |
| 8. Restaurant Documentation | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-17*
*Depth: comprehensive | Coverage: 45/45 requirements*
