# Architecture Research

**Domain:** Point of Sale — RBAC, PMP/CMAP cost tracking, Z-Reports, Stock Alerts
**Researched:** 2026-02-17
**Confidence:** HIGH (based on direct codebase inspection + official Symfony 5.4 docs)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     React 18 Frontend (Vite)                      │
│                                                                    │
│  ┌───────────────────┐   ┌───────────────────────────────────┐   │
│  │  app-frontend/    │   │         app-admin/                │   │
│  │  (POS terminal)   │   │   (dashboard + reports + users)   │   │
│  └────────┬──────────┘   └──────────────┬────────────────────┘   │
│           │                             │                          │
│  ┌────────▼─────────────────────────────▼────────────────────┐   │
│  │  State Layer                                               │   │
│  │  Redux/Saga (auth)  |  Jotai (POS cart)  |  TanStack Query│   │
│  └──────────────────────────────┬─────────────────────────────┘   │
│                                 │  JWT in header                   │
└─────────────────────────────────┼────────────────────────────────┘
                                  │ HTTP/REST
┌─────────────────────────────────▼────────────────────────────────┐
│                  Symfony 5.4 Backend (PHP-FPM + Nginx)            │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Controllers  (/api/admin/*)                              │   │
│  │  OrderController | UserController | ReportController      │   │
│  │  ProductController | StockController (new)                │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                            │ denyAccessUnlessGranted()             │
│  ┌─────────────────────────▼──────────────────────────────────┐  │
│  │  Security Layer                                            │   │
│  │  JWT Firewall  |  Voters (new)  |  access_control yaml    │   │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                             │                                      │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │  CQRS Core  (src/Core/{Domain}/Command|Query)              │   │
│  │  CommandHandlers (extend EntityManager)                    │   │
│  │  QueryHandlers   (extend EntityRepository)                 │   │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │  EventSubscribers                                          │   │
│  │  PurchaseEvent (stock update + PMP calculation)            │   │
│  └───────────────────────────┬────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │  Doctrine ORM  +  MariaDB 10.6                             │   │
│  │  User | Product | ProductStore | Purchase | Order          │   │
│  │  PurchaseItem | OrderProduct | Closing                     │   │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Controllers (`/api/admin/*`) | HTTP entry point, deserialize request, call handler, serialize response | `AbstractController` + `ApiResponseFactory` |
| Voters (`src/Security/Voter/`) | Fine-grained permission logic per operation | `Voter::voteOnAttribute()` with `User::getRoles()` |
| CQRS Handlers (`src/Core/`) | Business logic, one handler per use case | `CommandHandler extends EntityManager` |
| EventSubscribers (`src/EventSubscriber/`) | Cross-cutting side effects (stock, PMP) | `PurchaseEvent::onPurchase()` |
| Entities (`src/Entity/`) | Data model with Doctrine ORM mappings | Annotated PHP classes |
| Repositories (`src/Repository/`) | Custom query logic for reads | `ServiceEntityRepository` |
| ReportController | Aggregate queries without CQRS (analytics, not business logic) | Raw DQL `QueryBuilder` in controller |

---

## Recommended Project Structure

New files fit into the existing tree — no new top-level directories needed.

```
back/src/
├── Core/
│   ├── Order/Command|Query/       # existing — no change
│   ├── Product/Command|Query/     # existing — no change
│   ├── Closing/                   # existing — used for Z-Report source data
│   └── Report/
│       └── Query/
│           ├── ZReportQuery/       # NEW: Z-Report CQRS query handler
│           └── StockAlertQuery/    # NEW: stock-below-reorder-level query
│
├── Security/
│   └── Voter/
│       ├── OrderVoter.php          # NEW: can_create_order, can_delete_order, can_refund
│       ├── PurchaseVoter.php       # NEW: can_create_purchase, can_update_price
│       ├── ReportVoter.php         # NEW: can_view_reports, can_view_profit
│       └── UserManagementVoter.php # NEW: can_manage_users
│
├── Controller/
│   └── Api/Admin/
│       ├── ReportController.php    # existing — extend with /z-report endpoint
│       ├── StockController.php     # NEW: /stock/alerts endpoint
│       └── UserController.php      # existing — add role assignment endpoint
│
├── EventSubscriber/
│   └── Purchase/
│       └── PurchaseEvent.php       # existing — PMP already implemented, verify
│
├── Entity/
│   ├── ProductStore.php            # existing — has reOrderLevel field already
│   └── ZReport.php                 # NEW: store snapshot of day-end data
│
└── Repository/
    └── ProductStoreRepository.php  # extend with findBelowReorderLevel()
```

```
front/src/
├── app-admin/
│   └── containers/
│       └── reports/
│           ├── daily-report.tsx    # existing
│           ├── profit-report.tsx   # existing
│           ├── sales-report.tsx    # existing
│           └── z-report.tsx        # NEW: Z-Report UI
│
├── app-frontend/
│   └── components/
│       ├── stock/
│       │   └── stock.alerts.tsx    # NEW: alert banner/badge for POS
│       └── settings/
│           └── users/
│               └── create.user.tsx # existing — add role assignment UI
│
├── duck/
│   └── auth/
│       └── authorized.user.ts      # extend: add roles[] field from JWT
│
└── api/
    ├── model/
    │   └── stock.alert.ts          # NEW: type for low-stock response
    └── routing/
        └── routes/
            └── backend.app.ts      # extend: add stock alert + z-report routes
```

### Structure Rationale

- **`src/Security/Voter/`:** Symfony autowires classes tagged `security.voter` automatically. One voter per domain concept (Order, Purchase, Report) keeps files small and testable.
- **`src/Core/Report/Query/`:** Z-Report and StockAlert are read-only analytics — they belong in CQRS Query handlers, not Commands. This matches the existing pattern used by `GetOrdersListQueryHandler`.
- **`ReportController`:** Keep aggregate reporting queries in the controller (DQL `QueryBuilder` directly) as already done. This is correct for analytics where CQRS adds overhead without benefit. Z-Report is the exception — it persists a snapshot, so it needs a Command+Query pair.
- **`StockController` (new):** Separate from `ProductController` because stock alerts are a read-only cross-store query, not a product CRUD operation.

---

## Architectural Patterns

### Pattern 1: Symfony Voters for RBAC

**What:** Each domain area (Order, Purchase, Report) gets its own Voter class. The Voter checks `User::getRoles()` against a string attribute like `'can_delete_order'`. Controllers call `$this->denyAccessUnlessGranted('can_delete_order')`.

**When to use:** Any operation that requires granular permission beyond "authenticated user." In VelociPOS: deleting orders, viewing profit reports, creating purchases, managing users.

**Trade-offs:** More files, but fully decoupled from controllers. Testable in isolation. No regex route patterns in YAML that silently stop matching.

**Do NOT add `access_control` entries for new operations.** The existing `security.yaml` entry `^/api/admin` already requires `ROLE_ADMIN` or `ROLE_USER`. Voters add granularity on top of that — they do not replace it.

```php
// src/Security/Voter/ReportVoter.php
namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class ReportVoter extends Voter
{
    public const VIEW_REPORTS   = 'can_view_reports';
    public const VIEW_PROFIT    = 'can_view_profit';

    protected function supports(string $attribute, $subject): bool
    {
        return in_array($attribute, [self::VIEW_REPORTS, self::VIEW_PROFIT], true);
    }

    protected function voteOnAttribute(string $attribute, $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return match ($attribute) {
            self::VIEW_REPORTS => $user->hasRole('ROLE_MANAGER') || $user->hasRole('ROLE_ADMIN'),
            self::VIEW_PROFIT  => $user->hasRole('ROLE_ADMIN'),
            default            => false,
        };
    }
}

// Usage in controller:
// $this->denyAccessUnlessGranted(ReportVoter::VIEW_PROFIT);
```

**Role Hierarchy (security.yaml):**
```yaml
security:
    role_hierarchy:
        ROLE_CASHIER:  [ROLE_USER]
        ROLE_MANAGER:  [ROLE_CASHIER]
        ROLE_ADMIN:    [ROLE_MANAGER]
```
This means ROLE_ADMIN inherits ROLE_MANAGER and ROLE_CASHIER automatically. Define only the roles you need: `ROLE_CASHIER`, `ROLE_MANAGER`, `ROLE_ADMIN`.

**Frontend RBAC:** Decode the JWT on login and store `roles[]` in Redux auth state. Use a `useHasRole(role)` hook to conditionally render UI elements (hide "Profit Report" tab for cashiers). This is UI-only gating — never trust the frontend for security. Backend Voters enforce the real boundary.

---

### Pattern 2: PMP Calculation in PurchaseEvent

**What:** Weighted average cost (`Prix Moyen Pondéré`) is already implemented in `PurchaseEvent::onPurchase()`. The formula `(currentStock * currentCost + incomingQty * incomingPrice) / (currentStock + incomingQty)` is correct and stored on `Product::cost`.

**Current state (from code inspection):** The PMP logic is complete and handles the zero-stock edge case. The `updatePrice` flag on `Purchase` controls whether PMP recalculates.

**What is missing:** The PMP calculation only fires when a `Purchase` is processed through `PurchaseEvent::onPurchase()`. There is no guard preventing direct API Platform calls to `PATCH /api/purchases/{id}` from bypassing the event. Since API Platform 2.7 uses its own persistence pipeline, verify that `PurchaseEvent` is wired as a Doctrine `postPersist` listener or an API Platform `WriteListener` — not just a plain service.

**Recommendation:** Wrap `PurchaseEvent` as a Doctrine event listener on `postPersist` for `Purchase`, so it fires regardless of how the entity is persisted. This closes the bypass gap.

```php
// services.yaml
App\EventSubscriber\Purchase\PurchaseEvent:
    tags:
        - { name: doctrine.event_listener, event: postPersist, entity: App\Entity\Purchase }
```

**When to use this pattern:** Any side effect that must be atomic with a persist operation. PMP recalculation, stock decrement on sale (already done in `CreateOrderCommandHandler`), and stock increment on purchase all follow this rule.

---

### Pattern 3: Z-Report as Persisted Snapshot

**What:** A Z-Report is a day-end closure report. It must be immutable after generation — a point-in-time snapshot, not a live query. Implement as two operations:

1. `POST /api/admin/report/z-report` — triggers `CreateZReportCommand`, which runs the same DQL aggregates as the existing `/daily` endpoint, then persists the result to a `ZReport` entity.
2. `GET /api/admin/report/z-report` — queries the `ZReport` table with date filters.

**Why persist it:** MariaDB `ORDER` and `ORDER_PRODUCT` rows can be deleted or modified after the fact. Persisting the Z-Report ensures the historical record is immutable.

**Entity:**
```php
// Minimal ZReport entity — stores the aggregated JSON snapshot
class ZReport {
    private \DateTimeInterface $date;
    private Store $store;
    private User $closedBy;
    private float $grossRevenue;
    private float $netRevenue;
    private float $totalCost;
    private float $grossProfit;
    private int $totalOrders;
    private array $paymentBreakdown; // JSON column
    private array $topProducts;      // JSON column
    private \DateTimeInterface $closedAt;
}
```

**CQRS placement:** `CreateZReportCommand` → `CreateZReportCommandHandler extends EntityManager`. `GetZReportListQuery` → `GetZReportListQueryHandler extends EntityRepository`. Both live in `src/Core/Report/`.

---

### Pattern 4: Stock Alerts as a Polling Endpoint

**What:** A dedicated `GET /api/admin/stock/alerts` endpoint returns products where `ProductStore::quantity <= ProductStore::reOrderLevel`. The frontend polls this on a configurable interval (e.g., every 60 seconds) using TanStack Query's `refetchInterval`.

**Why polling, not SSE or WebSocket:** The existing architecture has no real-time infrastructure. Adding SSE/WebSocket would require a Mercure hub or similar, adding significant operational complexity. Stock levels change infrequently (on purchase or sale). Polling every 60 seconds is adequate for a Mauritanian SME POS.

**Backend implementation:**
```php
// src/Repository/ProductStoreRepository.php
public function findBelowReorderLevel(?int $storeId = null): array
{
    $qb = $this->createQueryBuilder('ps')
        ->join('ps.product', 'p')
        ->join('ps.store', 's')
        ->where('ps.reOrderLevel IS NOT NULL')
        ->andWhere('ps.quantity <= ps.reOrderLevel')
        ->andWhere('p.isActive = true');

    if ($storeId) {
        $qb->andWhere('ps.store = :store')->setParameter('store', $storeId);
    }

    return $qb->getQuery()->getResult();
}
```

```php
// src/Controller/Api/Admin/StockController.php
#[Route('/admin/stock/alerts', name: 'admin_stock_alerts', methods: ['GET'])]
public function alerts(Request $request, ProductStoreRepository $repo, ApiResponseFactory $factory): Response
{
    $this->denyAccessUnlessGranted('can_view_stock_alerts');
    $storeId = $request->query->get('store');
    $alerts = $repo->findBelowReorderLevel($storeId ? (int) $storeId : null);
    return $factory->json(StockAlertResponseDto::createFromProductStores($alerts));
}
```

**Frontend implementation — TanStack Query polling:**
```typescript
// stock.alerts.tsx
const { data: alerts } = useQuery(
  ['stock-alerts', store],
  () => jsonRequest(stockAlertsUrl).then(r => r.json()),
  { refetchInterval: 60_000, refetchOnWindowFocus: false }
);
```

**RBAC gate:** Controlled by `StockVoter::VIEW_STOCK_ALERTS`. Cashiers can see alerts (they need to know what's low); managers can see the full reorder list.

---

### Pattern 5: Report Endpoint Structure

**What:** ReportController already uses raw DQL `QueryBuilder` for analytics. This is correct — do not migrate to CQRS for pure read-aggregate queries. Extend with:

| Endpoint | Method | Returns | Notes |
|---|---|---|---|
| `GET /api/admin/report/sales` | existing | order counts, revenue | extend with store-scoping |
| `GET /api/admin/report/profit` | existing | profit by product | depends on `Product::cost` (PMP) |
| `GET /api/admin/report/daily` | existing | day summary | used as Z-Report source data |
| `POST /api/admin/report/z-report` | NEW | created ZReport | persists snapshot |
| `GET /api/admin/report/z-report` | NEW | list of ZReports | paginated |
| `GET /api/admin/stock/alerts` | NEW | products below reorder | in StockController |

**RBAC on reports:**
- `sales`, `daily` — `ROLE_MANAGER` and above
- `profit` — `ROLE_ADMIN` only (margin visibility is sensitive)
- `z-report` GET — `ROLE_MANAGER` and above
- `z-report` POST — `ROLE_MANAGER` and above (closing the day is a manager action)
- `stock/alerts` — all authenticated users (`ROLE_CASHIER` and above)

---

## Data Flow

### Request Flow — CQRS Operations

```
[React component]
    ↓ fetch() via useApi hook or jsonRequest()
[JWT in Authorization header]
    ↓
[Symfony JWT Firewall] — validates token, loads User from DB
    ↓
[Controller::action()]
    → denyAccessUnlessGranted('attribute') → [Voter::voteOnAttribute()]
    → RequestDto::createFromRequest($request)
    → RequestDto::populateCommand($command)
    → $handler->handle($command)
        → [CommandHandler extends EntityManager]
            → business logic, persist(), flush()
            → returns CommandResult
    → ResponseDto::createFromResult($result)
    → ApiResponseFactory::json($responseDto)
```

### Request Flow — Report Analytics

```
[React admin dashboard component]
    ↓ useQuery() with date/store filters via useApi hook
[ReportController::sales/profit/daily()]
    → denyAccessUnlessGranted(ReportVoter::VIEW_REPORTS)
    → QueryBuilder with date range + store filter
    → getSingleResult() / getResult()
    → ApiResponseFactory::json([aggregated array])
```

### Purchase Flow with PMP

```
[Frontend: create.purchase.tsx POST /api/purchases]
    ↓
[API Platform WriteListener or Doctrine postPersist]
    ↓
[PurchaseEvent::onPurchase(Purchase)]
    ↓
    if updatePrice = true:
        for each PurchaseItem:
            currentStock = ProductStore::quantity (for this store)
            currentCost  = Product::cost
            incomingQty  = PurchaseItem::quantity
            incomingPrice = PurchaseItem::purchasePrice
            newCost = (currentStock * currentCost + incomingQty * incomingPrice)
                      / (currentStock + incomingQty)
            Product::cost = newCost   (PMP updated)
    if updateStocks = true:
        for each PurchaseItem:
            ProductStore::quantity += PurchaseItem::quantity
    flush()
```

### Stock Alert Flow

```
[POS frontend: polling every 60s]
    ↓
GET /api/admin/stock/alerts?store={id}
    ↓
[StockController::alerts()]
    → denyAccessUnlessGranted('can_view_stock_alerts')
    → ProductStoreRepository::findBelowReorderLevel(storeId)
    → returns [{product, currentQty, reOrderLevel, store}]
    ↓
[Frontend: displays badge count + alert list]
    ↓
[POS cashier sees alert, flags for manager]
```

### State Management

```
Redux store (auth, app, terminal, store selection)
    ↓ subscribe
[Auth duck] ← JWT login → [auth.saga.ts] → [/api/auth/login_check]
    stores: { isLoggedIn, userAccount: { roles[], stores[] } }

Jotai atoms (POS cart state — persisted to localStorage)
    defaultState atom: cart items, selected product, quantities

TanStack Query (server cache — products, orders, reports, stock alerts)
    useApi hook wraps useQuery with filter/sort/pagination state
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–500 users | Current monolith is correct. No changes needed. Docker Compose is sufficient. |
| 500–5k users | Add Redis for JWT token revocation list. Add database read replica for report queries. |
| 5k+ users | Extract ReportController aggregates to a separate read DB. Consider Mercure for real-time stock alerts. |

### Scaling Priorities

1. **First bottleneck:** Report `QueryBuilder` aggregates on large ORDER tables. Fix: add database indexes on `(createdAt, store_id, is_deleted)` composite. Already partially addressed by MariaDB's B-tree indexes on foreign keys.
2. **Second bottleneck:** Stock alert polling from many terminals simultaneously. Fix: cache the result in Redis with a 30-second TTL. One DB query per 30 seconds regardless of terminal count.

---

## Anti-Patterns

### Anti-Pattern 1: Putting RBAC Logic in access_control YAML

**What people do:** Add new `{ path: ^/api/admin/report/profit, roles: ROLE_ADMIN }` entries to `security.yaml` for every new sensitive endpoint.

**Why it's wrong:** Route patterns are fragile (regex order matters, the first match wins), route names change, and the logic is invisible to code review. Silent mismatches cause security holes or 403s that are hard to debug.

**Do this instead:** Use Voters. `denyAccessUnlessGranted(ReportVoter::VIEW_PROFIT)` in the controller. The permission logic is in PHP, next to the code that uses it, and is testable.

---

### Anti-Pattern 2: CQRS for Report Aggregate Queries

**What people do:** Create `GetSalesReportQuery` → `GetSalesReportQueryHandler` with a complex DQL query inside.

**Why it's wrong:** CQRS handlers in this codebase extend `EntityRepository` and are designed for entity-level reads (get user by ID, list orders). Aggregation queries (SUM, GROUP BY, date ranges) do not map cleanly to entity repositories. The existing `ReportController` correctly uses `QueryBuilder` directly — this is the right pattern for analytics.

**Do this instead:** Keep aggregate report queries in the controller. Only use CQRS Command/Query handlers for operations that create, update, or delete entities, or for entity-level reads. The exception is Z-Report, which also persists data — that's a Command.

---

### Anti-Pattern 3: Recalculating PMP at Report Time

**What people do:** Compute weighted average cost by joining `PurchaseItem` tables at query time inside `ReportController::profit()`.

**Why it's wrong:** Already avoided in the codebase. The existing code correctly reads `Product::cost` (the stored PMP), which `PurchaseEvent` keeps up to date. Recomputing at report time is expensive and produces inconsistent results if purchases were modified after the fact.

**Do this instead:** Trust `Product::cost` as the source of truth for cost price. The PMP is maintained by `PurchaseEvent`. The profit report reads it directly — this is already correct.

---

### Anti-Pattern 4: Storing User Roles Only in JWT

**What people do:** Embed roles in the JWT payload and never check the database on each request.

**Why it's wrong:** LexikJWT is stateless — the JWT is valid until expiry. If you update a user's role in the database, the old JWT still carries the old roles. A demoted user continues to have manager-level access until their token expires.

**Do this instead:** Load the `User` entity from the database on each authenticated request (LexikJWT does this via the `user_provider`). The Voter reads `$user->getRoles()` from the freshly loaded entity, not from the JWT payload. This is how the existing setup works — preserve it.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MariaDB 10.6 | Doctrine ORM (existing) | No change needed |
| LexikJWT | Symfony security firewall (existing) | Add `role_hierarchy` to security.yaml |
| API Platform 2.7 | Used for Product, User, Purchase entities | Voters should also protect API Platform operations via `security` attribute on `@ApiResource` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Controller → CQRS Handler | Direct method call via interface (`handle()`) | Handlers injected via constructor DI |
| Controller → Voter | `denyAccessUnlessGranted()` / `isGranted()` | Symfony Security component routes to correct voter |
| CQRS Handler → EventSubscriber | Doctrine lifecycle event (`postPersist`) | PurchaseEvent fires after Purchase is persisted |
| Frontend auth → Backend roles | JWT decoded in Redux saga, `roles[]` stored in auth state | Frontend uses roles for UI gating only; backend Voters enforce real security |
| TanStack Query → Stock Alert Endpoint | HTTP polling every 60s | No WebSocket needed at current scale |
| Jotai cart → Order creation | Cart state serialized to `CreateOrderRequestDto` on checkout | `CreateOrderCommandHandler` handles stock decrement inline |

---

## Build Order Implications

The following dependency chain must drive phase ordering:

```
1. RBAC / Voters
        ↓ (required before any restricted endpoint is added)
2. Role Hierarchy in security.yaml + User entity role assignment
        ↓ (required for Voters to check meaningful roles)
3. Stock Alert endpoint (StockController + repository query)
        ↓ (no dependencies on reports)
4. PMP verification / Doctrine event listener wiring
        ↓ (PurchaseEvent already written; wire correctly)
5. Z-Report entity + Command + Controller endpoint
        ↓ (requires Closing entity + Order data to be stable)
6. Enhanced Report endpoints (sales, profit with store-scope)
        ↓ (requires RBAC in place)
7. Frontend: role-gated UI (hide tabs, disable buttons)
        ↓ (requires RBAC endpoints + JWT roles decoded)
8. Frontend: stock alert banner in POS
        ↓ (requires StockController endpoint)
9. Frontend: Z-Report UI + admin report redesign
        ↓ (requires all backend report endpoints)
```

**Critical dependency:** RBAC must be built first. Every new endpoint added in subsequent phases needs `denyAccessUnlessGranted()` calls. Adding them retroactively is error-prone.

**Safe to parallelize:** Steps 3 (stock alert) and 4 (PMP wiring) are independent of each other.

---

## Sources

- Symfony 5.4 Voters official documentation: https://symfony.com/doc/5.4/security/voters.html — HIGH confidence (official docs, version-specific)
- Codebase inspection of `back/src/EventSubscriber/Purchase/PurchaseEvent.php` — HIGH confidence (direct source)
- Codebase inspection of `back/src/Core/Order/Command/CreateOrderCommand/CreateOrderCommandHandler.php` — HIGH confidence (direct source)
- Codebase inspection of `back/src/Controller/Api/Admin/ReportController.php` — HIGH confidence (direct source)
- Codebase inspection of `back/config/packages/security.yaml` — HIGH confidence (direct source)
- Codebase inspection of `back/src/Entity/ProductStore.php` (`reOrderLevel` field exists) — HIGH confidence (direct source)
- Codebase inspection of `front/src/api/hooks/use.api.ts` (TanStack Query wrapper) — HIGH confidence (direct source)
- Codebase inspection of `back/composer.json` (Symfony 5.4.*, API Platform 2.7) — HIGH confidence (direct source)

---

*Architecture research for: VelociPOS — RBAC + PMP + Z-Reports + Stock Alerts on Symfony 5.4 CQRS + React 18*
*Researched: 2026-02-17*
