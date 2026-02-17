# Phase 3: PMP and Purchase Flow — Research

**Researched:** 2026-02-17
**Domain:** Symfony 5.4 Doctrine event listeners, weighted-average cost (PMP), React admin UI
**Confidence:** HIGH — based entirely on direct codebase inspection

---

## Summary

The most important finding of this research is that **most of Phase 3 is already implemented**. The PMP weighted-average formula exists in `PurchaseEvent.php`, `OrderProduct.costAtSale` was added and backfilled in Phase 2, `CreateOrderCommandHandler` snapshots cost at sale time, and `ReportController` uses `op.costAtSale` for all profit queries. The `Product.cost` field is already `decimal(20,2)`.

The remaining work is narrow: (1) verify the PMP formula is correct and that the wiring via `ApiPlatformSubscriber` is sound; (2) relabel "Purchase Price" in the product detail modal to explicitly say "PMP" so PMP-04 is clearly satisfied; (3) resolve the `decimal(10,4)` vs `decimal(20,2)` discrepancy in PMP-02.

**Primary recommendation:** Do not rewire PMP recalculation as a Doctrine postPersist listener — the current `ApiPlatformSubscriber` POST_WRITE approach is already correct for this API Platform 2.x application. Focus on verification, the frontend label, and closing any precision gap.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Status | Research Support |
|----|-------------|--------|-----------------|
| PMP-01 | Le PMP se recalcule automatiquement à chaque achat validé selon la formule : (ancien_stock × ancien_PMP + qté_achetée × prix_achat) / stock_total | ALREADY IMPLEMENTED — but needs verification | Formula in `PurchaseEvent.php`, wired via `ApiPlatformSubscriber` POST_WRITE |
| PMP-02 | Le champ Product.cost est migré de type string vers decimal(10,4) | PARTIALLY DONE — cost is decimal(20,2), not decimal(10,4) | Column confirmed as `@ORM\Column(type="decimal", precision=20, scale=2)` — decision needed: accept (20,2) or migrate to (10,4) |
| PMP-03 | OrderProduct stocke le costAtSale (coût au moment de la vente) pour des rapports historiques fiables | DONE in Phase 2 | `OrderProduct.costAtSale` is `decimal(20,2)`, snapshotted in `CreateOrderCommandHandler` line 98 |
| PMP-04 | Le PMP est visible dans la fiche produit (admin) | PARTIAL — cost is displayed, but labelled "Purchase Price" not "PMP" | `item.tsx` line 75-77: renders `product.cost` with label "Purchase Price" |
| PMP-05 | Les rapports de bénéfice utilisent costAtSale et non le coût actuel du produit | DONE in Phase 2 | `ReportController.php` profit, daily, and all queries use `COALESCE(op.costAtSale, 0)` |
</phase_requirements>

---

## What Actually Exists in the Codebase

### Backend: PMP Calculation (PMP-01)

**File:** `/back/src/EventSubscriber/Purchase/PurchaseEvent.php`

The formula is implemented at lines 26–53:

```php
// PMP = (currentStock * currentCost + incomingQty * incomingPrice) / (currentStock + incomingQty)
if ($currentStock <= 0 || $currentCost <= 0) {
    $newCost = $incomingPrice;
} else {
    $totalValue = ($currentStock * $currentCost) + ($incomingQty * $incomingPrice);
    $totalQty   = $currentStock + $incomingQty;
    $newCost    = $totalQty > 0 ? round($totalValue / $totalQty, 4) : $currentCost;
}
$product->setCost((string) $newCost);
```

**Stock source:** Per-store stock from `product.stores` collection, filtered by `$purchase->getStore()->getId()`.

**Wiring:** `ApiPlatformSubscriber` (file: `/back/src/EventSubscriber/ApiPlatformSubscriber.php`) listens on `KernelEvents::VIEW` at `EventPriorities::POST_WRITE`. When the API Platform writes a `Purchase` entity, it calls `PurchaseEvent::onPurchase()`.

**Gate condition:** The PMP recalculation only runs when `$purchase->getUpdatePrice() === true`. This flag is controlled by the "Update stock prices?" toggle in the purchase creation form. This is intentional and correct — a user may receive goods without wanting to update the cost (e.g., a partial delivery at a different price).

**Precision note:** The formula stores `round($totalValue / $totalQty, 4)` — 4 decimal places — then casts to string. The column is `decimal(20,2)` which stores only 2 decimal places, meaning the 4-decimal intermediate result is truncated by MariaDB on INSERT/UPDATE.

### Backend: Product.cost Field (PMP-02)

**File:** `/back/src/Entity/Product.php` lines 91–96:

```php
/**
 * @ORM\Column(type="decimal", precision=20, scale=2, nullable=true)
 * @Gedmo\Versioned()
 * @Groups({"product.read", "order.read", ...})
 */
private $cost;
```

- Type: `decimal` (not `string`) — already migrated
- Precision: 20, Scale: 2 — NOT the `decimal(10,4)` the requirement specifies
- `@Gedmo\Versioned()` is already present — audit trail on cost changes is already configured
- `@Gedmo\Loggable()` is on the Product class itself (line 26)

**Gedmo Loggable setup:** The `loggable` mapping is in `doctrine.yaml`:
```yaml
loggable:
  type: annotation
  alias: Gedmo
  prefix: Gedmo\Loggable\Entity
  dir: "%kernel.project_dir%/vendor/gedmo/doctrine-extensions/src/Loggable/Entity"
```
However, `loggable` is NOT in `stof_doctrine_extensions.yaml` — only `softdeleteable` and `timestampable` are enabled. This means **Gedmo audit trail for cost changes is not currently active** even though the annotations exist.

### Backend: costAtSale Snapshot (PMP-03)

**File:** `/back/src/Core/Order/Command/CreateOrderCommand/CreateOrderCommandHandler.php` line 98:

```php
$orderProduct->setCostAtSale($product->getCost());
```

This snapshots the current PMP at order creation time.

**File:** `/back/src/Entity/OrderProduct.php` lines 95–98:

```php
/**
 * @ORM\Column(type="decimal", precision=20, scale=2, nullable=true)
 */
private $costAtSale;
```

Added in Phase 2 migration `Version20260217224033.php` and backfilled from `product.cost`.

### Backend: Profit Reports (PMP-05)

**File:** `/back/src/Controller/Api/Admin/ReportController.php`

All three report endpoints (`/admin/report/sales`, `/admin/report/profit`, `/admin/report/daily`) use:
```php
'COALESCE(SUM(COALESCE(op.costAtSale, 0) * op.quantity), 0) as totalCost'
```

PMP-05 is fully satisfied.

### Frontend: Product Detail Page (PMP-04)

**File:** `/front/src/app-frontend/components/settings/items/item.tsx` lines 75–77:

```tsx
<tr>
  <th className="text-right w-[200px]">{t("Purchase Price")}</th>
  <td>{withCurrency(product.cost)} / {product.purchaseUnit}</td>
</tr>
```

The `product.cost` value IS displayed in the product detail modal under the "Item Information" tab. The model interface in `/front/src/api/model/product.ts` includes `cost?: number`.

**Gap:** The label says "Purchase Price" but since `cost` IS the PMP (weighted average), the label should say "PMP" or "Weighted Average Cost (PMP)" to satisfy PMP-04 as stated. This is a one-line label change.

---

## Standard Stack (What Already Exists)

### Backend
| Component | Version/Detail | Purpose |
|-----------|---------------|---------|
| Symfony | 5.4 | Framework |
| API Platform | 2.x (Core annotations) | REST API |
| Doctrine ORM | Annotation-based | Entity/DB mapping |
| Gedmo DoctrineExtensions | Loggable + Versioned | Audit trail on entity fields |
| StofDoctrineExtensionsBundle | Configured in `packages/stof_doctrine_extensions.yaml` | Bridges Gedmo to Symfony |
| MariaDB | Via Docker `dev-mariadb-polymer` | Database |

### Frontend
| Component | Version/Detail | Purpose |
|-----------|---------------|---------|
| React | 18 | UI framework |
| TypeScript | Yes | Type safety |
| Vite | Build tool | |
| TailwindCSS | Utility CSS | Styling |
| react-hook-form | Form management | |
| i18next | Internationalization | `t("Purchase Price")` calls |
| `@tanstack/react-table` | Table components | Item detail tabs |

---

## Architecture Patterns (Established in Project)

### Pattern 1: API Platform POST_WRITE Subscriber (Current PMP Wiring)

```php
// ApiPlatformSubscriber.php
public static function getSubscribedEvents(): array
{
    return [
        KernelEvents::VIEW => [
            ['onPostWrite', EventPriorities::POST_WRITE]
        ]
    ];
}

public function onPostWrite(ViewEvent $event): void
{
    $result = $event->getControllerResult();
    if ($result instanceof Purchase) {
        $purchaseEvent = new PurchaseEvent();
        $purchaseEvent->entityManager = $this->entityManager;
        $purchaseEvent->onPurchase($result);
    }
}
```

This is correct for API Platform 2.x. The POST_WRITE event fires after the entity is persisted. The plan mentioned "Doctrine postPersist listener" but the existing approach is equivalent and already working.

### Pattern 2: Gedmo Loggable + Versioned for Audit Trail

The `Product` entity already has `@Gedmo\Loggable()` class annotation and `@Gedmo\Versioned()` on all relevant fields including `cost`. The infrastructure exists but `loggable` is not enabled in `stof_doctrine_extensions.yaml`.

To activate the audit trail, add to `stof_doctrine_extensions.yaml`:
```yaml
stof_doctrine_extensions:
  orm:
    default:
      loggable: true
      softdeleteable: true
      timestampable: true
```

### Pattern 3: Doctrine Decimal Type Returns String in PHP

When Doctrine maps `type="decimal"` to PHP, the value is returned as a **string**, not a float. This is why the entity getters return `?string`:
- `Product::getCost(): ?string`
- `OrderProduct::getCostAtSale(): ?string`
- `PurchaseItem::getPurchasePrice(): ?string`

The `PurchaseEvent.php` correctly casts with `(float)` before arithmetic and `(string)` when setting back. This pattern must be preserved.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entity change history | Custom log table | Gedmo Loggable (already configured) | Built-in, integrated with Doctrine lifecycle |
| Decimal arithmetic precision | Custom precision logic | PHP's native float with round() at storage time | The existing pattern in PurchaseEvent already does this correctly |
| API event hooks | Custom middleware | API Platform POST_WRITE subscriber (already exists) | Already wired correctly |

---

## Common Pitfalls

### Pitfall 1: Decimal Precision Mismatch Between PHP and DB

**What goes wrong:** `PurchaseEvent` computes `round($totalValue / $totalQty, 4)` (4 decimal places) but stores into `decimal(20,2)` which only retains 2 decimal places. The 3rd and 4th decimal places are silently truncated by MariaDB.

**Why it happens:** PMP-02 requirement says `decimal(10,4)` but Phase 2 only migrated to `decimal(20,2)`.

**How to avoid:** Either (a) accept `decimal(20,2)` and change the `round()` call to 2 places, or (b) migrate `product.cost` and `order_product.cost_at_sale` to `decimal(10,4)` to preserve 4 decimal places.

**Impact:** For currencies with sub-unit pricing (e.g., items costing 0.0075 MRU per unit), 2 decimal places may be insufficient. For typical POS use cases in Mauritania (MRU with 1 ouguiya = 5 khoums), 2 decimal places is likely sufficient.

### Pitfall 2: Gedmo Loggable Not Activated

**What goes wrong:** `Product` has `@Gedmo\Loggable()` and `cost` has `@Gedmo\Versioned()`, but `stof_doctrine_extensions.yaml` does not enable `loggable`. The annotations are silently ignored — no audit log entries are written.

**How to avoid:** Add `loggable: true` to `stof_doctrine_extensions.yaml` if the audit trail is required.

**Warning sign:** Check `ext_log_entries` table — if it exists but is empty after cost changes, loggable is not active.

### Pitfall 3: PMP Race Condition on Concurrent Purchases

**What goes wrong:** Two simultaneous purchase requests for the same product read the same `currentStock` and `currentCost`, both compute a PMP, and the second write overwrites the first with a stale calculation.

**Why it happens:** The `PurchaseEvent` reads then writes outside a transaction lock.

**How to avoid:** For the current single-store, sequential-operation POS context, this is unlikely to be a real problem. For future scaling, consider a `SELECT ... FOR UPDATE` lock or a database-level trigger. No action required for Phase 3.

### Pitfall 4: `updatePrice` Flag Misunderstood

**What goes wrong:** A developer assumes PMP always recalculates on every purchase, but it only recalculates when `$purchase->getUpdatePrice() === true`. A purchase with `updatePrice = false` does NOT update the cost.

**This is intentional.** The frontend purchase form has an "Update stock prices?" toggle (defaultChecked: true). The planner should NOT remove this gate — it is required business logic.

### Pitfall 5: Frontend `product.cost` Is a String from API

**What goes wrong:** The API Platform serializer returns `cost` as a string (e.g., `"12.50"`) because Doctrine decimal → string. The TypeScript model defines `cost?: number` which is inaccurate.

**How to avoid:** The `withCurrency()` helper already handles string-to-number conversion. Any new code using `product.cost` arithmetically must parse it: `parseFloat(product.cost)` or `Number(product.cost)`.

---

## Code Examples

### Correct PMP Formula (Already in Codebase)

```php
// Source: /back/src/EventSubscriber/Purchase/PurchaseEvent.php
$currentCost   = (float) ($product->getCost() ?? 0);
$incomingQty   = (float) $item->getQuantity();
$incomingPrice = (float) $item->getPurchasePrice();

// Get current store stock
$currentStock = 0;
foreach ($product->getStores() as $s) {
    if ($s->getStore()->getId() === $purchase->getStore()->getId()) {
        $currentStock = (float) $s->getQuantity();
        break;
    }
}

// PMP = weighted average
if ($currentStock <= 0 || $currentCost <= 0) {
    $newCost = $incomingPrice;
} else {
    $totalValue = ($currentStock * $currentCost) + ($incomingQty * $incomingPrice);
    $totalQty   = $currentStock + $incomingQty;
    $newCost    = $totalQty > 0 ? round($totalValue / $totalQty, 4) : $currentCost;
}
$product->setCost((string) $newCost);
```

### Frontend PMP Label Change (PMP-04 gap)

```tsx
// File: /front/src/app-frontend/components/settings/items/item.tsx
// CURRENT (line 75):
<th className="text-right w-[200px]">{t("Purchase Price")}</th>

// CHANGE TO (to satisfy PMP-04 explicitly):
<th className="text-right w-[200px]">{t("PMP (Weighted Avg. Cost)")}</th>
```

### Activating Gedmo Loggable (if audit trail is required)

```yaml
# /back/config/packages/stof_doctrine_extensions.yaml
stof_doctrine_extensions:
    default_locale: en_US
    orm:
        default:
            loggable: true        # ADD THIS
            softdeleteable: true
            timestampable: true
```

---

## Open Questions

1. **PMP-02 precision: decimal(20,2) vs decimal(10,4)?**
   - What we know: Current column is `decimal(20,2)`. Formula rounds to 4 places but DB stores 2.
   - What's unclear: Does the business need 4 decimal places for cost? MRU (Mauritanian Ouguiya) typically uses 2 decimal places for the khoum subdivision.
   - Recommendation: Accept `decimal(20,2)` as sufficient. Change `round(..., 4)` to `round(..., 2)` in `PurchaseEvent.php` to be consistent. No migration needed.

2. **Is the Gedmo audit trail required for Phase 3?**
   - What we know: `@Gedmo\Loggable()` and `@Gedmo\Versioned()` annotations exist on `Product.cost` but loggable is not enabled in stof config. The phase plan mentions "Gedmo\Versioned audit trail on cost field."
   - What's unclear: Is the audit trail a hard requirement for Phase 3 or was it listed as a nice-to-have approach?
   - Recommendation: Enable `loggable: true` in stof config as a low-effort enhancement. No entity changes needed since annotations are already in place.

3. **Should PMP recalculate even when `updatePrice = false`?**
   - What we know: The business toggle controls this intentionally.
   - Recommendation: Do NOT change this behavior. The current gate is correct.

---

## State of the Art: What's Done vs What Remains

| Requirement | State | Action Needed |
|-------------|-------|--------------|
| PMP-01: Auto-recalculation formula | DONE (implemented in PurchaseEvent.php) | Verify formula is correct; optionally add test |
| PMP-01: Wiring (API Platform POST_WRITE) | DONE (ApiPlatformSubscriber) | No action |
| PMP-02: decimal type migration | DONE (already decimal) | Decide: accept (20,2) or migrate to (10,4) |
| PMP-02: Gedmo\Versioned on cost field | ANNOTATION PRESENT but loggable not enabled | Enable loggable in stof config (1 line) |
| PMP-03: costAtSale column | DONE in Phase 2 | No action |
| PMP-03: Snapshot at order creation | DONE in Phase 2 | No action |
| PMP-04: Cost visible on product detail | DONE (shows as "Purchase Price") | Relabel to "PMP" (1 line change) |
| PMP-05: Reports use costAtSale | DONE in Phase 2 | No action |

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/back/src/EventSubscriber/Purchase/PurchaseEvent.php` — PMP formula implementation
- `/back/src/EventSubscriber/ApiPlatformSubscriber.php` — Event wiring
- `/back/src/Entity/Product.php` — cost field type, Gedmo annotations
- `/back/src/Entity/OrderProduct.php` — costAtSale field
- `/back/src/Entity/PurchaseItem.php` — purchasePrice field
- `/back/src/Core/Order/Command/CreateOrderCommand/CreateOrderCommandHandler.php` — costAtSale snapshot
- `/back/src/Controller/Api/Admin/ReportController.php` — profit query uses op.costAtSale
- `/back/migrations/Version20260217224033.php` — Phase 2 migration confirming what was done
- `/back/config/packages/stof_doctrine_extensions.yaml` — loggable NOT enabled
- `/back/config/packages/doctrine.yaml` — loggable mapping IS configured
- `/front/src/app-frontend/components/settings/items/item.tsx` — product detail modal
- `/front/src/api/model/product.ts` — Product TypeScript interface
- `/front/src/app-admin/containers/reports/profit-report.tsx` — profit report frontend

---

## Metadata

**Confidence breakdown:**
- PMP calculation status: HIGH — source code inspected directly
- Gedmo loggable gap: HIGH — confirmed stof config does not enable loggable
- Frontend label gap: HIGH — label text confirmed as "Purchase Price"
- Decimal precision issue: HIGH — annotations and migration both inspected

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — stable codebase)
