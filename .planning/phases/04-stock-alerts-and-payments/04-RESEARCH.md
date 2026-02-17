# Phase 4: Stock Alerts and Payments - Research

**Researched:** 2026-02-17
**Domain:** Stock alert endpoint + payment type seeding + POS badge + admin alert page
**Confidence:** HIGH — based entirely on direct codebase inspection

---

## Summary

This phase splits into two largely independent tracks. The **stock alert track** requires a new backend endpoint, a new repository method, and two new frontend surfaces (POS badge, admin list page). The **payment track** requires schema changes to the `Payment` entity and fixture updates to an already-existing seeder.

The most important discovery: **`reOrderLevel` already exists on `ProductStore`** as a `decimal(10,2)` nullable field, seeded in migration `Version20230812145921`. No new DB column is needed for the per-store threshold. The default value of 10 when `reOrderLevel IS NULL` must be handled in the DQL query, not in PHP code.

The payment entity (`Payment`) has `name` and `type` fields. The fixture `PaymentTypes.php` already seeds Espèces, Carte Bancaire, Crédit Client, Bankily, Masrivi, and Sedad — but does **not** have a `category` attribute (`cash`/`mobile`/`credit`). PAY-02 requires adding a `category` (or rename of existing `type`) field to Payment. Currently `type` holds values like `'cash'`, `'credit card'`, `'credit'`, `'bankily'`, `'masrivi'`, `'sedad'`. This is not the three-bucket `cash/mobile/credit` attribute required for Z-Report reconciliation — those are currently raw names. A new `category` string column must be added to `Payment`.

The frontend payment type list is loaded from `localforage` cache at POS startup (via `useLoadData`). The POS badge and admin stock alert page must use `useQuery` from `@tanstack/react-query` with a `refetchInterval` of 60,000ms (60 seconds), consistent with the roadmap's "60s polling" requirement.

**Primary recommendation:** Add `category` to `Payment` entity (one migration), implement `ProductStoreRepository::findBelowReorderLevel()`, create `GET /api/admin/stock/alerts` behind `ProductVoter::VIEW`, build the POS badge as a standalone component using `useQuery`, and build the admin alert page as a new route + sidebar entry.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOCK-01 | Chaque produit a un seuil d'alerte configurable (défaut: 10) | `ProductStore.reOrderLevel` already exists as `decimal(10,2) nullable`. Default of 10 is applied in the DQL `COALESCE(ps.reOrderLevel, 10)` comparison — no new migration needed for this field. |
| STOCK-02 | Un endpoint API retourne les produits dont le stock est sous le seuil | New `StockController` at `GET /api/admin/stock/alerts`. Needs `ProductStoreRepository::findBelowReorderLevel(?int $storeId)`. Uses `denyAccessUnlessGranted(ProductVoter::VIEW)` per existing Phase 1 RBAC pattern. |
| STOCK-03 | Un badge visuel dans le POS indique le nombre de produits en alerte | New `<StockAlertBadge>` component added to `Footer` (POS). Uses `useQuery` with `refetchInterval: 60000`. Reads count from the alerts endpoint. Ant Design `Badge` component wraps an inventory icon. |
| STOCK-04 | La liste des produits en alerte est accessible dans l'admin avec filtre par magasin | New admin route `/inventory/alerts`. New page component using `useApi` hook (existing `use.api.ts`) with a store filter. Sidebar entry added under a new "Inventory" heading (visible to `ROLE_MANAGER`). |
| PAY-01 | Les types de paiement Bankily, Masrivi, Sedad, Espèces et Crédit sont pré-configurés en base | Fixture `PaymentTypes.php` already seeds all five required types plus Carte Bancaire. Bankily, Masrivi, and Sedad are present. The fixture must be updated to add a `category` value to each entry. |
| PAY-02 | Chaque type de paiement a un attribut (cash/mobile/credit) pour la ventilation dans le Rapport Z | `Payment` entity needs a new `category` string column (`cash`, `mobile`, or `credit`). A migration adds the column. The fixture sets: Espèces→`cash`, Bankily/Masrivi/Sedad→`mobile`, Crédit Client→`credit`, Carte Bancaire→`mobile` (or `cash` depending on business rule — recommend `mobile` as card). Z-Report grouping in `ReportController::daily()` and `ReportController::sales()` must group by `p.category` in addition to `p.name`. |
</phase_requirements>

---

## Codebase Findings (Confirmed by direct inspection)

### Finding 1: `reOrderLevel` already exists on ProductStore

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/Entity/ProductStore.php`

```php
/**
 * @ORM\Column(type="decimal", precision=10, scale=2, nullable=true)
 * @Groups({"product.read", "product.write"})
 */
private $reOrderLevel;
```

The column `re_order_level` was added in `Version20230812145921`. It is `nullable` — meaning `NULL` means "use the default of 10." The DQL query for alerts must use `COALESCE`:

```sql
-- DQL equivalent
WHERE ps.quantity < COALESCE(ps.reOrderLevel, 10)
AND p.manageInventory = true
```

**Confidence:** HIGH (read directly from entity file)

---

### Finding 2: Payment entity has `type` but no `category` field

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/Entity/Payment.php`

Current constants:
```php
const PAYMENT_TYPE_CASH = 'cash';
const PAYMENT_TYPE_CREDIT_CARD = 'credit card';
const PAYMENT_TYPE_POINTS = 'points';
const PAYMENT_TYPE_CREDIT = 'credit';
```

The `type` column holds raw values like `'cash'`, `'credit card'`, `'credit'`, `'bankily'`, `'masrivi'`, `'sedad'`. This is the payment method identifier. There is **no** `category` column for bucketing into `cash/mobile/credit`.

**What PAY-02 requires:** A new `category` column on `Payment`. Add constants:
```php
const CATEGORY_CASH   = 'cash';
const CATEGORY_MOBILE = 'mobile';
const CATEGORY_CREDIT = 'credit';
```

**Migration needed:** `ALTER TABLE payment ADD category VARCHAR(20) NOT NULL DEFAULT 'cash'`

**Confidence:** HIGH (read directly from entity file)

---

### Finding 3: PaymentTypes fixture — Mauritanian methods already seeded

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/DataFixtures/PaymentTypes.php`

Current seeded types:
```php
['name' => 'Espèces',       'type' => 'cash',       'changeDue' => true],
['name' => 'Carte Bancaire','type' => 'credit card', 'changeDue' => false],
['name' => 'Crédit Client', 'type' => 'credit',      'changeDue' => false],
['name' => 'Bankily',       'type' => 'bankily',     'changeDue' => false],
['name' => 'Masrivi',       'type' => 'masrivi',     'changeDue' => false],
['name' => 'Sedad',         'type' => 'sedad',       'changeDue' => false],
```

All five Mauritanian methods from PAY-01 are present. The fixture must be updated to add `'category'`:
```php
['name' => 'Espèces',       'type' => 'cash',        'category' => 'cash',   'changeDue' => true],
['name' => 'Carte Bancaire','type' => 'credit card',  'category' => 'mobile', 'changeDue' => false],
['name' => 'Crédit Client', 'type' => 'credit',       'category' => 'credit', 'changeDue' => false],
['name' => 'Bankily',       'type' => 'bankily',      'category' => 'mobile', 'changeDue' => false],
['name' => 'Masrivi',       'type' => 'masrivi',      'category' => 'mobile', 'changeDue' => false],
['name' => 'Sedad',         'type' => 'sedad',        'category' => 'mobile', 'changeDue' => false],
```

**Important:** The fixture only runs during `doctrine:fixtures:load`. Production rows need a data migration to backfill `category` based on existing `type` values.

**Confidence:** HIGH (read directly from fixture file)

---

### Finding 4: ProductStoreRepository has no custom queries

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/Repository/ProductStoreRepository.php`

The repository is empty (only base ServiceEntityRepository methods). The `findBelowReorderLevel()` method is a net-new addition. Based on the existing DQL pattern in `GetProductsListQueryHandler`:

```php
public function findBelowReorderLevel(?int $storeId = null): array
{
    $qb = $this->createQueryBuilder('ps');
    $qb->select('ps', 'p', 's')
       ->join('ps.product', 'p')
       ->join('ps.store', 's')
       ->where('ps.quantity < COALESCE(ps.reOrderLevel, 10)')
       ->andWhere('p.manageInventory = true');

    if ($storeId !== null) {
        $qb->andWhere('s.id = :store')
           ->setParameter('store', $storeId);
    }

    return $qb->getQuery()->getResult();
}
```

**Note:** `COALESCE` in DQL requires Doctrine 2.x support — confirmed available in this Symfony 5.4 / Doctrine stack.

**Confidence:** HIGH

---

### Finding 5: StockController does not exist yet

No `StockController.php` exists in `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/Controller/Api/Admin/`. The pattern for new admin controllers is established by `ProductController`, `ReportController`, etc.:

```php
/**
 * @Route("/admin/stock", name="admin_stock_")
 */
class StockController extends AbstractController
{
    /**
     * @Route("/alerts", methods={"GET"}, name="alerts")
     */
    public function alerts(Request $request, ProductStoreRepository $repo, ApiResponseFactory $responseFactory): Response
    {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);
        $storeId = $request->query->getInt('store') ?: null;
        $items = $repo->findBelowReorderLevel($storeId);
        return $responseFactory->json(['list' => $items, 'count' => count($items)]);
    }
}
```

**Confidence:** HIGH (pattern directly observed in codebase)

---

### Finding 6: RBAC gate — ProductVoter::VIEW covers ROLE_VENDEUR

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/back/src/Security/Voter/ProductVoter.php`

```php
self::VIEW => $this->security->isGranted('ROLE_VENDEUR'),
self::MANAGE => $this->security->isGranted('ROLE_MANAGER'),
```

`ROLE_VENDEUR` (cashier role) can VIEW. This means the POS badge can hit the alerts endpoint. For the admin page (STOCK-04), the requirement says "accessible dans l'admin" — the admin panel uses `ROLE_MANAGER`-gated routes, so `ProductVoter::VIEW` (which allows `ROLE_VENDEUR`) is sufficient since managers also have that role (Symfony role hierarchy assumed). A dedicated `StockVoter` could be created, but the roadmap says "RBAC gate" from Phase 1 — using `ProductVoter::VIEW` is the correct approach.

**Confidence:** HIGH

---

### Finding 7: Frontend — payment type loading via `useLoadData` (not TanStack Query)

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/front/src/api/hooks/use.load.data.ts`

Payment types are loaded from `localforage` cache at POS startup. They are NOT fetched per-request. The POS payment selection buttons in `sale.inline.tsx` iterate `paymentTypesList` passed as a prop from `PosMode` component.

The `PaymentType` TypeScript interface (`/front/src/api/model/payment.type.ts`) currently has:
```ts
interface PaymentType {
  id: string;
  name: string;
  type: string;           // current raw type value
  canHaveChangeDue?: boolean;
  stores: Store[];
  isActive: boolean;
}
```

The new `category` field from PAY-02 must be added to this interface:
```ts
  category: 'cash' | 'mobile' | 'credit';
```

The Z-Report display in the closing flow (`sale.closing.tsx`) currently groups payments by their name via the `payments` object keyed by payment name. For PAY-02 to categorize by `cash/mobile/credit`, the backend `ORDER_LIST` endpoint must be updated OR the ReportController's `daily`/`sales` endpoints must return `p.category` alongside `p.name` (already available since `OrderPayment.type` → `Payment.category`).

**Confidence:** HIGH

---

### Finding 8: Frontend uses `useApi` hook (TanStack Query) in admin, custom hooks in POS

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/front/src/api/hooks/use.api.ts`

TanStack Query (`@tanstack/react-query`) is fully configured in `index.tsx`. The `useApi` hook wraps `useQuery` and is already used in `sale.closing.tsx`. For the stock alert badge:

```tsx
// POS badge — standalone useQuery with polling
const { data } = useQuery(
  ['stock-alerts', store?.id],
  () => jsonRequest(`/api/admin/stock/alerts?store=${store?.id}`).then(r => r.json()),
  {
    refetchInterval: 60_000,
    enabled: !!store?.id,
  }
);
```

For the admin stock alert page, use the existing `useApi` hook which already handles pagination and filters.

**Confidence:** HIGH (direct inspection of hooks and index.tsx)

---

### Finding 9: POS Footer is the right injection point for the badge

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/front/src/app-frontend/components/modes/footer.tsx`

The Footer is a horizontal bar with `<Expenses>`, `<PurchaseTabs>`, `<More>`, `<SaleHistory>`, `<SaleClosing>`, `<Shortcuts>`, `<Logout>`. The stock alert badge (`<StockAlertBadge>`) should be injected before the separator, alongside the other action buttons.

**Confidence:** HIGH

---

### Finding 10: Admin sidebar pattern and nav injection point

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/front/src/app-admin/containers/layout/sidebar.tsx`

The sidebar uses Bootstrap icons (`bi bi-*`) and React Router `Link`. A new "Inventory" section visible to `ROLE_MANAGER` should follow the same pattern as the Reports section. Route: `/inventory/alerts`. Sidebar icon: `bi bi-box-seam` or `bi bi-exclamation-triangle`.

The admin app routes file (`frontend.routes.ts`) must add:
```ts
export const INVENTORY_ALERTS = staticRoute('/inventory/alerts');
```

The admin `app.tsx` must add:
```tsx
<Route path={INVENTORY_ALERTS} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><StockAlerts /></RequireRole></RequireAuth>} />
```

**Confidence:** HIGH

---

### Finding 11: Z-Report / Closing payment categorization

**File:** `/Users/abdellahi/Documents/POS/Pointe_de_Vente/front/src/app-frontend/components/sale/sale.closing.tsx`

The closing display loop at line 317:
```tsx
{Object.keys(payments).map(paymentType => (
  <tr key={paymentType}>
    <th className="text-right">{paymentType.toUpperCase()} {t("sale")}</th>
    <td>{withCurrency(payments[paymentType])}</td>
  </tr>
))}
```

Currently `payments` is keyed by payment name (from `ReportController` / `ORDER_LIST` endpoint). For PAY-02, the Z-Report should show three buckets: **Cash**, **Mobile**, **Credit**. This means:

**Option A** (recommended): The `ORDER_LIST` response returns payments grouped by `category` (not by name). Add a `paymentsByCategory` field to the response. The closing component renders this separately.

**Option B**: Keep the existing per-name display and add a summary section grouped by category. This avoids changing the existing closing logic and only adds new display.

Option B is safer for this phase — it adds the categorized view without breaking the existing detail view.

**Confidence:** HIGH

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Symfony 5.4 | 5.4.x | Backend framework | Project standard |
| API Platform 2.x | 2.x | REST resources (used for Payment entity exposure) | Project standard |
| Doctrine ORM | 2.x | Entity mapping (annotation-based) | Project standard |
| @tanstack/react-query | v4 (imported as `@tanstack/react-query`) | Data fetching with polling | Already in index.tsx |
| Ant Design 5 | 5.x | `Badge` component for POS alert count | Already imported (used in `pos.tsx` via `Tooltip`) |
| React Router 6 | 6.x | Admin routing | Already in admin app |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localforage (custom wrap) | — | POS cache layer | Only for data loaded at startup (product list, payment types) — NOT for stock alerts |
| Bootstrap Icons | — | Admin sidebar icons | All admin sidebar nav items use `bi bi-*` |
| FontAwesome | 6.x | POS action buttons | POS footer buttons use FontAwesome |
| classNames | — | Conditional CSS class joining | Used throughout both apps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useQuery polling for badge | WebSocket / SSE | Polling is simpler, sufficient for 60s latency, consistent with roadmap |
| `category` as new column | Derive from existing `type` | `type` values are product-level identifiers (bankily, masrivi) not categories — must be separate |
| New StockVoter | Reuse ProductVoter::VIEW | ProductVoter::VIEW already grants ROLE_VENDEUR access, consistent with Phase 1 voter pattern |

---

## Architecture Patterns

### Pattern 1: New Admin Controller (STOCK-02)

Follow the established pattern in `ProductController` and `ReportController`:

```php
// File: back/src/Controller/Api/Admin/StockController.php
/**
 * @Route("/admin/stock", name="admin_stock_")
 */
class StockController extends AbstractController
{
    /**
     * @Route("/alerts", methods={"GET"}, name="alerts")
     */
    public function alerts(
        Request $request,
        ProductStoreRepository $repo,
        ApiResponseFactory $responseFactory
    ): Response {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);
        $storeId = $request->query->getInt('store') ?: null;
        $items = $repo->findBelowReorderLevel($storeId);
        return $responseFactory->json([
            'list'  => $items,
            'count' => count($items),
        ]);
    }
}
```

### Pattern 2: Repository DQL query with COALESCE default

```php
// File: back/src/Repository/ProductStoreRepository.php
public function findBelowReorderLevel(?int $storeId = null): array
{
    $qb = $this->createQueryBuilder('ps')
        ->join('ps.product', 'p')
        ->join('ps.store', 's')
        ->addSelect('p', 's')
        ->andWhere('p.manageInventory = true')
        ->andWhere('ps.quantity < COALESCE(ps.reOrderLevel, 10)');

    if ($storeId !== null) {
        $qb->andWhere('s.id = :store')
           ->setParameter('store', $storeId);
    }

    return $qb->getQuery()->getResult();
}
```

**Warning:** The response from this method returns `ProductStore[]` objects. When serialized to JSON via `ApiResponseFactory::json()`, Symfony serializer needs groups. Either use `@Groups({"product.read"})` already on the entities or serialize manually. The cleanest approach: return a DTO array manually instead of relying on object serialization.

### Pattern 3: TanStack Query polling (POS badge — STOCK-03)

```tsx
// Component: front/src/app-frontend/components/stock/stock.alert.badge.tsx
import { useQuery } from '@tanstack/react-query';
import { Badge } from 'antd';
import { jsonRequest } from '../../../api/request/request';
import { useSelector } from 'react-redux';
import { getStore } from '../../../duck/store/store.selector';

export const StockAlertBadge = () => {
  const store = useSelector(getStore);

  const { data } = useQuery(
    ['stock-alerts', store?.id],
    async () => {
      const res = await jsonRequest(`/api/admin/stock/alerts?store=${store?.id}`);
      return res.json();
    },
    {
      refetchInterval: 60_000,
      enabled: !!store?.id,
      refetchOnWindowFocus: false,
    }
  );

  const count = data?.count ?? 0;

  return (
    <Badge count={count} overflowCount={99}>
      {/* inventory icon button */}
    </Badge>
  );
};
```

### Pattern 4: Admin alert page using existing `useApi` hook

```tsx
// Component: front/src/app-admin/containers/inventory/stock-alerts.tsx
import useApi from '../../../api/hooks/use.api';
import { STOCK_ALERTS } from '../../../api/routing/routes/backend.app';

export const StockAlerts = () => {
  const { data, handleFilterChange } = useApi('stock-alerts', STOCK_ALERTS);
  // ...render table with store filter
};
```

### Anti-Patterns to Avoid

- **Serializing ProductStore entities directly:** The `ApiResponseFactory::json()` wraps Symfony serializer. ProductStore has `@Groups({"product.read"})` on its fields. Pass the store filter through manually if you rely on group-based serialization, or map to a plain array DTO. Returning the raw entity collection will fail without proper serialization context.
- **Caching stock alerts in localforage:** Stock alerts must always be fresh. Do NOT cache in localforage like products/payment types.
- **Adding `category` by renaming `type`:** The `type` field is used in the POS's credit-disable logic (`pt.type === "credit"`) in `sale.inline.tsx`. Do not rename or repurpose it. Add `category` as a new field.
- **Changing the `payments` object structure in `sale.closing.tsx`:** The Z-Report closing flow reads `payments[paymentType]` keyed by name. Adding `paymentsByCategory` as a parallel structure avoids breaking the existing display.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polling with cleanup | Manual `setInterval` | `useQuery({ refetchInterval })` | TanStack Query handles cleanup, retry, window focus, and error state |
| Badge with overflow | Custom CSS counter | Ant Design `Badge` | Already imported in the POS (via antd `Tooltip` in pos.tsx) |
| Admin page table | Custom table | Use Bootstrap table classes + existing pattern from `ReportController` pages | Consistent with admin app UI |
| COALESCE fallback in PHP | `$level ?? 10` in PHP after fetch | `COALESCE(ps.reOrderLevel, 10)` in DQL | Pushes filtering to DB, not PHP loop |

---

## Common Pitfalls

### Pitfall 1: Serialization of `ProductStore` entities in controller response

**What goes wrong:** `ApiResponseFactory::json()` uses Symfony's serializer. `ProductStore` entities serialized without groups will either throw a circular reference error (Product → stores → Product) or serialize too much data.

**Why it happens:** `ProductStore` has a ManyToOne back to `Product`, which has OneToMany back to `ProductStore`.

**How to avoid:** Return a manually-constructed array DTO:
```php
$items = $repo->findBelowReorderLevel($storeId);
$data = array_map(fn(ProductStore $ps) => [
    'productId'   => $ps->getProduct()->getId(),
    'productName' => $ps->getProduct()->getName(),
    'storeId'     => $ps->getStore()->getId(),
    'storeName'   => $ps->getStore()->getName(),
    'quantity'    => (float) $ps->getQuantity(),
    'reOrderLevel'=> (float) ($ps->getReOrderLevel() ?? 10),
], $items);
return $responseFactory->json(['list' => $data, 'count' => count($data)]);
```

**Warning signs:** 500 errors on the alerts endpoint, `Circular reference detected` in Symfony logs.

### Pitfall 2: `type` field collision with `credit` check in POS

**What goes wrong:** If `category` is named `type`, it overwrites the existing `type` check in `sale.inline.tsx`:
```tsx
(pt.type === "credit" && (customer === undefined || customer === null))
```
This disables credit payment when no customer is selected.

**How to avoid:** Name the new field `category` (not `type`). Update `PaymentType` TypeScript interface to add `category`.

**Warning signs:** Credit payment button is never disabled, or always disabled.

### Pitfall 3: Data migration missing for existing Payment rows

**What goes wrong:** The fixture only runs during `doctrine:fixtures:load`. If the database has real payment data, existing `Payment` rows will have `category = 'cash'` (the column default) even for Bankily/Masrivi/Sedad entries.

**How to avoid:** The migration must include a `UPDATE` statement to backfill:
```sql
UPDATE payment SET category = 'mobile' WHERE type IN ('bankily', 'masrivi', 'sedad', 'credit card');
UPDATE payment SET category = 'credit' WHERE type = 'credit';
-- cash is already the default
```

**Warning signs:** Z-Report shows everything as "cash".

### Pitfall 4: Stock alerts endpoint returns 0 for products not managed

**What goes wrong:** Products where `manageInventory = null` (or false) would incorrectly appear in alerts if the DQL doesn't filter them.

**How to avoid:** Include `p.manageInventory = true` in the WHERE clause. Since `manageInventory` is nullable boolean, use:
```php
->andWhere('p.manageInventory = true')
```
Doctrine handles nullable boolean comparisons correctly.

### Pitfall 5: `COALESCE` in Doctrine DQL

**What goes wrong:** `COALESCE` is a standard DQL function in Doctrine 2.x but some older setups may not support it without a custom function registration.

**How to avoid:** Test `COALESCE(ps.reOrderLevel, 10)` in the DQL query. If it fails, use a PHP-level fallback (`$threshold = $ps->getReOrderLevel() ?? 10`) with a two-pass approach (fetch all, filter in PHP). However, in Symfony 5.4 + Doctrine ORM 2.x, COALESCE is natively supported.

**Confidence:** MEDIUM — standard but worth verifying with a quick test query.

---

## Code Examples

### Backend: StockController full implementation

```php
<?php
// back/src/Controller/Api/Admin/StockController.php

namespace App\Controller\Api\Admin;

use App\Entity\ProductStore;
use App\Factory\Controller\ApiResponseFactory;
use App\Repository\ProductStoreRepository;
use App\Security\Voter\ProductVoter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/stock", name="admin_stock_")
 */
class StockController extends AbstractController
{
    /**
     * @Route("/alerts", methods={"GET"}, name="alerts")
     */
    public function alerts(
        Request $request,
        ProductStoreRepository $repo,
        ApiResponseFactory $responseFactory
    ): Response {
        $this->denyAccessUnlessGranted(ProductVoter::VIEW);

        $storeId = $request->query->getInt('store') ?: null;
        $items   = $repo->findBelowReorderLevel($storeId);

        $data = array_map(static fn(ProductStore $ps) => [
            'productId'    => $ps->getProduct()->getId(),
            'productName'  => $ps->getProduct()->getName(),
            'storeId'      => $ps->getStore()->getId(),
            'storeName'    => $ps->getStore()->getName(),
            'quantity'     => (float) $ps->getQuantity(),
            'reOrderLevel' => (float) ($ps->getReOrderLevel() ?? 10),
        ], $items);

        return $responseFactory->json([
            'list'  => $data,
            'count' => count($data),
        ]);
    }
}
```

### Backend: Payment entity `category` addition

```php
// Add to Payment.php entity

const CATEGORY_CASH   = 'cash';
const CATEGORY_MOBILE = 'mobile';
const CATEGORY_CREDIT = 'credit';

/**
 * @ORM\Column(type="string", length=20, options={"default": "cash"})
 * @Gedmo\Versioned()
 * @Groups({"payment.read", "order.read", "customer.read"})
 */
private string $category = self::CATEGORY_CASH;

public function getCategory(): string { return $this->category; }
public function setCategory(string $category): self { $this->category = $category; return $this; }
```

### Backend: Migration for `category` column

```php
// Version202602XXXXXXX.php
$this->addSql("ALTER TABLE payment ADD category VARCHAR(20) NOT NULL DEFAULT 'cash'");
$this->addSql("UPDATE payment SET category = 'mobile' WHERE type IN ('bankily', 'masrivi', 'sedad', 'credit card')");
$this->addSql("UPDATE payment SET category = 'credit' WHERE type = 'credit'");
```

### Frontend: backend.app route constant additions

```ts
// front/src/api/routing/routes/backend.app.ts
export const STOCK_ALERTS = scopeUrl('/admin/stock/alerts');
export const INVENTORY_ALERTS = staticRoute('/inventory/alerts'); // in frontend.routes.ts
```

### Frontend: Updated PaymentType model

```ts
// front/src/api/model/payment.type.ts
export interface PaymentType extends HydraId, HydraType {
  id: string;
  name: string;
  type: string;               // existing: 'cash', 'bankily', 'masrivi', etc.
  category: 'cash' | 'mobile' | 'credit';  // NEW for PAY-02
  canHaveChangeDue?: boolean;
  stores: Store[];
  isActive: boolean;
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual `setInterval` polling | `useQuery({ refetchInterval })` | TanStack Query handles cleanup on unmount; no memory leaks |
| Per-page data loading | `useApi` hook (stateful filters/sort/page) | All admin pages should use this hook, not raw fetch |

---

## Open Questions

1. **Should `Carte Bancaire` be `mobile` or a fourth category?**
   - What we know: Carte Bancaire (`credit card`) is a bank card, distinct from mobile money but distinct from cash too.
   - What's unclear: The business rule for Z-Report reconciliation — does the admin consider card as mobile money or its own bucket?
   - Recommendation: Assign `mobile` (non-cash electronic payment) for now, as the fixture only has three buckets. If needed, add a `card` category in a future phase. This is a low-risk decision.

2. **Should `StockAlertBadge` be visible to all cashiers or only when count > 0?**
   - What we know: STOCK-03 says "visible to the cashier without navigating away." No explicit hide-when-zero requirement.
   - What's unclear: Whether an empty badge (0) should still render the button.
   - Recommendation: Render the button always; show badge only when count > 0 (standard `antd Badge` behavior with `count={0}` renders no badge bubble).

3. **Serialization of ProductStore in the alerts response — which groups to use?**
   - What we know: `ProductStore` fields have `@Groups({"product.read", "product.write"})`. Using serializer groups would avoid manual DTO mapping.
   - Recommendation: Use the manual DTO approach documented in Pitfall 1. It avoids circular reference risk and keeps the response shape explicit.

---

## Sources

### Primary (HIGH confidence)

- Direct inspection of `/back/src/Entity/ProductStore.php` — reOrderLevel field confirmed present
- Direct inspection of `/back/src/Entity/Payment.php` — type field + constants confirmed, no category field
- Direct inspection of `/back/src/DataFixtures/PaymentTypes.php` — all 6 payment types confirmed
- Direct inspection of `/back/src/Repository/ProductStoreRepository.php` — no custom queries present
- Direct inspection of `/back/src/Controller/Api/Admin/ProductController.php` — RBAC pattern confirmed
- Direct inspection of `/back/src/Security/Voter/ProductVoter.php` — VIEW = ROLE_VENDEUR
- Direct inspection of `/back/migrations/Version20230812145921.php` — re_order_level column in DB
- Direct inspection of `/front/src/api/hooks/use.api.ts` — TanStack Query wrapper confirmed
- Direct inspection of `/front/src/index.tsx` — QueryClientProvider confirmed
- Direct inspection of `/front/src/app-frontend/components/sale/sale.closing.tsx` — Z-Report payment display
- Direct inspection of `/front/src/app-frontend/components/modes/footer.tsx` — Footer injection point
- Direct inspection of `/front/src/app-admin/containers/layout/sidebar.tsx` — Admin nav pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from direct file inspection
- Architecture patterns: HIGH — based on existing working code
- Pitfalls: HIGH — identified from actual entity structure and code patterns
- Open questions: represent genuine gaps, not uncertainty in findings

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase; valid until next phase changes entities)
