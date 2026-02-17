# Feature Research

**Domain:** Point of Sale (POS) — Professional retail, Mauritanian market
**Researched:** 2026-02-17
**Confidence:** MEDIUM (WebSearch/WebFetch unavailable; grounded in existing codebase analysis + MEDIUM-confidence training data on POS industry standards from Square, Toast, Lightspeed, Loyverse)

---

## Context: What Already Exists

The following are already implemented in VelociPOS and are NOT in scope for this milestone:

- Product management (CRUD, barcode, categories, brands, suppliers)
- Cart / sales flow (add, quantity, line discounts, receipt)
- Customer management
- Suppliers / purchases
- Basic closing (Closing entity: openingBalance, closingBalance, cashAdded, cashWithdrawn, denominations, expenses)
- Payment types (cash, credit card, points, credit — generic, not Mauritanian-specific)
- Multi-store (Store entity, user-to-store assignment)
- Basic reports (sales-report.tsx, profit-report.tsx, daily-report.tsx: totalOrders, netRevenue, grossProfit, payments breakdown, top products)
- FR/AR i18n (lang.fr.json, lang.ar.json)
- Offline cache (IndexedDB)
- Barcode scanning
- Touch keyboard

Current RBAC state: only `ROLE_USER` and `ROLE_ADMIN` — no `ROLE_MANAGER` / `ROLE_VENDEUR`, no permission granularity.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that professional POS managers expect. Missing these = product feels amateur or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **RBAC: 3 defined roles (VENDEUR / MANAGER / ADMIN)** | Every professional POS (Square, Loyverse, Lightspeed) has cashier / manager / owner role separation. Shared credentials are a security and audit failure. | MEDIUM | Currently only ROLE_USER + ROLE_ADMIN exist in code. Must add ROLE_MANAGER, ROLE_VENDEUR with enforced permission matrix on both backend (Symfony voters/access_control) and frontend (route guards). |
| **RBAC: permission matrix per role** | Roles without defined permissions are meaningless. A VENDEUR must not access reports. A MANAGER must not change system settings. | MEDIUM | Requires Symfony Voter or access_control rules per resource. Frontend must hide/disable restricted UI elements. |
| **Z-Report (Rapport Z) — session-based daily closing** | Z-Report is the industry-standard end-of-day document produced when a cash session closes. Required for accounting, tax compliance, and anti-fraud. Name comes from "Zeroing" the register. | HIGH | Existing Closing entity has most fields but the report rendering is missing. Z-Report must be irreversible (session closed, report printed/saved as immutable snapshot). |
| **Z-Report: sequential report number** | Tax authorities in most countries require Z-Reports to have a sequential, non-resettable counter (Z-counter). Gaps in the sequence trigger audits. | LOW | Add a `zReportNumber` auto-increment field to Closing entity. Must never reset. |
| **Z-Report: cash reconciliation section** | Cashiers count physical bills, the system shows expected cash, difference is surfaced. This is the core anti-theft mechanism. | MEDIUM | Closing entity already has `denominations` (JSON) and `openingBalance` / `closingBalance`. Need: expected cash = openingBalance + cashSales + cashAdded - cashWithdrawn - expenses. Difference = actualCounted - expected. |
| **Stock alerts: per-product minimum threshold** | Without alerts, stock-outs are discovered by a cashier failing to sell an item. Every professional POS (Lightspeed, Loyverse, Square for Retail) has reorder point alerts. | MEDIUM | No `alertThreshold` field exists on Product entity. Need to add it. Alert trigger: quantity falls below threshold on any sale or manual adjustment. |
| **PMP (Prix Moyen Pondéré / weighted average cost) auto-calculation** | Static purchase cost on Product leads to wrong profit calculations when goods are purchased at different prices over time. PMP is the GAAP-standard method for retail inventory valuation. | HIGH | Product entity has static `cost` field. PMP must be recalculated on each purchase receipt: PMP_new = (currentStock * currentPMP + receivedQty * purchasePrice) / (currentStock + receivedQty). Requires new `pmpCost` field (or rename `cost`) and calculation hook on purchase. |
| **Mauritanian payment methods: Bankily, Masrivi, Sedad** | These are the dominant mobile money platforms in Mauritania (Bankily = BCI, Masrivi = GBM/Chinguiitel, Sedad = BNM). A POS serving Mauritanian businesses without them is not fit for purpose. | LOW | Payment entity supports arbitrary types. Need: pre-seeded data migration adding Bankily, Masrivi, Sedad payment types with `canHaveChangeDue = false`. No API integration required — manual confirmation model (cashier confirms payment received on phone). |
| **Professional Z-Report print layout** | The printed Z-Report must be formatted for thermal printer (80mm paper) or A4, with store header, sequential number, session info, and all required sections. The existing "Print Report" button uses `window.print()` on a generic web layout — not suitable. | MEDIUM | Need a dedicated print stylesheet or React component with proper thermal printer formatting, store logo/name, report number, timestamp. |
| **Complete Arabic translation (AR i18n)** | The app targets Mauritanian businesses. Arabic is the official language and many staff read only Arabic. The existing `lang.ar.json` file exists but is incomplete. | MEDIUM | Audit all `t('key')` calls against `lang.ar.json`. Every missing key defaults to English, breaking the Arabic UX. RTL layout must also be verified. |

---

### Differentiators (Competitive Advantage)

Features that set VelociPOS apart in the Mauritanian market. Not universal expectations, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Admin dashboard redesign with KPI cards** | Generic Bootstrap dashboards feel outdated. A modern dashboard with at-a-glance KPIs (today's revenue, top seller, low stock alert count, open credit balance) signals product quality. | MEDIUM | Current dashboard is functional but minimal. Redesign should surface actionable data: stock alerts count, pending credit payments total, today vs yesterday comparison. |
| **POS UI redesign (touch-optimized)** | POS interfaces are used under pressure. Square and Toast invest heavily in large touch targets, minimal steps to complete a sale, and visual hierarchy. | HIGH | Current POS interface needs audit: button sizes, cart flow, payment modal UX, numeric keypad positioning for touch. Must remain keyboard/barcode-scanner-first for PC users too. |
| **Reports by category and by supplier/brand** | Generic daily sales reports hide insights. Managers want to know which product categories drive profit and which suppliers are most reliable. | MEDIUM | Existing reports show products; need grouping dimension (category, supplier). Requires SQL GROUP BY on categories/suppliers. |
| **Average basket (panier moyen) metric** | Average transaction value is a key retail KPI. Tracking it over time reveals upselling success. Not in current daily report. | LOW | Simple calculation: netRevenue / totalOrders. Add to daily report data object and Z-Report. |
| **Top products ranking** | Already exists in daily report. Differentiator if extended to: top by quantity, top by revenue, top by profit margin. | LOW | Already partially implemented (top products by qty/revenue). Add profit-based ranking. |
| **Stock alert dashboard widget** | Surfacing low-stock alerts on the admin dashboard (not just in product list) enables proactive purchasing. | LOW | Requires query: products where quantity <= alertThreshold. Display count + quick link to filtered product list. |
| **Restaurant documentation (FR/AR)** | The supervisor requires documentation for restaurant mode — not implementation. This is a market positioning document showing VelociPOS can adapt to F&B. | LOW | Document only: table management concept, kitchen ticket flow, menu categories, covers/seats. No code changes. Value: sales tool for F&B prospects. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create disproportionate complexity or risk for this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Bankily/Masrivi API integration (real-time)** | Managers want automatic payment confirmation | Mauritanian mobile money APIs are not publicly documented, change without notice, and require commercial agreements. A failed API call during a sale blocks checkout. | Manual confirmation model: cashier selects payment type, enters transaction reference number manually. No API dependency. Works reliably. |
| **Multi-terminal Z-Report consolidation** | Businesses with multiple terminals want one Z-Report | Multi-terminal reconciliation requires understanding which sales belong to which session, merging denominations counts, and handling split sessions. High complexity for v1. | Per-terminal Z-Report is the industry standard (each terminal closes independently). Manager mentally or manually aggregates. Implement consolidation in v2. |
| **Granular per-user permissions (beyond 3 roles)** | Admins want to customize exactly what each user can do | Fine-grained ACL systems (per-resource, per-user overrides) create management nightmares and testing explosions. Square, Toast, and Loyverse all use role-based (not user-based) permissions. | Three clean roles with well-defined permission matrices. VENDEUR / MANAGER / ADMIN covers 95% of real Mauritanian retail scenarios. |
| **Real-time stock sync across terminals** | Store owners want instant stock visibility | Real-time sync requires WebSockets or SSE, conflicts with offline mode, and creates distributed transaction problems when network drops mid-sale. | Pessimistic stock deduction on sale (deduct immediately from DB). Each terminal's IndexedDB cache refreshes on load. Sub-second lag is acceptable. |
| **Automatic reorder / purchase order generation from stock alerts** | Saves purchasing time | Connects POS to procurement workflow. Requires supplier lead times, MOQ configuration, and approval flows. Scope explosion. | Stock alert notifies manager → manager creates purchase order manually. Automation is a v2 feature. |
| **Email/SMS notifications for stock alerts** | Managers want alerts on phone | Requires SMTP/SMS provider integration (especially tricky in Mauritania), queue management, and introduces external dependency. | Dashboard widget showing alert count is sufficient for v1. Notification system deferred to v2. |

---

## Feature Dependencies

```
[PMP Calculation]
    └──requires──> [Purchase / PurchaseItem entity with purchase price]
                       └──requires──> [Product.pmpCost field (new or renamed from cost)]

[Z-Report professional format]
    └──requires──> [Closing entity with zReportNumber (sequential)]
    └──requires──> [Cash reconciliation calculation (expected vs actual)]
    └──requires──> [Print-optimized layout component]
    └──enhances──> [Average basket metric in report]

[Stock Alerts]
    └──requires──> [Product.alertThreshold field (new)]
    └──enhances──> [Admin dashboard widget (low stock count)]
    └──enhances──> [Z-Report (stock summary section, optional)]

[RBAC 3 Roles]
    └──requires──> [Backend: Symfony voters or access_control per resource]
    └──requires──> [Frontend: route guards per role]
    └──blocks──> [Z-Report closing action (MANAGER+ only)]
    └──blocks──> [Stock alert threshold edit (MANAGER+ only)]
    └──blocks──> [PMP override (ADMIN only)]
    └──blocks──> [Report access (MANAGER+ for full reports, VENDEUR sees none)]

[Mauritanian Payment Methods]
    └──requires──> [Data migration seeding Bankily, Masrivi, Sedad in Payment table]
    └──enhances──> [Z-Report payment breakdown (these types appear in totals)]

[Arabic Translation]
    └──requires──> [Translation key audit across all components]
    └──requires──> [RTL layout verification for new components]
    └──must accompany──> [All new features (Z-Report, alerts, dashboard)]

[POS UI Redesign]
    └──conflicts──> [implement-as-you-go approach] (redesign should happen before new features are added to POS screen to avoid double-work)

[Admin Dashboard Redesign]
    └──enhances──> [Stock Alerts widget]
    └──enhances──> [KPI cards: today's revenue, open credits, Z-Report status]
```

### Dependency Notes

- **PMP requires purchase price history:** The existing `cost` field is a static manually-set value. PMP requires the actual unit price from each purchase receipt (`PurchaseItem.unitPrice`). The PurchaseItem entity exists — check if it stores unit price; if not, that field must be added as part of PMP implementation.
- **Z-Report requires RBAC:** The closing action (triggering Z-Report) must be MANAGER or ADMIN only. A VENDEUR can initiate the count but cannot finalize closing without manager approval or manager credentials.
- **Arabic translation must accompany all new features:** Every new component (Z-Report layout, stock alert UI, redesigned dashboard) must have Arabic strings added to `lang.ar.json` at the time of implementation. Retrofitting translations later doubles the work.
- **UI redesigns should precede new feature additions to those screens:** Redesigning the POS screen and admin dashboard first, then adding new features (stock alert widget, Z-Report button placement) into the redesigned layout avoids UI regression.

---

## Z-Report: Professional Standard Contents

**Confidence: MEDIUM** — Based on POS industry training data (Loyverse, Square, French fiscal standards, standard retail accounting). WebSearch unavailable for direct verification.

A professional Z-Report (Rapport Z) is an end-of-day closing document that:
1. Has a **sequential, non-resettable Z-counter** (e.g., "Rapport Z n°0042")
2. Covers a **specific cash session** (dateFrom → dateTo, terminal, opened/closed by)
3. Is **immutable after generation** — stored as a snapshot, not recalculated from live data
4. Covers all sales, returns, payments, cash movements for that session

### Required Sections

**Section 1: Header**
- Store name and address
- Terminal identifier
- Z-Report sequential number
- Session dates: opened at [datetime] by [user], closed at [datetime] by [user]
- Report generated at timestamp

**Section 2: Sales Summary**
- Total transactions (sales + returns separately)
- Gross revenue (before discounts)
- Total discounts applied
- Net revenue (after discounts)
- Number and value of returned orders
- Average basket value (net revenue / number of sales transactions)

**Section 3: Payment Breakdown**
- One line per payment type: Cash, Credit (deferred), Bankily, Masrivi, Sedad
- Amount per payment type
- Total payments (must equal net revenue)

**Section 4: Cash Reconciliation**
- Opening float (openingBalance)
- Cash sales collected
- Cash added to drawer (float additions)
- Cash withdrawn from drawer
- Expenses paid in cash
- Expected cash in drawer (calculated)
- Actual cash counted (from denominations)
- Difference (over/short): surfaced prominently, negative = shortage, positive = overage

**Section 5: Cash Denominations Detail**
- Physical bill/coin breakdown: 500 MRU × N sheets = X MRU, etc.
- Total of counted cash

**Section 6: Top Products (optional but valued)**
- Top 5-10 products by quantity sold during session

**Section 7: Signature Block**
- Cashier name + signature line
- Manager name + signature line
- Date

---

## RBAC: Standard Permission Matrix for 3-Role POS

**Confidence: MEDIUM** — Industry standard from training data (Square, Toast, Lightspeed documentation patterns). Specific values need validation against supervisor requirements.

| Permission | VENDEUR | MANAGER | ADMIN |
|------------|---------|---------|-------|
| Login, select store/terminal | YES | YES | YES |
| Create sale, scan products | YES | YES | YES |
| Apply line discount (up to X%) | YES (limited) | YES (up to max) | YES (any) |
| Apply cart-level discount | NO | YES | YES |
| Accept cash payment | YES | YES | YES |
| Accept Bankily/Masrivi/Sedad payment | YES | YES | YES |
| Accept credit (deferred) payment | YES (with customer) | YES | YES |
| Issue refund/return | NO | YES | YES |
| Open cash session | YES | YES | YES |
| Close cash session / generate Z-Report | NO | YES | YES |
| View own day's transactions | YES | YES | YES |
| View reports (sales, profit, daily) | NO | YES | YES |
| View customer list and balances | NO | YES | YES |
| Manage customers (CRUD) | NO | YES | YES |
| Create/edit products | NO | YES | YES |
| Set stock alert threshold | NO | YES | YES |
| View stock levels | YES (read-only) | YES | YES |
| Create purchase orders | NO | YES | YES |
| Receive purchases (triggers PMP recalc) | NO | YES | YES |
| Manage suppliers | NO | NO | YES |
| Manage users (CRUD) | NO | NO | YES |
| Assign roles to users | NO | NO | YES |
| Configure payment types | NO | NO | YES |
| View/change store settings | NO | NO | YES |
| Access admin dashboard | NO | YES | YES |
| Override price below minimum | NO | YES | YES |
| Override price above maximum | NO | NO | YES |

### Implementation Pattern
- Symfony backend: use `access_control` in security.yaml per route prefix AND Symfony Voters for entity-level checks (e.g., manager can only manage products in their assigned stores).
- Frontend: role stored in JWT claims → React context provides `hasRole(role)` → route guard redirects unauthorized users → UI elements conditionally rendered.
- **Critical:** Backend enforcement is the security boundary. Frontend hiding is UX only.

---

## Stock Alerts: Industry Standard Behavior

**Confidence: MEDIUM** — From training data on Loyverse, Lightspeed, Square for Retail.

### How It Works in Practice

1. **Configuration:** Each product has an optional `alertThreshold` (minimum stock quantity). Default: null (no alert).
2. **Trigger points:** Stock quantity is checked after:
   - A sale completes (stock decremented per OrderProduct)
   - A manual stock adjustment (decrease)
   - A purchase return (decrease)
3. **Alert state:** `isLowStock = (quantity <= alertThreshold)` — computed, not stored (to avoid stale flags).
4. **Surfacing:**
   - Admin dashboard widget: "X products below threshold" with link to filtered product list
   - Product list: visual indicator (red badge, warning icon) on low-stock products
   - Z-Report: optional section listing products that hit low-stock during the session
5. **No notification push required for v1:** Dashboard widget is sufficient.

### Data Model Addition Required

```php
// Product entity needs:
private ?int $alertThreshold = null;  // null = no alert configured
```

Query for alert check:
```sql
SELECT p.* FROM product p
JOIN product_store ps ON ps.product_id = p.id
WHERE p.alert_threshold IS NOT NULL
  AND p.quantity <= p.alert_threshold
  AND ps.store_id = :storeId
```

---

## PMP (Prix Moyen Pondéré): Implementation Standard

**Confidence: HIGH** — PMP/Weighted Average Cost is a standard accounting method. The formula is fixed by accounting principles.

### Formula

```
PMP_new = (currentStock × currentPMP + receivedQuantity × purchaseUnitPrice) / (currentStock + receivedQuantity)
```

Where `currentPMP` is the product's current weighted average cost (the `cost` field renamed or new `pmpCost` field).

### Trigger Points

- **On purchase receipt (the primary trigger):** When a `Purchase` is confirmed/received, for each `PurchaseItem`, recalculate PMP.
- **On purchase cancellation/return to supplier:** Reverse the PMP calculation (complex — may need to reset to last known PMP or use FIFO fallback).
- **Initial state:** If currentStock = 0, PMP_new = purchaseUnitPrice (no average needed).

### What Changes

- Product entity: rename `cost` → `pmpCost` OR add `pmpCost` field alongside existing `cost`. Using a separate field is safer (keeps backward compatibility).
- PurchaseItem/Purchase: must store actual `unitPrice` paid (check if already exists in entity).
- Profit calculation: all profit reports must use `pmpCost` instead of `cost` for accurate gross margin.
- Z-Report: cost section reflects PMP at time of closing.

### Edge Cases

- Negative stock: should not happen, but guard against division by zero.
- Stock adjustment (decrease only): does NOT change PMP (cost of goods already recognized).
- Stock adjustment (increase / manual addition): requires user to input cost → treated as a mini-purchase for PMP purposes.

---

## MVP Definition (This Milestone)

### Launch With (v1 — this milestone)

The supervisor's requirements define this milestone's MVP:

- [ ] **RBAC: 3 roles** (VENDEUR / MANAGER / ADMIN) with backend enforcement and frontend guards — required for any other feature to be secure
- [ ] **PMP automatic calculation** on purchase receipt, reflected in all profit reports
- [ ] **Stock alerts** with per-product configurable threshold, dashboard widget, and product list indicators
- [ ] **Z-Report** with sequential number, cash reconciliation, payment breakdown, all required sections, printable layout
- [ ] **Mauritanian payment methods** seeded (Bankily, Masrivi, Sedad) — data migration, not API integration
- [ ] **POS UI redesign** — touch-optimized, consistent design system
- [ ] **Admin dashboard redesign** — KPI cards, stock alert widget, quick actions
- [ ] **Complete Arabic translation** — all existing + new components
- [ ] **Restaurant documentation** (FR/AR document, no code)
- [ ] **Reports: by category, by supplier** — extend existing reports
- [ ] **Average basket metric** — add to daily report and Z-Report

### Add After Validation (v1.x)

- [ ] Z-Report email delivery — trigger: need for remote managers
- [ ] Stock alert in-app notifications — trigger: managers report missing alerts
- [ ] Multi-terminal Z-Report consolidation — trigger: customer with 3+ terminals

### Future Consideration (v2+)

- [ ] Bankily/Masrivi API real-time confirmation — trigger: sufficient adoption + official API access
- [ ] Automatic purchase order from stock alerts — trigger: customer demand + supplier management maturity
- [ ] Loyalty / points program — trigger: Phase 2 multi-tenant roadmap
- [ ] Fine-grained per-user permission overrides — trigger: enterprise customer requirement

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| RBAC 3 roles (backend) | HIGH | MEDIUM | P1 |
| RBAC frontend guards | HIGH | MEDIUM | P1 |
| Mauritanian payment methods (seed data) | HIGH | LOW | P1 |
| PMP calculation | HIGH | HIGH | P1 |
| Stock alerts (threshold field + check) | HIGH | MEDIUM | P1 |
| Z-Report (full format) | HIGH | HIGH | P1 |
| Arabic translation (complete) | HIGH | MEDIUM | P1 |
| POS UI redesign | MEDIUM | HIGH | P1 |
| Admin dashboard redesign | MEDIUM | MEDIUM | P1 |
| Reports by category/supplier | MEDIUM | MEDIUM | P2 |
| Average basket metric | MEDIUM | LOW | P2 |
| Stock alert dashboard widget | HIGH | LOW | P2 |
| Restaurant documentation | LOW | LOW | P2 |
| Z-Report print layout (thermal) | MEDIUM | MEDIUM | P2 |

**Priority key:**
- P1: Must have for milestone sign-off
- P2: Should have, add in same milestone if time permits
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Loyverse | Square for Retail | Lightspeed | VelociPOS (target) |
|---------|----------|-------------------|------------|-------------------|
| Z-Report | Full (sequential counter, cash reconciliation, payment breakdown, print) | Full (period closure report, immutable) | Full (Z-closure, multi-terminal consolidation) | Full format with sequential counter — implement this milestone |
| RBAC | 3 roles: Cashier / Manager / Owner | 3 roles + custom permissions | 3 roles + fine-grained | 3 roles: VENDEUR / MANAGER / ADMIN |
| Stock alerts | Per-product reorder point, email notification | Low stock alerts, push notification | Reorder point + auto-PO generation | Per-product threshold, dashboard widget |
| Inventory costing method | Weighted average (PMP) | FIFO | FIFO or weighted average | PMP (weighted average) — aligns with French accounting standards |
| Mobile money | Not applicable (US/EU focused) | Not applicable | Not applicable | Bankily / Masrivi / Sedad — unique differentiator for Mauritania |
| Language / RTL | Multi-language, limited RTL | English + some i18n | Multi-language | FR + AR (RTL) — strong differentiator in Mauritanian market |

---

## Sources

- Existing codebase analysis: `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/Entity/` (HIGH confidence — direct code)
- Existing frontend: `/Users/abdellahi/Documents/POS/Pointe_de_Vente/front/src/` (HIGH confidence — direct code)
- PRD: `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/prd.md` (HIGH confidence — project document)
- POS industry standards (Z-Report structure, RBAC patterns, PMP formula): Training data on Square, Toast, Lightspeed, Loyverse documentation — MEDIUM confidence (not verified via live fetch due to tool restriction)
- PMP formula: Standard accounting principle (weighted average cost method) — HIGH confidence, mathematically fixed
- Mauritanian payment methods (Bankily, Masrivi, Sedad): Training data — MEDIUM confidence (names and issuers correct as of early 2025; verify current market status)

---

*Feature research for: VelociPOS — Professional POS for Mauritanian businesses*
*Researched: 2026-02-17*
